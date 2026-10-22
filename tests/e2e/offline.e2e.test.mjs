// Hors ligne de bout en bout : coupure réseau réelle du navigateur, règles Firestore réelles, données fictives.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { appendFileSync } from 'node:fs';
import { doc, setDoc, getDoc, getDocs, collection, updateDoc, Timestamp } from 'firebase/firestore';
import { launch, openApp, login, clearAll, authSignUp, loadRules } from './harness.mjs';

const U = {};
let browser, env;
const EMAILS = { patron: 'bgmarket99@gmail.com', empA: 'empa@test.local' };
const server = (fn) => env.withSecurityRulesDisabled(async (ctx) => fn(ctx.firestore()));
const countDocs = async (col, pred = () => true) => { let n = 0; await server(async (db) => { n = (await getDocs(collection(db, col))).docs.filter((d) => pred(d.data())).length; }); return n; };
const badge = (page) => page.locator('#sync-badge').textContent();

before(async () => {
  await clearAll();
  for (const [k, e] of Object.entries(EMAILS)) U[k] = await authSignUp(e);
  env = await loadRules(U.patron);
  await server(async (db) => {
    await setDoc(doc(db, 'users', U.patron), { uid: U.patron, email: EMAILS.patron, nom: 'Patron', role: 'admin', statut: 'actif' });
    await setDoc(doc(db, 'users', U.empA), { uid: U.empA, email: EMAILS.empA, nom: 'Awa', role: 'employe', statut: 'actif' });
    await setDoc(doc(db, 'app_config', 'settings'), { validationFactures: true, invNumR: 5, stockAlerte: 2 });
    await setDoc(doc(db, 'produits', 'p1'), { marque: 'Marque', modele: 'Phone Test', prixVente: 50000, quantite: 5 });
    await setDoc(doc(db, 'clients', 'c0'), { nom: 'Ancien client', tel: '0100000000', uid: U.empA, ts: Timestamp.now() });
  });
  browser = await launch();
});
after(async () => { await browser?.close(); await env?.cleanup(); });

async function session() {
  await server(async (db) => { await updateDoc(doc(db, 'users', U.empA), { statut: 'actif' }); });
  const s = await openApp(browser, { log: (m) => { if (process.env.E2E_LOG) appendFileSync(process.env.E2E_LOG, m + '\n'); } });
  await login(s.page, EMAILS.empA);
  await s.page.waitForSelector('#main-content .dsk-hello', { timeout: 25000 });
  await s.page.waitForFunction(() => !document.querySelector('#main-content .dsk-skel'), null, { timeout: 25000 });
  return s;
}
const waitBadge = (page, re, ms = 30000) => page.waitForFunction((src) => new RegExp(src).test(document.getElementById('sync-badge').textContent), re.source, { timeout: ms });

describe('Hors ligne : client', () => {
  it('création sans réseau : pas de blocage, état « en attente », envoi unique au retour du réseau', async () => {
    const { page, context } = await session();
    await page.evaluate(() => goTab('clients'));
    await page.waitForSelector('.dc-grid', { timeout: 15000 });
    await context.setOffline(true);
    await waitBadge(page, /Hors ligne/);
    await page.evaluate(() => openNvClient());
    await page.fill('#cl-nom', 'Client Hors Ligne');
    await page.fill('#cl-tel', '0170000000');
    await page.click('#cl-save');
    await waitBadge(page, /En attente \(1\)/, 8000);
    assert.equal(await page.evaluate(() => document.getElementById('ov-load').style.display), 'none', 'l\'écran de chargement ne doit pas rester bloqué');
    assert.match(await page.locator('#toast-msg').textContent(), /attente de synchronisation/);
    assert.doesNotMatch(await badge(page), /Synchronisé/);
    assert.equal(await countDocs('clients', (d) => d.nom === 'Client Hors Ligne'), 0, 'rien ne doit être annoncé ni présent côté serveur avant le retour du réseau');
    await page.click('#sync-badge');
    assert.match(await page.locator('#sync-panel').textContent(), /Client Client Hors Ligne|Client Hors Ligne/);
    await page.evaluate(() => syncClosePanel());
    await context.setOffline(false);
    await waitBadge(page, /^Synchronisé$/);
    assert.equal(await countDocs('clients', (d) => d.nom === 'Client Hors Ligne' && d.uid === U.empA), 1, 'exactement un client, au bon propriétaire');
    await context.close();
  });
});

