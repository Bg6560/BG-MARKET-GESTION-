// Migration des coûts historiques vers les collections privées (copie uniquement).
// Règles absolues de cet outil :
//  - il ne modifie ni ne supprime JAMAIS un document public ni un champ financier existant ;
//  - il ne crée un document privé que s'il n'existe pas déjà (jamais d'écrasement) ;
//  - sans l'option « apply », il ne fait que lire (simulation) ;
//  - « apply » exige une sauvegarde complète préalable.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const arr = (v) => (Array.isArray(v) ? v : null);

/* ---------- Plans de copie (fonctions pures) ---------- */
export function planCommande(d) {
  const produits = arr(d.produits);
  const costs = produits ? produits.map((p) => num(p && p.cost)) : [];
  const profit = typeof d.profit === 'number' ? d.profit : (typeof d.beneficeCmd === 'number' ? d.beneficeCmd : 0);
  const cout = num(d.coutCatalogue);
  const hasCosts = cout > 0 || profit !== 0 || costs.some((c) => c > 0);
  const fournisseur = d.fournisseurId ? {
    uid: d.uid || '', ts: d.ts, fournisseurId: d.fournisseurId, fournisseurNom: d.fournisseurNom || '', fournisseurWa: d.fournisseurWa || '',
  } : null;
  return { couts: hasCosts ? { uid: d.uid || '', ts: d.ts, coutCatalogue: cout, profit, costs } : null, fournisseur };
}
export function planFacture(d) {
  const products = arr(d.products);
  const costs = products ? products.map((p) => num(p && p.cost)) : [];
  const profit = typeof d.profit === 'number' ? d.profit : null;
  const cost = num(d.cost);
  const hasCosts = cost > 0 || (profit !== null && profit !== 0) || costs.some((c) => c > 0);
  return { couts: hasCosts ? { uid: d.uid || '', ts: d.ts, cost, profit, costs } : null };
}
export function planProduit(d) {
  return { prive: num(d.prixAchat) > 0 ? { prixAchat: num(d.prixAchat) } : null };
}
/* Champs financiers encore présents dans le document public (à nettoyer plus tard, étape distincte) */
export function legacyFields(col, d) {
  const out = [];
  if (col === 'commandes') {
    for (const k of ['coutCatalogue', 'profit', 'beneficeCmd', 'fournisseurId', 'fournisseurNom', 'fournisseurWa']) if (k in d) out.push(k);
    if ((arr(d.produits) || []).some((p) => p && 'cost' in p)) out.push('produits[].cost');
  } else if (col === 'factures') {
    for (const k of ['cost', 'profit']) if (k in d) out.push(k);
    if ((arr(d.products) || []).some((p) => p && 'cost' in p)) out.push('products[].cost');
  } else if (col === 'produits') {
    if ('prixAchat' in d) out.push('prixAchat');
  }
  return out;
}

/* ---------- Sauvegarde (lecture seule) ---------- */
const plain = (v) => {
  if (v && typeof v.toDate === 'function') return { __timestamp: v.toDate().toISOString() };
  if (Array.isArray(v)) return v.map(plain);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plain(x)]));
  return v;
};

export const PUBLIC = ['commandes', 'factures', 'produits', 'clients', 'precommandes', 'sav', 'users'];
export const PRIVATE = ['commandes_couts', 'commandes_fourn', 'factures_couts', 'produits_prive'];

/* Sauvegarde complète (lecture seule) : toutes les collections de l'application, un fichier JSON par collection.
   Les jetons d'appareils (notifications) ne sont pas sauvegardés : ils se recréent à la connexion. */
export const BACKUP_ALL = [...PUBLIC, ...PRIVATE, 'fournisseurs', 'app_config', 'journal', 'mouvements_stock', 'catalogue_fournisseurs'];
export async function backupAll({ db, dir, log = () => {} }) {
  if (!dir) throw new Error('Indiquer le dossier de sauvegarde.');
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const counts = {};
  for (const c of BACKUP_ALL) {
    const snap = await db.collection(c).get();
    writeFileSync(join(dir, `${c}.json`), JSON.stringify(snap.docs.map((d) => ({ id: d.id, data: plain(d.data()) })), null, 1), { mode: 0o600 });
    counts[c] = snap.size;
    log(`sauvegardé ${c} : ${snap.size}`);
  }
  writeFileSync(join(dir, 'manifeste.json'), JSON.stringify({ date: new Date().toISOString(), collections: counts }, null, 2), { mode: 0o600 });
  return counts;
}

