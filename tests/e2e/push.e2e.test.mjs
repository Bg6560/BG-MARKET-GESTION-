// Bout en bout : activation des notifications sur l'appareil, préférences par rôle, retrait à la déconnexion, ouverture par lien.
// Le service FCM n'est pas joignable ici : seul l'obtention du jeton est remplacée ; tout le reste (règles Firestore, écrans) est réel.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { launch, openApp, login, clearAll, authSignUp, loadRules, ORIGIN } from './harness.mjs';

const EMAILS = { patron: 'bgmarket99@gmail.com', admin: 'admin1@test.local', empA: 'empa@test.local' };
const U = {};
let browser, env;
const KEY = 'B' + 'x'.repeat(86);
const read = (path) => env.withSecurityRulesDisabled(async (ctx) => { const s = await getDoc(doc(ctx.firestore(), path)); out = s.exists() ? s.data() : null; }).then(() => out);
let out;

before(async () => {
  await clearAll();
  for (const [k, e] of Object.entries(EMAILS)) U[k] = await authSignUp(e);
  env = await loadRules(U.patron);
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const prof = (k, extra) => setDoc(doc(db, 'users', U[k]), { uid: U[k], email: EMAILS[k], nom: k, statut: 'actif', ...extra });
    await prof('patron', { role: 'admin' });
    await prof('admin', { role: 'administrateur', perms: { couts: false, suppr: false, reglages: true, totaux: false } });
    await prof('empA', { role: 'employe' });
    await setDoc(doc(db, 'app_config', 'settings'), { invNumR: 5, bizName: 'Boutique Test' });
    await setDoc(doc(db, 'commandes', 'c1'), { uid: U.empA, vendeur: 'empA', num: 'CMD-001', client: 'Client Un', produit: 'Phone Test', produits: [{ name: 'Phone Test', qty: 1, prix: 100000 }], total: 100000, statut: 'en_attente', ts: Timestamp.now() });
  });
  browser = await launch();
});
after(async () => { await browser?.close(); await env?.cleanup(); });

async function session(email, opts = {}) {
  const s = await openApp(browser, { width: 1440, height: 1100, permissions: ['notifications'], ...opts });
  await login(s.page, email);
  await s.page.waitForSelector('#main-content .dsk-hello', { timeout: 25000 });
  return s;
}
const openNotifs = async (page) => { await page.evaluate(() => { goTab('parametres'); }); await page.waitForSelector('.st-hero', { timeout: 10000 }); await page.evaluate(() => uiSettings('notifications')); await page.waitForFunction(() => /Cet appareil/.test(document.querySelector('#main-content').textContent)); };
const stubToken = (page, tok) => page.evaluate((t) => { window.pushToken = async () => t; }, tok);

