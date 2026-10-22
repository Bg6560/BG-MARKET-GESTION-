// Ordinateur : listes en cartes (Commandes, Factures, Clients, Produits), défilement naturel jusqu'au dernier élément,
// tri, actions ; avatar de l'en-tête avec et sans photo ; téléphone inchangé (listes en lignes).
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { launch, openApp, login, clearAll, authSignUp, loadRules } from './harness.mjs';

const EMAILS = { patron: 'bgmarket99@gmail.com', emp: 'emp@test.local' };
const U = {};
let browser, env;
const N = 40;
// image fictive (carré uni généré), pas une vraie photo
const PHOTO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEklEQVR4nGNgYGD4z8DAwMDAAAAJAAH+0q9GAAAAAElFTkSuQmCC';

before(async () => {
  await clearAll();
  for (const [k, e] of Object.entries(EMAILS)) U[k] = await authSignUp(e);
  env = await loadRules(U.patron);
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users', U.patron), { uid: U.patron, email: EMAILS.patron, nom: 'Gérant Démo', role: 'admin', statut: 'actif', photo: PHOTO });
    await setDoc(doc(db, 'users', U.emp), { uid: U.emp, email: EMAILS.emp, nom: 'Vendeur Démo', role: 'employe', statut: 'actif' });
    await setDoc(doc(db, 'app_config', 'settings'), { invNumR: 5, bizName: 'Boutique Test', stockAlerte: 2 });
    for (let i = 1; i <= N; i++) {
      const ts = Timestamp.fromMillis(Date.now() - i * 3600e3), k = String(i).padStart(2, '0');
      await setDoc(doc(db, 'commandes', 'c' + k), { uid: U.emp, vendeur: 'Vendeur Démo', num: 'CMD-' + k, client: 'Client ' + k, tel: '01000000' + k, produits: [{ name: 'Téléphone démo ' + k, qty: 1, prix: 10000 * i }], total: 10000 * i, statut: i % 3 ? 'validee' : 'en_attente', ts });
      await setDoc(doc(db, 'factures', 'f' + k), { uid: U.emp, vendeur: 'Vendeur Démo', num: 'FAC-' + k, client: 'Client ' + k, total: 5000 * i, ts, date: '2026-10-01', statut: 'payee', validation: i === 1 ? 'a_valider' : 'validee', products: [] });
      await setDoc(doc(db, 'clients', 'k' + k), { uid: U.emp, nom: 'Client ' + k, tel: '01000000' + k, ts });
      await setDoc(doc(db, 'produits', 'p' + k), { marque: i % 2 ? 'Samsung' : 'Tecno', modele: 'Modèle ' + k, quantite: i % 5, prixVente: 50000 + i * 1000 });
    }
  });
  browser = await launch();
});
after(async () => { await browser?.close(); await env?.cleanup(); });

async function session(email, vp) {
  const s = await openApp(browser, vp);
  await login(s.page, email);
  await s.page.waitForSelector('#main-content .dsk-hello', { timeout: 25000 });
  return s;
}

