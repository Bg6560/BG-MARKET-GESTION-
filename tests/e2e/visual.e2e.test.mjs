// Rendu de l'interface (données FICTIVES) : thèmes clair/sombre, téléphone/ordinateur, graphique, aucun débordement horizontal.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { launch, openApp, login, clearAll, authSignUp, loadRules } from './harness.mjs';

const SHOT = (n) => new URL(`./shots/${n}.png`, import.meta.url).pathname;
const EMAILS = { patron: 'bgmarket99@gmail.com', emp: 'emp@test.local' };
const U = {};
let browser, env;
const now = new Date();
const at = (mBack, d) => Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth() - mBack, Math.min(d, 28), 11));

before(async () => {
  await clearAll();
  for (const [k, e] of Object.entries(EMAILS)) U[k] = await authSignUp(e);
  env = await loadRules(U.patron);
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users', U.patron), { uid: U.patron, email: EMAILS.patron, nom: 'Patron Démo', role: 'admin', statut: 'actif' });
    await setDoc(doc(db, 'users', U.emp), { uid: U.emp, email: EMAILS.emp, nom: 'Vendeur Démo', role: 'employe', statut: 'actif' });
    await setDoc(doc(db, 'app_config', 'settings'), { invNumR: 40, stockAlerte: 2, objectifMois: 3000000, bizName: 'Boutique Démo' });
    // ventes fictives sur 6 mois, dont une facture sans prix d'achat
    const ventes = [[5, 3, 420000, 60000], [5, 18, 310000, 45000], [4, 6, 520000, 80000], [4, 22, 260000, 30000], [3, 9, 610000, 95000], [2, 4, 480000, 70000], [2, 20, 390000, -15000], [1, 11, 720000, 120000], [1, 25, 350000, 50000], [0, 2, 540000, 90000], [0, Math.max(1, now.getDate() - 1), 280000, null]];
    let i = 0;
    for (const [m, d, total, profit] of ventes) {
      const id = 'f' + (++i), uid = i % 2 ? U.emp : U.patron;
      await setDoc(doc(db, 'factures', id), { uid, vendeur: i % 2 ? 'Vendeur Démo' : 'Patron Démo', num: 'FAC-' + (100 + i), client: 'Client démo ' + i, total, ts: at(m, d), validation: 'validee', statut: 'payee', products: [{ name: 'Téléphone démo', qty: 1, price: total }] });
      if (profit !== null) await setDoc(doc(db, 'factures_couts', id), { uid, ts: at(m, d), cost: total - profit, profit, costs: [total - profit] });
    }
    await setDoc(doc(db, 'commandes', 'c1'), { uid: U.emp, vendeur: 'Vendeur Démo', num: 'CMD-201', client: 'Client démo A', produit: 'Téléphone démo X', produits: [{ name: 'Téléphone démo X', qty: 1, prix: 250000 }], total: 250000, statut: 'en_attente', ts: at(0, 1) });
    await setDoc(doc(db, 'produits', 'p1'), { marque: 'Marque démo', modele: 'Modèle A', stockage: '128 GB', prixVente: 250000, quantite: 1 });
    await setDoc(doc(db, 'produits', 'p2'), { marque: 'Marque démo', modele: 'Modèle B', stockage: '256 GB', prixVente: 390000, quantite: 8 });
    await setDoc(doc(db, 'clients', 'k1'), { nom: 'Client démo A', tel: '0100000001', uid: U.emp, ts: at(0, 1) });
  });
  browser = await launch();
});
after(async () => { await browser?.close(); await env?.cleanup(); });

async function session(email, viewport, theme) {
  const s = await openApp(browser, viewport);
  await s.page.evaluate((t) => { localStorage.setItem('bg_theme', t); document.documentElement.setAttribute('data-theme', t); }, theme);
  await login(s.page, email);
  await s.page.waitForSelector('#main-content .dsk-hello', { timeout: 25000 });
  await s.page.waitForFunction(() => !document.querySelector('#main-content .dsk-skel'), null, { timeout: 25000 });
  await s.page.waitForTimeout(1300);
  return s;
}
const overflowX = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