describe('Notifications push : appareil, rôles, déconnexion', () => {
  it('sans clé de configuration : rien ne s\'active et l\'écran l\'explique', async () => {
    const { page, context, errors } = await session(EMAILS.empA);
    await openNotifs(page);
    assert.match(await page.locator('#main-content').textContent(), /Pas encore configurées/);
    await stubToken(page, 'tok-ne-doit-pas-servir');
    await page.evaluate(() => pushEnable());
    await page.waitForTimeout(400);
    assert.equal(await read(`appareils/${U.empA}_${await page.evaluate(() => pushDeviceId())}`), null);
    assert.deepEqual(errors, []);
    await context.close();
  });

  it('patron : enregistre la clé et le seuil ; la clé invalide est refusée', async () => {
    const { page, context } = await session(EMAILS.patron);
    await openNotifs(page);
    await page.fill('#push-vapid', 'pas-une-cle');
    await page.evaluate(() => pushSaveConfig());
    await page.waitForTimeout(300);
    assert.equal((await read('app_config/settings')).fcmVapidKey, undefined);
    await page.fill('#push-vapid', KEY);
    await page.fill('#push-seuil', '500000');
    await page.evaluate(() => pushSaveConfig());
    await page.waitForFunction(() => globalSettings && globalSettings.fcmVapidKey);
    const s = await read('app_config/settings');
    assert.equal(s.fcmVapidKey, KEY);
    assert.equal(s.seuilVenteImportante, 500000);
    await context.close();
  });

  it('employé : active, ne voit que ses 2 types, change une préférence, se déconnecte → appareil retiré', async () => {
    const { page, context, errors } = await session(EMAILS.empA);
    await openNotifs(page);
    await stubToken(page, 'tok-emp');
    await page.evaluate(() => pushEnable());
    await page.waitForFunction(() => /Ce que je reçois/.test(document.querySelector('#main-content').textContent), null, { timeout: 15000 });
    const id = `appareils/${U.empA}_${await page.evaluate(() => pushDeviceId())}`;
    let d = await read(id);
    assert.equal(d.token, 'tok-emp');
    assert.equal(d.uid, U.empA);
    assert.deepEqual(Object.keys(d).sort(), ['creeAt', 'majAt', 'plateforme', 'prefs', 'token', 'uid']);
    const t = await page.locator('#main-content').textContent();
    assert.match(t, /Statut de mes commandes/);
    assert.match(t, /Mon compte approuvé/);
    assert.doesNotMatch(t, /Nouvelles commandes|Ventes importantes|Comptes à approuver|Configuration \(patron\)/);
    await page.evaluate(() => pushToggle('commande.statut'));
    await page.waitForTimeout(600);
    assert.equal((await read(id)).prefs['commande.statut'], false);
    await page.evaluate(() => doLogout());
    await page.waitForSelector('#l-email', { state: 'visible', timeout: 15000 });
    assert.equal(await read(id), null, 'l\'appareil ne reçoit plus rien pour ce compte');
    assert.deepEqual(errors, []);
    await context.close();
  });

  it('administrateur : voit les alertes de gestion mais pas celles du patron', async () => {
    const { page, context } = await session(EMAILS.admin);
    await openNotifs(page);
    await stubToken(page, 'tok-adm');
    await page.evaluate(() => pushEnable());
    await page.waitForFunction(() => /Ce que je reçois/.test(document.querySelector('#main-content').textContent), null, { timeout: 15000 });
    const t = await page.locator('#main-content').textContent();
    assert.match(t, /Nouvelles commandes/);
    assert.match(t, /Factures à valider/);
    assert.match(t, /Stock bas/);
    assert.doesNotMatch(t, /Ventes importantes|Comptes à approuver/);
    await context.close();
  });

  it('un autre appareil ne peut pas lire ni écrire les appareils d\'autrui (règles réelles)', async () => {
    const adminCtx = env.authenticatedContext(U.admin).firestore();
    await assert.rejects(setDoc(doc(adminCtx, 'appareils', `${U.empA}_x`), { uid: U.empA, token: 't', plateforme: 'web', prefs: {} }));
  });

  it('lien de notification : ouvre la commande après connexion (et pas le tableau de bord)', async () => {
    const { page, context, errors } = await openApp(browser, { width: 1440, height: 1100, hash: '#open=commande:c1' });
    await login(page, EMAILS.patron);
    await page.waitForFunction(() => { const h = document.querySelector('#main-content h1'); const sub = document.querySelector('#main-content .ui-sub'); return h && h.textContent === 'Client Un' && sub && /CMD-001/.test(sub.textContent); }, null, { timeout: 20000 });
    await page.waitForTimeout(1500); // le tableau de bord, chargé en parallèle, ne doit pas reprendre la place
    const t = await page.locator('#main-content').textContent();
    assert.match(t, /CMD-001/);
    assert.match(t, /Client Un/);
    assert.equal(await page.evaluate(() => location.hash), '');
    assert.deepEqual(errors, []);
    await context.close();
  });

  it('clic sur la notification quand l\'appli est déjà ouverte : message du service worker', async () => {
    const { page, context } = await session(EMAILS.patron);
    await page.evaluate(() => navigator.serviceWorker.dispatchEvent(new MessageEvent('message', { data: { type: 'bg-open', url: './#open=commande:c1' } })));
    await page.waitForFunction(() => { const h = document.querySelector('#main-content h1'); const sub = document.querySelector('#main-content .ui-sub'); return h && h.textContent === 'Client Un' && sub && /CMD-001/.test(sub.textContent); }, null, { timeout: 15000 });
    assert.match(await page.locator('#main-content').textContent(), /Client Un/);
    await context.close();
  });
});