/* ---------- Exécution ---------- */
export async function run({ db, FieldValue, apply = false, backupDir = null, listAuthUids = null, log = () => {} }) {
  if (apply && !backupDir) throw new Error('« apply » exige une sauvegarde : indiquer le dossier de sauvegarde.');
  const data = {};
  for (const c of [...PUBLIC, ...PRIVATE]) {
    const snap = await db.collection(c).get();
    data[c] = snap.docs.map((d) => ({ id: d.id, data: d.data() }));
    log(`lu ${c} : ${data[c].length}`);
  }
  if (backupDir) {
    mkdirSync(backupDir, { recursive: true, mode: 0o700 });
    for (const c of Object.keys(data)) writeFileSync(join(backupDir, `${c}.json`), JSON.stringify(data[c].map((x) => ({ id: x.id, data: plain(x.data) })), null, 1), { mode: 0o600 });
    log(`sauvegarde écrite dans ${backupDir}`);
  }

  const existing = Object.fromEntries(PRIVATE.map((c) => [c, new Set(data[c].map((x) => x.id))]));
  const planned = []; // { col, id, doc }
  const stats = {};
  const stat = (c) => (stats[c] ||= { scanned: 0, aCopier: 0, dejaPresents: 0, rienACopier: 0, champsFinanciersPublics: 0 });
  const queue = (col, id, doc, target) => {
    if (doc.ts === undefined) doc = { ...doc, ts: FieldValue.serverTimestamp() };
    if (existing[col].has(id)) stat(target).dejaPresents++;
    else { planned.push({ col, id, doc }); stat(target).aCopier++; }
  };
  for (const { id, data: d } of data.commandes) {
    const s = stat('commandes'); s.scanned++;
    const p = planCommande(d);
    if (legacyFields('commandes', d).length) s.champsFinanciersPublics++;
    if (!p.couts && !p.fournisseur) s.rienACopier++;
    if (p.couts) queue('commandes_couts', id, p.couts, 'commandes');
    if (p.fournisseur) queue('commandes_fourn', id, p.fournisseur, 'commandes');
  }
  for (const { id, data: d } of data.factures) {
    const s = stat('factures'); s.scanned++;
    const p = planFacture(d);
    if (legacyFields('factures', d).length) s.champsFinanciersPublics++;
    if (!p.couts) s.rienACopier++; else queue('factures_couts', id, p.couts, 'factures');
  }
  for (const { id, data: d } of data.produits) {
    const s = stat('produits'); s.scanned++;
    const p = planProduit(d);
    if (legacyFields('produits', d).length) s.champsFinanciersPublics++;
    if (!p.prive) s.rienACopier++; else queue('produits_prive', id, p.prive, 'produits');
  }

  /* Contrôle de cohérence des données (lecture seule) : identifiants seulement, jamais de montants ni de noms */
  const userIds = new Set(data.users.map((u) => u.id));
  const sansUid = (c) => data[c].filter((x) => !x.data.uid).map((x) => x.id);
  const audit = {
    clientsSansProprietaire: sansUid('clients'),
    clientsProprietaireInconnu: data.clients.filter((x) => x.data.uid && !userIds.has(x.data.uid)).map((x) => x.id),
    commandesSansUid: sansUid('commandes').length,
    facturesSansUid: sansUid('factures').length,
    precommandesSansUid: sansUid('precommandes').length,
    savSansUid: sansUid('sav').length,
    profilsSansStatut: data.users.filter((u) => !u.data.statut).map((u) => u.id),
    profilsEnAttente: data.users.filter((u) => u.data.statut === 'en_attente').length,
    administrateurs: data.users.filter((u) => u.data.role === 'administrateur').length,
    comptesAuthSansProfil: null,
  };
  if (listAuthUids) audit.comptesAuthSansProfil = (await listAuthUids()).filter((u) => !userIds.has(u));

  const report = { mode: apply ? 'APPLY' : 'SIMULATION', collections: stats, aCreer: planned.length, audit, crees: 0, erreurs: [] };
  if (apply) {
    const writer = db.bulkWriter();
    writer.onWriteError((e) => { report.erreurs.push({ chemin: e.documentRef.path, code: e.code }); return false; });
    for (const { col, id, doc } of planned) {
      if (!PRIVATE.includes(col)) throw new Error('écriture hors collections privées refusée : ' + col);
      writer.create(db.collection(col).doc(id), doc).then(() => { report.crees++; }, () => {});
    }
    await writer.close();
  }
  return report;
}