describe('Interface : rendu et graphique', () => {
  it('patron, ordinateur, thème sombre : colonnes + courbe, infobulle exacte, bénéfice signalé incomplet', async () => {
    const { page, context, errors } = await session(EMAILS.patron, { width: 1440, height: 1300 }, 'dark');
    assert.equal(await page.evaluate(() => document.documentElement.getAttribute('data-theme')), 'dark');
    assert.equal(await page.locator('.dskc-bar.t').count(), 6, 'une colonne par mois');
    assert.equal(await page.locator('.dskc-line').count(), 1, 'courbe du bénéfice');
    // mois en cours : 540 000 + 280 000 ; bénéfice 90 000 (la facture sans prix d'achat n'est pas comptée)
    await page.locator('.dskc-hit').last().hover();
    const tip = await page.locator('#dskc-tip').textContent();
    assert.match(tip, /820[\s  ]000 F/);
    assert.match(tip, /\+90[\s  ]000 F/);
    assert.match(tip, /1 sans prix d'achat/);
    assert.match(await page.locator('#dskc-note').textContent(), /1 facture sans prix d'achat/);
    await page.screenshot({ path: SHOT('v4-dashboard-patron-sombre') });
    await page.evaluate(() => dskcSet('view', 'bars'));
    await page.waitForTimeout(900);
    assert.equal(await page.locator('.dskc-line').count(), 0, 'histogramme : pas de courbe');
    assert.ok(await page.locator('.dskc-bar.o').count() >= 5, 'bénéfice en colonnes orange à côté du chiffre d\'affaires');
    await page.locator('.dskc-panel, .dskc').first().screenshot({ path: SHOT('v4-histogramme-sombre') });
    await page.evaluate(() => dskcSet('period', '30j'));
    assert.equal(await page.locator('.dskc-hit').count(), 30);
    await page.evaluate(() => { dskcSet('view', 'combo'); dskcSet('period', '6m'); });
    assert.deepEqual(errors, []);
    await context.close();
  });

  it('patron, téléphone, thème clair puis sombre : aucun débordement horizontal', async () => {
    const { page, context, errors } = await session(EMAILS.patron, { width: 390, height: 2200 }, 'light');
    assert.ok(await overflowX(page) <= 0, 'tableau de bord sans défilement horizontal');
    await page.screenshot({ path: SHOT('v4-dashboard-patron-mobile-clair') });
    await page.evaluate(() => toggleTheme());
    await page.waitForTimeout(500);
    await page.screenshot({ path: SHOT('v4-dashboard-patron-mobile-sombre') });
    for (const tab of ['commandes', 'factures', 'clients', 'produits', 'precommandes', 'sav', 'fournisseurs', 'historique', 'parametres', 'equipe']) {
      await page.evaluate((t) => goTab(t), tab);
      await page.waitForTimeout(900);
      assert.ok(await overflowX(page) <= 0, 'débordement horizontal : ' + tab);
      if (tab === 'commandes' || tab === 'produits') await page.screenshot({ path: SHOT('v4-' + tab + '-mobile-sombre') });
    }
    assert.deepEqual(errors, []);
    await context.close();
  });

  it('employé, téléphone : ses ventes seulement, aucun bénéfice dans le graphique', async () => {
    const { page, context } = await session(EMAILS.emp, { width: 390, height: 1900 }, 'dark');
    assert.equal(await page.locator('.dskc-line').count(), 0);
    assert.match(await page.locator('.dskc h2').textContent(), /mes ventes/i);
    assert.doesNotMatch(await page.locator('.dskc').textContent(), /Bénéfice/);
    await page.locator('.dskc-hit').last().click();
    assert.doesNotMatch(await page.locator('#dskc-tip').textContent(), /Bénéfice/);
    assert.ok(await overflowX(page) <= 0);
    await page.screenshot({ path: SHOT('v4-dashboard-employe-mobile-sombre') });
    await context.close();
  });

  it('produits : plus d\'ajout de photo ; une photo déjà enregistrée est conservée ; icône générique affichée', async () => {
    const { page, context, errors } = await session(EMAILS.patron, { width: 1440, height: 1300 }, 'dark');
    const { doc, setDoc, getDoc } = await import('firebase/firestore');
    await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'produits', 'ph1'), { marque: 'Marque démo', modele: 'Modèle avec photo', prixVente: 120000, quantite: 4, photo: 'data:image/jpeg;base64,AAAA' }));
    await page.evaluate(() => openNvProd());
    await page.waitForSelector('#pr-modele');
    assert.equal(await page.locator('#pr-photo-inp').count(), 0, 'aucun champ photo dans le formulaire');
    assert.doesNotMatch(await page.locator('#main-content').textContent(), /Photo du produit|Choisir une photo/);
    /* modifier un produit qui a déjà une photo : la photo reste dans les données */
    await page.evaluate(() => viewProd('ph1'));
    await page.waitForSelector('.pr-hero .pr-kind svg');
    assert.equal(await page.locator('.pr-hero [style*="background-image"]').count(), 0, 'la photo n\'est plus chargée');
    assert.match(await page.locator('.pr-hero .pr-kind').getAttribute('aria-label'), /Téléphone/);
    await page.evaluate(() => editProd('ph1'));
    await page.waitForSelector('#pr-modele');
    await page.fill('#pr-vente', '125000');
    await page.evaluate(() => saveProd('ph1'));
    await page.waitForTimeout(1500);
    let d = null;
    await env.withSecurityRulesDisabled(async (ctx) => { d = (await getDoc(doc(ctx.firestore(), 'produits', 'ph1'))).data(); });
    assert.equal(d.prixVente, 125000);
    assert.equal(d.photo, 'data:image/jpeg;base64,AAAA', 'photo existante conservée');
    assert.deepEqual(errors, []);
    await context.close();
  });

});
