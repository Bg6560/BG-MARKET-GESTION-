// Outil de migration des coûts : essais sur l'émulateur Firestore avec des données FICTIVES uniquement.
import { readFileSync, mkdtempSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { run, planCommande, planFacture, planProduit, legacyFields, PUBLIC, PRIVATE } from '../tools/lib/migration.mjs';

assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'ces essais doivent tourner sur l\'émulateur (npm run test:rules)');
const PROJECT = 'demo-bgmarket';
const db = getFirestore(initializeApp({ projectId: PROJECT }, 'migration-test'));
const T0 = Timestamp.fromDate(new Date('2026-09-01T10:00:00Z'));

async function clearAll() {
  await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
}
const FICTIF = {
  commandes: {
    c1: { uid: 'empA', ts: T0, client: 'Client Test', total: 200000, statut: 'livree',
      produits: [{ name: 'Phone A', qty: 1, prix: 100000, cost: 80000 }, { name: 'Phone B', qty: 2, prix: 50000, cost: 30000 }],
      coutCatalogue: 140000, profit: 60000, beneficeCmd: 60000, fournisseurId: 'F1', fournisseurNom: 'Fournisseur Test', fournisseurWa: '0100000009' },
    c2: { uid: 'empB', ts: T0, client: 'Client Deux', produit: 'Téléphone', prix: 1000, coutCatalogue: 0, total: 1000 },
    c3: { uid: 'empA', ts: T0, client: 'Client Trois', produit: 'Ancien modèle', prix: 9000, coutCatalogue: 5000, profit: 1000, total: 9000 },
  },
  factures: {
    f1: { uid: 'empA', ts: T0, num: 'FAC-001', total: 100000, cost: 80000, profit: 20000, products: [{ name: 'Phone A', qty: 1, price: 100000, cost: 80000 }] },
    f2: { uid: 'empB', ts: T0, num: 'FAC-002', total: 5000, products: [{ name: 'Coque', qty: 1, price: 5000 }] },
  },
  produits: { p1: { modele: 'Phone A', prixVente: 100000, prixAchat: 80000, quantite: 3 }, p2: { modele: 'Coque', prixVente: 5000, quantite: 10 } },
  clients: { cl1: { nom: 'Client Un', uid: 'empA' }, cl2: { nom: 'Client sans propriétaire' }, cl3: { nom: 'Client orphelin', uid: 'fantome' } },
  precommandes: { pr1: { uid: 'empA', client: 'Client Un' }, pr2: { client: 'Sans uid' } },
  sav: { s1: { uid: 'empB', client: 'Client Deux' } },
  users: { empA: { statut: 'actif', role: 'employe' }, empB: { role: 'employe' }, adm: { statut: 'actif', role: 'administrateur' }, wait: { statut: 'en_attente' } },
  commandes_couts: { c3: { uid: 'empA', ts: T0, coutCatalogue: 111, profit: 222, costs: [] } }, // déjà présent : ne doit pas être écrasé
};
async function seed() {
  await clearAll();
  for (const [col, docs] of Object.entries(FICTIF)) for (const [id, d] of Object.entries(docs)) await db.collection(col).doc(id).set(d);
}
async function dump(cols) {
  const out = {};
  for (const c of cols) out[c] = Object.fromEntries((await db.collection(c).get()).docs.map((d) => [d.id, JSON.stringify(d.data())]));
  return out;
}
const base = { db, FieldValue };
beforeEach(seed);

describe('Fonctions de plan (pures)', () => {
  it('commande : coûts par ligne, bénéfice, fournisseur à part', () => {
    const p = planCommande(FICTIF.commandes.c1);
    assert.deepEqual(p.couts.costs, [80000, 30000]);
    assert.equal(p.couts.coutCatalogue, 140000);
    assert.equal(p.couts.profit, 60000);
    assert.equal(p.fournisseur.fournisseurNom, 'Fournisseur Test');
  });
  it('rien à copier quand il n\'y a aucun coût', () => {
    assert.equal(planCommande(FICTIF.commandes.c2).couts, null);
    assert.equal(planFacture(FICTIF.factures.f2).couts, null);
    assert.equal(planProduit(FICTIF.produits.p2).prive, null);
  });
  it('champs financiers publics repérés', () => {
    assert.deepEqual(legacyFields('commandes', FICTIF.commandes.c1).sort(), ['beneficeCmd', 'coutCatalogue', 'fournisseurId', 'fournisseurNom', 'fournisseurWa', 'produits[].cost', 'profit']);
    assert.deepEqual(legacyFields('factures', FICTIF.factures.f1).sort(), ['cost', 'products[].cost', 'profit']);
    assert.deepEqual(legacyFields('produits', FICTIF.produits.p1), ['prixAchat']);
    assert.deepEqual(legacyFields('factures', FICTIF.factures.f2), []);
  });
});

