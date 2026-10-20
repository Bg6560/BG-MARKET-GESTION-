// Effacement des anciens champs financiers des documents publics (outil distinct de la copie, qui n'écrit jamais dans les documents publics).
import { legacyFields, planCommande, planFacture, planProduit, backupAll, PRIVATE } from './migration.mjs';
const arr = (v) => (Array.isArray(v) ? v : null);

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
