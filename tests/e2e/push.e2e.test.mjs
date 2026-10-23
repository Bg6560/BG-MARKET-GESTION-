// Bout en bout : notifications internes (cloche, panneau, historique, ouverture), par rôle, avec les vraies règles Firestore.
// Les notifications push du téléphone ne sont pas en service (pas de serveur) : l'écran doit le dire et ne proposer aucune activation.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { doc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { launch, openApp, login, clearAll, authSignUp, loadRules } from './harness.mjs';

const EMAILS = { patron: 'bgmarket99@gmail.com', admin: 'admin1@test.local', empA: 'empa@test.local' };
const U = {};
let browser, env;
const seed = (fn) => env.withSecurityRulesDisabled(async (ctx) => fn(ctx.firestore()));

before(async () => {
  await clearAll();
  for (const [k, e] of Object.entries(EMAILS)) U[k] = await authSignUp(e);
  env = await loadRules(U.patron);
  await seed(async (db) => {
    const prof = (k, extra) => setDoc(doc(db, 'users', U[k]), { uid: U[k], email: EMAILS[k], nom: k, statut: 'actif', ...extra });
    await prof('patron', { role: 'admin' });
    await prof('admin', { role: 'administrateur', perms: { couts: false, suppr: false, reglages: true, totaux: false } });
    await prof('empA', { role: 'employe' });
    await setDoc(doc(db, 'users', 'pend1'), { uid: 'pend1', email: 'neuf@test.local', nom: 'Compte Neuf', statut: 'en_attente', role: 'employe' });
    await setDoc(doc(db, 'app_config', 'settings'), { invNumR: 5, bizName: 'Boutique Test', stockAlerte: 2 });
    await setDoc(doc(db, 'commandes', 'c1'), { uid: U.empA, vendeur: 'empA', num: 'CMD-001', client: 'Client Un', produit: 'Phone Test', produits: [{ name: 'Phone Test', qty: 1, prix: 100000 }], total: 100000, statut: 'en_attente', ts: Timestamp.now() });
    await setDoc(doc(db, 'factures', 'f1'), { uid: U.empA, vendeur: 'empA', num: 'F-001', client: 'Client Deux', lignes: [], total: 250000, validation: 'a_valider', ts: Timestamp.now() });
    await setDoc(doc(db, 'produits', 'p1'), { marque: 'Samsung', modele: 'Galaxy Test', quantite: 1, prix: 90000 });
    await setDoc(doc(db, 'produits', 'p2'), { marque: 'Samsung', modele: 'Galaxy Plein', quantite: 9, prix: 90000 });
  });
  browser = await launch();
});
after(async () => { await browser?.close(); await env?.cleanup(); });

async function session(email, opts = {}) {
  const s = await openApp(browser, { width: 1440, height: 1100, ...opts });
  await login(s.page, email);
  await s.page.waitForSelector('#main-content .dsk-hello', { timeout: 25000 });
  return s;
}
const bell = (page) => page.evaluate(() => { const b = document.getElementById('dsk-bell-n'); return b && !b.hidden ? b.textContent : '0'; });
const waitBell = (page, n) => page.waitForFunction((n) => { const b = document.getElementById('dsk-bell-n'); return (b && !b.hidden ? b.textContent : '0') === n; }, n, { timeout: 15000 });
const panelText = async (page) => { await page.click('#dsk-bell'); await page.waitForSelector('#ntf-ov:not([hidden]) .ntf-list'); return page.locator('#ntf-list').textContent(); };