describe('Simulation (par défaut) : lecture seule', () => {
  it('annonce ce qui serait copié et n\'écrit rien', async () => {
    const avant = await dump([...PUBLIC, ...PRIVATE]);
    const r = await run({ ...base });
    assert.equal(r.mode, 'SIMULATION');
    assert.equal(r.crees, 0);
    assert.equal(r.aCreer, 4); // commandes_couts/c1, commandes_fourn/c1, factures_couts/f1, produits_prive/p1 (c3 existe déjà)
    assert.deepEqual(r.collections.commandes, { scanned: 3, aCopier: 2, dejaPresents: 1, rienACopier: 1, champsFinanciersPublics: 3 });
    assert.deepEqual(r.collections.factures, { scanned: 2, aCopier: 1, dejaPresents: 0, rienACopier: 1, champsFinanciersPublics: 1 });
    assert.deepEqual(r.collections.produits, { scanned: 2, aCopier: 1, dejaPresents: 0, rienACopier: 1, champsFinanciersPublics: 1 });
    assert.deepEqual(await dump([...PUBLIC, ...PRIVATE]), avant, 'la base a changé pendant une simulation');
  });
  it('contrôle des données : propriétaires manquants, profils sans statut, comptes sans profil', async () => {
    const r = await run({ ...base, listAuthUids: async () => ['empA', 'inconnu1', 'inconnu2'] });
    assert.deepEqual(r.audit.clientsSansProprietaire, ['cl2']);
    assert.deepEqual(r.audit.clientsProprietaireInconnu, ['cl3']);
    assert.equal(r.audit.precommandesSansUid, 1);
    assert.equal(r.audit.commandesSansUid, 0);
    assert.deepEqual(r.audit.profilsSansStatut, ['empB']);
    assert.equal(r.audit.profilsEnAttente, 1);
    assert.equal(r.audit.administrateurs, 1);
    assert.deepEqual(r.audit.comptesAuthSansProfil, ['inconnu1', 'inconnu2']);
  });
});

describe('Copie réelle (sur l\'émulateur, données fictives)', () => {
  it('refuse sans sauvegarde', async () => {
    await assert.rejects(() => run({ ...base, apply: true }), /sauvegarde/);
    assert.equal((await db.collection('factures_couts').get()).size, 0);
  });
  it('copie seulement : documents publics et champs financiers intacts, sauvegarde écrite, aucun écrasement', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'sauvegarde-'));
    const publicAvant = await dump(PUBLIC);
    const r = await run({ ...base, apply: true, backupDir: dir });
    assert.equal(r.erreurs.length, 0);
    assert.equal(r.crees, 4); // commandes_couts/c1, commandes_fourn/c1, factures_couts/f1, produits_prive/p1
    assert.deepEqual(await dump(PUBLIC), publicAvant, 'un document public a été modifié');
    assert.equal(JSON.parse((await db.collection('commandes_couts').doc('c3').get()).data().coutCatalogue), 111, 'document privé existant écrasé');
    const c1 = (await db.collection('commandes_couts').doc('c1').get()).data();
    assert.deepEqual([c1.uid, c1.coutCatalogue, c1.profit, c1.costs], ['empA', 140000, 60000, [80000, 30000]]);
    assert.equal(c1.ts.toMillis(), T0.toMillis(), 'date d\'origine conservée');
    assert.equal((await db.collection('commandes_fourn').doc('c1').get()).data().fournisseurNom, 'Fournisseur Test');
    assert.equal((await db.collection('factures_couts').doc('f1').get()).data().profit, 20000);
    assert.equal((await db.collection('produits_prive').doc('p1').get()).data().prixAchat, 80000);
    assert.equal((await db.collection('produits_prive').doc('p2').get()).exists, false);
    // sauvegarde complète
    for (const c of [...PUBLIC, ...PRIVATE]) assert.ok(existsSync(join(dir, `${c}.json`)), `sauvegarde manquante : ${c}`);
    const bk = JSON.parse(readFileSync(join(dir, 'commandes.json'), 'utf8'));
    assert.equal(bk.length, 3);
    assert.equal(bk.find((x) => x.id === 'c1').data.coutCatalogue, 140000);
  });
  it('rejouable : la seconde exécution ne crée plus rien', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'sauvegarde-'));
    await run({ ...base, apply: true, backupDir: dir });
    const r2 = await run({ ...base, apply: true, backupDir: dir });
    assert.equal(r2.aCreer, 0);
    assert.equal(r2.crees, 0);
    assert.equal(r2.collections.commandes.dejaPresents, 3); // c1 (coûts, fournisseur) et c3
  });
  it('ne touche aucune collection publique (écriture refusée par l\'outil)', async () => {
    const src = readFileSync(new URL('../tools/lib/migration.mjs', import.meta.url), 'utf8');
    assert.doesNotMatch(src, /\.(update|delete|set)\(/, 'l\'outil ne doit ni modifier ni supprimer');
    assert.match(src, /écriture hors collections privées refusée/);
  });
});