/* ---------- Effacement des anciens champs financiers des documents publics ----------
   Ne retire un champ que si sa copie privée existe déjà (sinon : document ignoré et signalé « à copier d'abord »).
   Ne touche à rien d'autre : ni aux montants de vente, ni aux documents privés, ni aux documents sans ancien champ.
   Sans « apply » : simulation (lecture seule). « apply » exige une sauvegarde complète faite juste avant. */
const NESTED = ['cost', 'catCost'];
const stripNested = (list) => list.map((p) => {
  if (!p || typeof p !== 'object') return p;
  const o = { ...p }; for (const k of NESTED) delete o[k]; return o;
});
export function planEffacement(col, d, prive) {
  const champs = legacyFields(col, d);
  const nestedKey = col === 'commandes' ? 'produits' : col === 'factures' ? 'products' : null;
  const hasNested = nestedKey && (arr(d[nestedKey]) || []).some((p) => p && NESTED.some((k) => k in p));
  if (!champs.length && !hasNested) return { action: 'rien' };
  let manque = [];
  if (col === 'commandes') {
    const p = planCommande(d);
    if (p.couts && !prive.commandes_couts) manque.push('commandes_couts');
    if (p.fournisseur && !prive.commandes_fourn) manque.push('commandes_fourn');
  } else if (col === 'factures') {
    if (planFacture(d).couts && !prive.factures_couts) manque.push('factures_couts');
  } else if (col === 'produits') {
    if (planProduit(d).prive && !prive.produits_prive) manque.push('produits_prive');
  }
  if (manque.length) return { action: 'copier_dabord', manque };
  const top = champs.filter((k) => !k.includes('[]'));
  return { action: 'effacer', champs: top, nested: hasNested ? nestedKey : null };
}
export async function effacer({ db, FieldValue, apply = false, backupDir = null, log = () => {} }) {
  if (apply && !backupDir) throw new Error('« apply » exige une sauvegarde : indiquer le dossier de sauvegarde.');
  if (apply) await backupAll({ db, dir: backupDir, log });
  const ids = {};
  for (const c of PRIVATE) ids[c] = new Set((await db.collection(c).get()).docs.map((d) => d.id));
  const rapport = { simulation: !apply, aEffacer: {}, copierDabord: {}, dejaPropres: {}, effaces: 0 };
  const ops = [];
  for (const col of ['commandes', 'factures', 'produits']) {
    rapport.aEffacer[col] = 0; rapport.copierDabord[col] = []; rapport.dejaPropres[col] = 0;
    for (const doc of (await db.collection(col).get()).docs) {
      const d = doc.data();
      const prive = Object.fromEntries(PRIVATE.map((c) => [c, ids[c].has(doc.id)]));
      const p = planEffacement(col, d, prive);
      if (p.action === 'rien') rapport.dejaPropres[col]++;
      else if (p.action === 'copier_dabord') rapport.copierDabord[col].push(doc.id);
      else {
        rapport.aEffacer[col]++;
        const upd = Object.fromEntries(p.champs.map((k) => [k, FieldValue.delete()]));
        if (p.nested) upd[p.nested] = stripNested(d[p.nested]);
        ops.push({ ref: doc.ref, upd });
      }
    }
    log(`${col} : ${rapport.aEffacer[col]} à nettoyer, ${rapport.copierDabord[col].length} à copier d'abord`);
  }
  if (apply) {
    for (let i = 0; i < ops.length; i += 400) {
      const b = db.batch(); ops.slice(i, i + 400).forEach((o) => b.update(o.ref, o.upd)); await b.commit();
      rapport.effaces += Math.min(400, ops.length - i);
    }
  }
  return rapport;
}