describe('Notifications internes : cloche, rôles, ouverture', () => {
  it('patron : 4 alertes réelles (commande, facture, stock, compte), sans montant ; clic → commande ouverte, compteur baissé', async () => {
    const { page, context, errors } = await session(EMAILS.patron);
    await waitBell(page, '4');
    const t = await panelText(page);
    for (const re of [/Commande à valider/, /Client Un · CMD-001/, /Facture à valider/, /F-001/, /Stock bas/, /Galaxy Test · 1 restant/, /Compte à approuver/, /Compte Neuf/]) assert.match(t, re);
    assert.doesNotMatch(t, /Galaxy Plein/);
    assert.doesNotMatch(t, /100\s?000|250\s?000|F CFA/, 'aucun montant dans les notifications');
    await page.locator('.ntf-it', { hasText: 'CMD-001' }).click();
    await page.waitForFunction(() => { const h = document.querySelector('#main-content h1'); return h && h.textContent === 'Client Un'; }, null, { timeout: 15000 });
    assert.equal(await page.evaluate(() => document.getElementById('ntf-ov').hidden), true);
    await waitBell(page, '3');
    /* Échap ferme le panneau ; « tout marquer comme lu » remet à zéro */
    await page.click('#dsk-bell');
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.getElementById('ntf-ov').hidden), true);
    await page.click('#dsk-bell');
    await page.click('#ntf-readall');
    await waitBell(page, '0');
    assert.deepEqual(errors, []);
    await context.close();
  });

  it('en direct : une nouvelle commande arrive → annonce et compteur, une seule fois', async () => {
    const { page, context, errors } = await session(EMAILS.admin);
    await waitBell(page, '3');
    await seed((db) => setDoc(doc(db, 'commandes', 'c2'), { uid: U.empA, vendeur: 'empA', num: 'CMD-002', client: 'Client Trois', produits: [], total: 50000, statut: 'en_attente', ts: Timestamp.now() }));
    await waitBell(page, '4');
    await page.waitForFunction(() => /Commande à valider · Client Trois/.test(document.body.textContent), null, { timeout: 8000 });
    await seed((db) => updateDoc(doc(db, 'commandes', 'c2'), { note: 'modifiée' }));
    await page.waitForTimeout(1200);
    assert.equal(await bell(page), '4', 'modifier la même commande ne crée pas de doublon');
    /* validée ailleurs : passe dans l'historique */
    await seed((db) => updateDoc(doc(db, 'commandes', 'c2'), { statut: 'validee' }));
    await waitBell(page, '3');
    const t = await panelText(page);
    assert.match(t, /Historique[\s\S]*CMD-002[\s\S]*Traité/);
    assert.doesNotMatch(t, /Compte à approuver/, 'l\'administrateur ne reçoit pas les alertes du patron');
    assert.deepEqual(errors, []);
    await context.close();
  });

  it('employé : rien de la gestion ; sa commande validée → notification qui ouvre la commande', async () => {
    const { page, context, errors } = await session(EMAILS.empA);
    await page.waitForTimeout(1500);
    assert.equal(await bell(page), '0');
    let t = await panelText(page);
    assert.doesNotMatch(t, /Commande à valider|Facture à valider|Stock|Compte/);
    await page.keyboard.press('Escape');
    await seed((db) => updateDoc(doc(db, 'commandes', 'c1'), { statut: 'validee' }));
    await waitBell(page, '1');
    t = await panelText(page);
    assert.match(t, /Commande validée/);
    assert.match(t, /Client Un · CMD-001/);
    await page.locator('.ntf-it', { hasText: 'CMD-001' }).click();
    await page.waitForFunction(() => { const h = document.querySelector('#main-content h1'); return h && h.textContent === 'Client Un'; }, null, { timeout: 15000 });
    await waitBell(page, '0');
    assert.deepEqual(errors, []);
    await context.close();
  });

  it('réglages : pas de bouton d\'activation push, explication honnête, catégories par rôle', async () => {
    const { page, context, errors } = await session(EMAILS.patron);
    await page.evaluate(() => { goTab('parametres'); });
    await page.waitForSelector('.st-hero', { timeout: 10000 });
    await page.evaluate(() => uiSettings('notifications'));
    await page.waitForFunction(() => /Dans l'application/.test(document.querySelector('#main-content').textContent));
    const t = await page.locator('#main-content').textContent();
    assert.match(t, /Non disponibles pour le moment/);
    assert.match(t, /forfait Blaze/);
    assert.doesNotMatch(t, /Activer les notifications|Clé web push/);
    assert.match(t, /Comptes à approuver/);
    assert.equal(await page.locator('#push-vapid').count(), 0);
    const box = await page.locator('#main-content input[type="checkbox"]').first().boundingBox();
    assert.ok(box.width <= 26 && box.height <= 26, 'case à cocher de taille normale : ' + JSON.stringify(box));
    assert.deepEqual(errors, []);
    await context.close();
  });

  it('téléphone (390 px) : la cloche est visible et le panneau s\'ouvre en bas de l\'écran', async () => {
    const { page, context, errors } = await openApp(browser, { width: 390, height: 844 });
    await login(page, EMAILS.patron);
    await page.waitForSelector('#main-content .dsk-hello', { timeout: 25000 });
    assert.equal(await page.locator('#dsk-bell').isVisible(), true);
    await page.click('#dsk-bell');
    const box = await page.locator('.ntf-pan').boundingBox();
    assert.ok(box.width >= 380 && Math.round(box.y + box.height) >= 840, JSON.stringify(box));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'pas de défilement horizontal');
    assert.deepEqual(errors, []);
    await context.close();
  });

  it('un autre compte ne peut pas lire ni écrire les appareils d\'autrui (règles réelles)', async () => {
    const adminCtx = env.authenticatedContext(U.admin).firestore();
    await assert.rejects(setDoc(doc(adminCtx, 'appareils', `${U.empA}_x`), { uid: U.empA, token: 't', plateforme: 'web', prefs: {} }));
  });

  it('lien d\'ouverture (#open=commande:ID) : ouvre la commande après connexion', async () => {
    const { page, context, errors } = await openApp(browser, { width: 1440, height: 1100, hash: '#open=commande:c1' });
    await login(page, EMAILS.patron);
    await page.waitForFunction(() => { const h = document.querySelector('#main-content h1'); const sub = document.querySelector('#main-content .ui-sub'); return h && h.textContent === 'Client Un' && sub && /CMD-001/.test(sub.textContent); }, null, { timeout: 20000 });
    await page.waitForTimeout(1500);
    assert.match(await page.locator('#main-content').textContent(), /CMD-001/);
    assert.equal(await page.evaluate(() => location.hash), '');
    assert.deepEqual(errors, []);
    await context.close();
  });
});