describe('Après copie : l\'application affiche les mêmes chiffres qu\'avant', () => {
  const app = [...readFileSync(new URL('../index.html', import.meta.url), 'utf8').matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).pop();
  const fn = (name) => {
    const m = new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`).exec(app);
    let i = app.indexOf('{', m.index), depth = 0;
    for (; i < app.length; i++) {
      const c = app[i];
      if (c === "'" || c === '"' || c === '`') { for (i++; app[i] !== c; i++) if (app[i] === '\\') i++; }
      else if (c === '/' && app[i + 1] === '/') i = app.indexOf('\n', i);
      else if (c === '/' && app[i + 1] === '*') i = app.indexOf('*/', i) + 1;
      else if (c === '{') depth++;
      else if (c === '}' && --depth === 0) return app.slice(m.index, i + 1);
    }
  };
  it('commande, facture et produit migrés = valeurs historiques (patron)', async () => {
    await run({ ...base, apply: true, backupDir: mkdtempSync(join(tmpdir(), 'sauvegarde-')) });
    const ctx = vm.createContext({ isAdmin: true, can: () => true });
    vm.runInContext(['var COUTS={cmd:new Map(),fac:new Map(),prod:new Map(),fourn:new Map()};', fn('coutsNoCost'), fn('coutsCmd'), fn('coutsFac'), fn('coutsProd')].join('\n'), ctx);
    const fill = async (col, key) => { for (const d of (await db.collection(col).get()).docs) ctx.COUTS[key].set(d.id, JSON.parse(JSON.stringify(d.data()))); };
    await fill('commandes_couts', 'cmd'); await fill('factures_couts', 'fac'); await fill('produits_prive', 'prod'); await fill('commandes_fourn', 'fourn');
    // reconstitue le document « public propre » (sans coûts) comme le fera le nettoyage, puis hydrate
    const propre = (d) => JSON.parse(JSON.stringify(d, (k, v) => (k === 'cost' ? undefined : v)));
    ctx.c = { id: 'c1', ...propre(FICTIF.commandes.c1) }; for (const k of ['coutCatalogue', 'profit', 'beneficeCmd', 'fournisseurId', 'fournisseurNom', 'fournisseurWa']) delete ctx.c[k];
    ctx.f = { id: 'f1', ...propre(FICTIF.factures.f1) }; delete ctx.f.cost; delete ctx.f.profit;
    ctx.p = { id: 'p1', modele: 'Phone A' };
    vm.runInContext('coutsCmd(c);coutsFac(f);coutsProd(p);', ctx);
    assert.equal(ctx.c.coutCatalogue, 140000);
    assert.equal(ctx.c.profit, 60000);
    assert.equal(ctx.c.produits.map((x) => x.cost).join(), '80000,30000');
    assert.equal(ctx.c.fournisseurNom, 'Fournisseur Test');
    assert.equal(ctx.f.profit, 20000);
    assert.equal(ctx.f.cost, 80000);
    assert.equal(ctx.f.products[0].cost, 80000);
    assert.equal(ctx.p.prixAchat, 80000);
  });
});