describe('Listes en cartes sur ordinateur', () => {
  it('4 sections : cartes en grille, toute la largeur, dernier élément atteint par le défilement de la page', async () => {
    const { page, context, errors } = await session(EMAILS.patron, { width: 1440, height: 900 });
    for (const tab of ['commandes', 'factures', 'clients', 'produits']) {
      await page.evaluate((t) => goTab(t), tab);
      await page.waitForSelector('.dc-grid .dc-card', { timeout: 15000 });
      await page.waitForFunction((n) => document.querySelectorAll('.dc-card').length >= n, N, { timeout: 15000 }); // factures : 39 dans la liste + 1 dans « À valider »
      const r = await page.evaluate(() => {
        const g = document.querySelector('#main-content .dc-grid:not([data-kind="facp"])'), cards = [...g.children];
        const cols = new Set(cards.slice(0, 8).map((c) => Math.round(c.getBoundingClientRect().left))).size;
        let nested = 0; for (let e = g; e && e !== document.body; e = e.parentElement) { const cs = getComputedStyle(e); if (/(auto|scroll|hidden)/.test(cs.overflowY) && e.scrollHeight > e.clientHeight + 4) nested++; }
        const last = cards[cards.length - 1]; window.scrollTo(0, document.documentElement.scrollHeight);
        const b = last.getBoundingClientRect();
        return { cols, nested, table: !!document.querySelector('#main-content table'), w: Math.round(g.getBoundingClientRect().width), lastVisible: b.top >= 0 && b.bottom <= innerHeight, ov: document.documentElement.scrollWidth - innerWidth };
      });
      assert.equal(r.table, false, tab + ' : plus de tableau');
      assert.ok(r.cols >= 3, tab + ' : plusieurs colonnes de cartes (' + r.cols + ')');
      assert.ok(r.w > 1200, tab + ' : toute la largeur (' + r.w + ')');
      assert.equal(r.nested, 0, tab + ' : aucun conteneur à défilement interne');
      assert.ok(r.lastVisible, tab + ' : dernier élément visible en bas de page');
      assert.ok(r.ov <= 0, tab + ' : pas de débordement horizontal');
    }
    assert.deepEqual(errors, []);
    await context.close();
  });

  it('tri, ouverture au clic et au clavier, actions visibles ; montants et bénéfice inchangés', async () => {
    const { page, context, errors } = await session(EMAILS.patron, { width: 1440, height: 900 });
    await page.evaluate(() => goTab('commandes'));
    await page.waitForSelector('.dc-card');
    assert.match(await page.locator('.dc-card').first().textContent(), /Client 01/);
    await page.selectOption('.dc-sort select', 'montant');
    assert.match(await page.locator('.dc-card').first().textContent(), /Client 40.*400[\s  ]000 F/s);
    await page.selectOption('.dc-sort select', 'o');
    await page.locator('.dc-card').first().focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => /CMD-01/.test(document.querySelector('#main-content .ui-sub')?.textContent || ''), null, { timeout: 15000 });
    await page.evaluate(() => goTab('factures'));
    await page.waitForSelector('.dc-card');
    const f = page.locator('.dc-card', { hasText: 'FAC-01' });
    assert.equal(await f.locator('button.ok').count(), 1, 'Valider sur la facture à valider');
    assert.equal(await page.locator('#fac-pend .dc-card').count(), 1, 'bloc « À valider » en cartes');
    assert.doesNotMatch(await page.locator('#fac-pend').textContent(), /Balaie/);
    assert.match(await page.locator('.dc-grid[data-kind="fac"]').textContent(), /Bénéfice/);
    await page.evaluate(() => goTab('clients'));
    await page.waitForSelector('.dc-card');
    assert.ok(await page.locator('.dc-card').first().locator('.dc-acts button').count() >= 1, 'actions client');
    await page.evaluate(() => goTab('produits'));
    await page.waitForSelector('.dc-card');
    await page.selectOption('.dc-sort select', 'stock');
    assert.match(await page.locator('.dc-card').first().locator('.dc-meta').textContent(), /Stock0/);
    assert.deepEqual(errors, []);
    await context.close();
  });

  it('avatar : photo seule (aucune initiale) ; sans photo, l\'initiale reste', async () => {
    let s = await session(EMAILS.patron, { width: 1440, height: 900 });
    let r = await s.page.evaluate(() => { const a = document.querySelector('#dsk-prof .st-ava'); return { txt: a.textContent, bg: a.style.backgroundImage }; });
    assert.equal(r.txt, '', 'pas de « G » par-dessus la photo');
    assert.match(r.bg, /data:image/);
    await s.context.close();
    s = await session(EMAILS.patron, { width: 390, height: 844 });
    r = await s.page.evaluate(() => { const a = document.getElementById('uavatar'); return { txt: a.textContent, bg: a.style.backgroundImage }; });
    assert.equal(r.txt, '');
    assert.match(r.bg, /data:image/);
    await s.context.close();
    s = await session(EMAILS.emp, { width: 390, height: 844 });
    assert.equal(await s.page.evaluate(() => document.getElementById('uavatar').textContent), 'V', 'initiale sans photo');
    await s.context.close();
  });

  it('téléphone : listes inchangées (lignes, pas de grille de cartes)', async () => {
    const { page, context } = await session(EMAILS.patron, { width: 390, height: 844 });
    await page.evaluate(() => goTab('factures'));
    await page.waitForSelector('#main-content .ui-list .fac-row', { timeout: 15000 });
    assert.equal(await page.locator('.dc-grid').count(), 0);
    await context.close();
  });
});
