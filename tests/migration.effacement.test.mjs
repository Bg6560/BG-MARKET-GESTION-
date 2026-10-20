// Effacement des anciens champs financiers : données FICTIVES, émulateur.
import { mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { effacer, run, legacyFields } from '../tools/lib/migration.mjs';

assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'à lancer par npm run test:rules');
const db = getFirestore(initializeApp({ projectId: 'demo-bgmarket' }, 'effacement-test'));
const get = async (p) => (await db.doc(p).get()).data();

beforeEach(async () => {
  await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/demo-bgmarket/databases/(default)/documents`, { method: 'DELETE' });
  await db.doc('commandes/c1').set({ uid: 'empA', client: 'C', total: 200000, statut: 'livree', produits: [{ name: 'A', qty: 1, prix: 200000, cost: 150000, catCost: 150000 }], coutCatalogue: 150000, profit: 50000, beneficeCmd: 50000, fournisseurId: 'F1', fournisseurNom: 'F', fournisseurWa: '01' });
  await db.doc('commandes/c2').set({ uid: 'empA', client: 'Sans copie', total: 1000, coutCatalogue: 800, profit: 200 });
  await db.doc('commandes/c3').set({ uid: 'empA', client: 'Propre', total: 5000, produits: [{ name: 'B', qty: 1, prix: 5000 }] });
  await db.doc('factures/f1').set({ uid: 'empA', num: 'FAC-1', total: 100000, cost: 80000, profit: 20000, products: [{ name: 'A', qty: 1, price: 100000, cost: 80000 }] });
  await db.doc('produits/p1').set({ modele: 'A', prixVente: 100000, prixAchat: 80000, quantite: 3 });
});

describe('Effacement des anciens coûts', () => {
  it('simulation : rien n\'est modifié ; sans copie privée, tout est « à copier d\'abord »', async () => {
    const r = await effacer({ db, FieldValue });
    assert.equal(r.simulation, true);
    assert.deepEqual(r.copierDabord.commandes.sort(), ['c1', 'c2']);
    assert.deepEqual(r.copierDabord.factures, ['f1']);
    assert.equal(r.dejaPropres.commandes, 1);
    assert.equal((await get('commandes/c1')).profit, 50000);
    await assert.rejects(effacer({ db, FieldValue, apply: true }), /sauvegarde/);
  });
  it('après la copie : efface seulement les champs financiers, garde les ventes, sauvegarde d\'abord ; rejouable', async () => {
    await run({ db, FieldValue, apply: true, backupDir: mkdtempSync(join(tmpdir(), 'copie-')) });
    await db.doc('commandes_couts/c2').delete(); // c2 : copie absente → ne doit pas être touchée
    const dir = mkdtempSync(join(tmpdir(), 'avant-effacement-'));
    const r = await effacer({ db, FieldValue, apply: true, backupDir: dir });
    assert.ok(readdirSync(dir).includes('commandes.json'), 'sauvegarde faite juste avant');
    assert.equal(r.effaces, 3);
    const c1 = await get('commandes/c1');
    assert.deepEqual(legacyFields('commandes', c1), []);
    assert.equal(c1.produits[0].catCost, undefined);
    assert.equal(c1.total, 200000);
    assert.equal(c1.produits[0].prix, 200000);
    assert.equal(c1.statut, 'livree');
    assert.equal((await get('commandes_couts/c1')).profit, 50000, 'copie privée intacte');
    assert.equal((await get('commandes_fourn/c1')).fournisseurNom, 'F');
    assert.equal((await get('commandes/c2')).profit, 200, 'sans copie privée : jamais effacé');
    assert.deepEqual(legacyFields('factures', await get('factures/f1')), []);
    assert.equal((await get('factures/f1')).products[0].price, 100000);
    const p1 = await get('produits/p1');
    assert.equal(p1.prixAchat, undefined);
    assert.equal(p1.quantite, 3);
    assert.equal((await get('produits_prive/p1')).prixAchat, 80000);
    const r2 = await effacer({ db, FieldValue });
    assert.equal(r2.aEffacer.commandes + r2.aEffacer.factures + r2.aEffacer.produits, 0, 'rien à refaire');
  });
});