describe('Hors ligne : facture, coûts, stock', () => {
  it('facture d\'un employé sans réseau : en attente de validation, coûts à part, stock et mouvement une seule fois', async () => {
    const { page, context } = await session();
    await page.evaluate(() => goTab('produits'));
    await page.waitForSelector('.dc-grid', { timeout: 15000 });
    await context.setOffline(true);
    await waitBadge(page, /Hors ligne/);
    await page.evaluate(() => openNvFac());
    await page.waitForSelector('#fn-nom');
    await page.fill('#fn-nom', 'Client Facture Hors Ligne');
    await page.evaluate(() => { const l = facDraft.lines[0]; l.name = 'Phone Test'; l.pid = 'p1'; l.qty = 1; l.price = 50000; l.cost = 40000; });
    await page.click('#fn-save');
    await waitBadge(page, /En attente \(/, 8000);
    await page.waitForFunction(() => document.getElementById('ov-load').style.display === 'none', null, { timeout: 10000 });
    assert.equal(await countDocs('factures', (d) => d.client === 'Client Facture Hors Ligne'), 0);
    await context.setOffline(false);
    await waitBadge(page, /^Synchronisé$/);
    await page.waitForTimeout(1500);
    let fac = null, facId = null;
    await server(async (db) => { const s = await getDocs(collection(db, 'factures')); const d = s.docs.find((x) => x.data().client === 'Client Facture Hors Ligne'); fac = d && d.data(); facId = d && d.id; });
    assert.ok(fac, 'facture envoyée');
    assert.equal(fac.validation, 'a_valider', 'la validation ne peut pas être contournée');
    assert.equal(fac.uid, U.empA);
    assert.equal('profit' in fac || 'cost' in fac, false, 'aucun coût dans la facture publique');
    assert.equal(fac.products[0].cost, undefined);
    assert.equal(fac.products[0].pid, 'p1');
    let couts = null; await server(async (db) => { const s = await getDoc(doc(db, 'factures_couts', facId)); couts = s.exists() ? s.data() : null; });
    assert.ok(couts, 'document de coûts créé');
    assert.equal(couts.profit, 10000);
    let q = null; await server(async (db) => { q = (await getDoc(doc(db, 'produits', 'p1'))).data().quantite; });
    assert.equal(q, 4, 'stock décrémenté une seule fois');
    assert.equal(await countDocs('mouvements_stock', (d) => d.produitId === 'p1' && d.factureId === facId && d.delta === -1), 1);
    await context.close();
  });
});

describe('Hors ligne : compte suspendu puis réactivé', () => {
  it('l\'écriture en attente est conservée pendant la suspension et envoyée une seule fois après réactivation', async () => {
    const s = await session();
    await s.page.evaluate(() => goTab('clients'));
    await s.page.waitForSelector('.dc-grid', { timeout: 15000 });
    await s.context.setOffline(true);
    await waitBadge(s.page, /Hors ligne/);
    await s.page.evaluate(() => openNvClient());
    await s.page.fill('#cl-nom', 'Client Pendant Suspension');
    await s.page.fill('#cl-tel', '0180000000');
    await s.page.click('#cl-save');
    await waitBadge(s.page, /En attente \(1\)/, 8000);
    await s.page.waitForTimeout(2500);
    assert.equal(await countDocs('clients', (d) => d.nom === 'Client Pendant Suspension'), 0, 'rien n\'a pu partir hors ligne');
    await server(async (db) => { await updateDoc(doc(db, 'users', U.empA), { statut: 'suspendu' }); });
    await s.context.setOffline(false);
    await s.page.waitForFunction(() => document.getElementById('app-page').style.display === 'none', null, { timeout: 30000 });
    await s.page.waitForFunction(() => /suspendu/.test(document.getElementById('l-err').textContent), null, { timeout: 10000 });
    await s.page.waitForTimeout(2500);
    assert.equal(await countDocs('clients', (d) => d.nom === 'Client Pendant Suspension'), 0, 'un compte suspendu n\'écrit rien');
    await server(async (db) => { await updateDoc(doc(db, 'users', U.empA), { statut: 'actif' }); });
    await s.page.reload();
    await login(s.page, EMAILS.empA);
    await s.page.waitForSelector('#main-content .dsk-hello', { timeout: 25000 });
    /* Deux issues possibles selon la course entre l'envoi et la déconnexion automatique du compte suspendu :
       l'écriture est restée en file (envoyée après réactivation) ou refusée puis conservée (reprise manuelle). Dans les deux cas : une seule fois. */
    await waitBadge(s.page, /^(Synchronisé|Échec \(1\))$/, 40000);
    if (/Échec/.test(await badge(s.page))) {
      await s.page.click('#sync-badge');
      await s.page.click('#sync-panel .sp-acts button:has-text("Réessayer")');
      await waitBadge(s.page, /^Synchronisé$/, 30000);
    }
    assert.equal(await countDocs('clients', (d) => d.nom === 'Client Pendant Suspension' && d.uid === U.empA), 1, 'conservée puis envoyée une seule fois');
    await s.context.close();
  });
});

describe('Hors ligne : modification refusée (conflit)', () => {
  it('facture validée entre-temps : la modification hors ligne est refusée, signalée, conservée jusqu\'à abandon', async () => {
    await server(async (db) => { await setDoc(doc(db, 'factures', 'fx'), { uid: U.empA, num: 'FAC-X', client: 'Client Fx', total: 1000, validation: 'a_valider', statut: 'en_attente', ts: Timestamp.now(), products: [{ name: 'Phone Test', qty: 1, price: 1000 }] }); });
    const { page, context } = await session();
    await page.evaluate(() => goTab('factures'));
    await page.waitForSelector('.dc-grid', { timeout: 15000 });
    await context.setOffline(true);
    await waitBadge(page, /Hors ligne/);
    await page.evaluate(() => db.collection('factures').doc('fx').update({ client: 'Modifié hors ligne' }));
    await waitBadge(page, /En attente \(1\)/, 8000);
    await server(async (db) => { await updateDoc(doc(db, 'factures', 'fx'), { validation: 'validee', validePar: 'Patron' }); });
    await context.setOffline(false);
    await waitBadge(page, /Échec \(1\)/, 30000);
    await page.click('#sync-badge');
    const panel = await page.locator('#sync-panel').textContent();
    assert.match(panel, /Facture FAC-X|Facture/);
    assert.match(panel, /Refusé par le serveur/);
    let client = null; await server(async (db) => { client = (await getDoc(doc(db, 'factures', 'fx'))).data().client; });
    assert.equal(client, 'Client Fx', 'la facture validée n\'a pas été modifiée');
    page.once('dialog', (d) => d.accept());
    await page.click('#sync-panel .sp-acts button:has-text("Abandonner")');
    await waitBadge(page, /^Synchronisé$/, 10000);
    await context.close();
  });
});

describe('Hors ligne : commande avec produit choisi, produit créé par le patron', () => {
  it('commande d\'un employé sans réseau : une seule commande au retour, produit lié, stock inchangé, aucun coût public', async () => {
    const { page, context } = await session();
    let avant; await server(async (db) => { avant = (await getDoc(doc(db, 'produits', 'p1'))).data().quantite; });
    await page.evaluate(() => openNvCmd());
    await page.waitForSelector('[id^="cprod-name-"]');
    await page.waitForFunction(() => ORDP.ready && ORDP.list.length > 0);
    await context.setOffline(true);
    await waitBadge(page, /Hors ligne/);
    const id = await page.evaluate(() => cmdProducts[0].id);
    await page.fill('#cprod-name-' + id, 'phone test');
    await page.locator('#cprod-sg-' + id + ' .ui-suggest-item').first().click();
    await page.fill('#fc-nom', 'Client Commande Hors Ligne');
    await page.fill('#fc-tel', '0190000001');
    await page.evaluate(() => saveCmd());
    await waitBadge(page, /En attente \(\d\)/, 8000);
    assert.equal(await page.evaluate(() => document.getElementById('ov-load').style.display), 'none');
    assert.equal(await countDocs('commandes', (d) => d.client === 'Client Commande Hors Ligne'), 0, 'rien côté serveur avant le retour du réseau');
    await context.setOffline(false);
    await waitBadge(page, /^Synchronisé$/);
    let cmds = [];
    await server(async (db) => { cmds = (await getDocs(collection(db, 'commandes'))).docs.map((d) => d.data()).filter((d) => d.client === 'Client Commande Hors Ligne'); });
    assert.equal(cmds.length, 1, 'exactement une commande');
    assert.equal(cmds[0].produits[0].pid, 'p1');
    assert.equal(cmds[0].produits[0].cost, undefined);
    assert.equal(cmds[0].uid, U.empA);
    let q; await server(async (db) => { q = (await getDoc(doc(db, 'produits', 'p1'))).data().quantite; });
    assert.equal(q, avant, 'la commande ne touche pas au stock');
    await context.close();
  });

  it('patron : produit créé sans réseau, prix d\'achat à part ; envoyé une seule fois', async () => {
    const s = await openApp(browser);
    await login(s.page, EMAILS.patron);
    await s.page.waitForSelector('#main-content .dsk-hello', { timeout: 25000 });
    await s.page.waitForFunction(() => !document.querySelector('#main-content .dsk-skel'), null, { timeout: 25000 });
    const { page, context } = s;
    await page.evaluate(() => openNvProd());
    await page.waitForSelector('#pr-marque');
    await context.setOffline(true);
    await waitBadge(page, /Hors ligne/);
    await page.fill('#pr-marque', 'Marque');
    await page.fill('#pr-modele', 'Produit Hors Ligne');
    await page.fill('#pr-vente', '90000');
    await page.fill('#pr-achat', '70000');
    await page.fill('#pr-qte', '4');
    await page.evaluate(() => saveProd(''));
    await waitBadge(page, /En attente \(\d\)/, 8000);
    assert.equal(await countDocs('produits', (d) => d.modele === 'Produit Hors Ligne'), 0);
    await context.setOffline(false);
    await waitBadge(page, /^Synchronisé$/);
    let pid = null, prive = null;
    await server(async (db) => { const s2 = (await getDocs(collection(db, 'produits'))).docs.filter((d) => d.data().modele === 'Produit Hors Ligne'); assert.equal(s2.length, 1); pid = s2[0].id; assert.equal(s2[0].data().prixAchat, undefined); prive = (await getDoc(doc(db, 'produits_prive', pid))).data(); });
    assert.equal(prive.prixAchat, 70000);
    await context.close();
  });
});
