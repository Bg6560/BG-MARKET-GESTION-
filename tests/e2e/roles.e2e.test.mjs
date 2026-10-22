// Bout en bout : trois rôles, interface ordinateur et mobile, règles Firestore réelles (émulateur), données fictives.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { doc, setDoc, Timestamp, getDocs, collection } from 'firebase/firestore';
import { launch, openApp, login, clearAll, authSignUp, loadRules } from './harness.mjs';

const SHOT = (n) => new URL(`./shots/${n}.png`, import.meta.url).pathname;
const EMAILS = { patron: 'bgmarket99@gmail.com', admin: 'admin1@test.local', adminNoCouts: 'admin2@test.local', empA: 'empa@test.local', empB: 'empb@test.local' };
const U = {};
let browser, env;
const now = new Date();
const day = (back) => Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth(), Math.max(1, now.getDate() - back), 11));
const lastMonth = Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth() - 1, 12, 11));

before(async () => {
  await clearAll();
  for (const [k, e] of Object.entries(EMAILS)) U[k] = await authSignUp(e);
  env = await loadRules(U.patron);
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const prof = (k, extra) => setDoc(doc(db, 'users', U[k]), { uid: U[k], email: EMAILS[k], nom: { patron: 'Patron Test', admin: 'Admin Un', adminNoCouts: 'Admin Deux', empA: 'Awa Employée', empB: 'Boris Employé' }[k], statut: 'actif', ...extra });
    await prof('patron', { role: 'admin' });
    await prof('admin', { role: 'administrateur', perms: { couts: true, suppr: false, reglages: true, totaux: true } });
    await prof('adminNoCouts', { role: 'administrateur', perms: { couts: false, suppr: false, reglages: true, totaux: false } });
    await prof('empA', { role: 'employe' });
    await prof('empB', { role: 'employe' });
    await setDoc(doc(db, 'users', 'attente1'), { uid: 'attente1', email: 'nouveau@test.local', nom: 'Nouvelle Recrue', role: 'employe', statut: 'en_attente' });
    await setDoc(doc(db, 'app_config', 'settings'), { validationFactures: true, invNumR: 5, stockAlerte: 2, objectifMois: 500000, objectifEmploye: 200000, bizName: 'Boutique Test' });
    const fac = (id, uid, v, total, profit, ts, validation = 'validee') => Promise.all([
      setDoc(doc(db, 'factures', id), { uid, vendeur: v, num: 'FAC-' + id, client: 'Client ' + id, total, ts, date: '2026-10-01', statut: 'en_attente', validation, products: [{ name: 'Phone Test', qty: 1, price: total }] }),
      setDoc(doc(db, 'factures_couts', id), { uid, ts, cost: total - profit, profit, costs: [total - profit] }),
    ]);
    await fac('001', U.empA, 'Awa Employée', 100000, 20000, day(1));
    await fac('002', U.empB, 'Boris Employé', 50000, 10000, day(0));
    await fac('003', U.empA, 'Awa Employée', 30000, 5000, day(0), 'a_valider');
    await fac('000', U.empA, 'Awa Employée', 80000, 16000, lastMonth);
    await setDoc(doc(db, 'commandes', 'c1'), { uid: U.empA, vendeur: 'Awa Employée', num: 'CMD-001', client: 'Client Un', produit: 'Phone Test', produits: [{ name: 'Phone Test', qty: 1, prix: 100000 }], total: 100000, statut: 'en_attente', ts: day(0) });
    await setDoc(doc(db, 'commandes_couts', 'c1'), { uid: U.empA, ts: day(0), coutCatalogue: 80000, profit: 20000, costs: [80000] });
    await setDoc(doc(db, 'commandes', 'c2'), { uid: U.empB, vendeur: 'Boris Employé', num: 'CMD-002', client: 'Client Deux', produit: 'Autre Phone', produits: [{ name: 'Autre Phone', qty: 1, prix: 50000 }], total: 50000, statut: 'validee', ts: day(2) });
    await setDoc(doc(db, 'clients', 'cl1'), { nom: 'Client Un', tel: '0100000001', uid: U.empA, ts: day(1) });
    await setDoc(doc(db, 'clients', 'cl2'), { nom: 'Client Deux', tel: '0100000002', uid: U.empB, ts: day(1) });
    await setDoc(doc(db, 'clients', 'cl3'), { nom: 'Client sans propriétaire', tel: '0100000003' });
    await setDoc(doc(db, 'fournisseurs', 'f1'), { nom: 'Fournisseur Secret', whatsapp: '0100000009' });
    await setDoc(doc(db, 'produits', 'p1'), { marque: 'Marque', modele: 'Phone Test', stockage: '128 GB', prixVente: 100000, quantite: 1 });
    await setDoc(doc(db, 'produits', 'p2'), { marque: 'Marque', modele: 'Autre Phone', stockage: '64 GB', prixVente: 50000, quantite: 9 });
    await setDoc(doc(db, 'produits_prive', 'p1'), { prixAchat: 80000 });
  });
  browser = await launch();
});
after(async () => { await browser?.close(); await env?.cleanup(); });

async function session(email, viewport = { width: 1440, height: 1500 }) {
  const s = await openApp(browser, viewport);
  await login(s.page, email);
  await s.page.waitForSelector('#main-content .dsk-hello', { timeout: 25000 });
  await s.page.waitForFunction(() => !document.querySelector('#main-content .dsk-skel'), null, { timeout: 25000 });
  return s;
}
const shot = async (page, name, opts = {}) => { await page.waitForFunction(() => !document.querySelector('#main-content .dsk-skel'), null, { timeout: 15000 }); await page.waitForTimeout(500); await page.screenshot({ path: SHOT(name), ...opts }); };
const text = (page) => page.locator('#main-content').textContent();

describe('Tableaux de bord : un par rôle (ordinateur)', () => {
  it('patron : chiffres, bénéfices, performance des employés, comptes en attente, stock', async () => {
    const { page, errors, context } = await session(EMAILS.patron);
    const t = await text(page);
    assert.match(t, /Patron/);
    assert.match(t, /Chiffre d.affaires du mois/);
    assert.match(t, /150[\s\u202f\u00a0]000 F/, 'CA du mois = 100 000 + 50 000 (la facture à valider n\'est pas comptée)');
    assert.match(t, /Bénéfice du mois/);
    assert.match(t, /\+30[\s\u202f\u00a0]000 F/);
    assert.match(t, /Performance des employés/);
    assert.match(t, /Awa Employée/);
    assert.match(t, /Boris Employé/);
    assert.match(t, /Comptes en attente/);
    assert.match(t, /Nouvelle Recrue/);
    assert.match(t, /État du stock/);
    assert.match(t, /Phone Test/, 'stock bas listé');
    /* tableau de bord compact */
    assert.doesNotMatch(t, /Voici un résumé|Par marque, d'après/);
    assert.ok(await page.locator('.dsk-top li').count() <= 3, '3 meilleurs produits au plus');
    assert.ok(await page.locator('.dsk-act-i').count() <= 5, '5 activités au plus');
    assert.match(t, /en rupture/);
    assert.equal(await page.evaluate(() => [...document.querySelectorAll('.dsk-chip')].every((c) => c.tagName === 'SPAN' && getComputedStyle(c).cursor !== 'pointer')), true, '« Ce mois » n\'a pas l\'air d\'un bouton');
    /* menu rétractable : masqué par défaut, s'ouvre par-dessus sans déplacer le contenu, se ferme (Échap, clic à côté, choix) */
    assert.equal(await page.locator('#dsk-nav').isVisible(), false);
    const x0 = (await page.locator('#main-content').boundingBox()).x;
    await page.click('#dsk-menu');
    await page.waitForFunction(() => getComputedStyle(document.getElementById('dsk-nav')).transform === 'none');
    assert.equal(await page.locator('#dsk-nav').isVisible(), true);
    assert.equal((await page.locator('#main-content').boundingBox()).x, x0, 'le contenu ne bouge pas');
    const navTxt = await page.locator('#dsk-nav').textContent();
    assert.match(navTxt, /Équipe/);
    for (const re of [/Fournisseurs/, /Produits/, /Historique/, /Précommandes/, /SAV/]) assert.match(navTxt, re);
    assert.doesNotMatch(navTxt, /Prix et marges|Importation|Rapports|Stock(?! )/, 'raccourcis redondants retirés');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.body.classList.contains('nav-open'));
    await page.click('#dsk-menu');
    await page.mouse.click(1300, 600);
    await page.waitForFunction(() => !document.body.classList.contains('nav-open'));
    await page.click('#dsk-menu');
    await page.click('#dsk-nav [data-tab="produits"]');
    await page.waitForFunction(() => !document.body.classList.contains('nav-open') && /Produits/.test(document.querySelector('#main-content h1')?.textContent || ''));
    await page.evaluate(() => goTab('dashboard'));
    await page.waitForSelector('#main-content .dsk-hello', { timeout: 15000 });
    await shot(page, 'dashboard-patron-desktop');
    assert.deepEqual(errors, []);
    await context.close();
  });
  it('administrateur avec « couts » : opérationnel, bénéfices visibles, pas de performance des employés', async () => {
    const { page, errors, context } = await session(EMAILS.admin);
    const t = await text(page);
    assert.match(t, /Administrateur/);
    assert.match(t, /Commandes en attente/);
    assert.match(t, /Factures à valider/);
    assert.match(t, /Bénéfice du mois/);
    assert.doesNotMatch(t, /Performance des employés/);
    assert.doesNotMatch(t, /Comptes en attente/);
    assert.doesNotMatch(await page.locator('#dsk-nav').textContent(), /Équipe/);
    await shot(page, 'dashboard-admin-desktop');
    assert.deepEqual(errors, []);
    await context.close();
  });
  it('administrateur sans « couts » : aucun bénéfice, aucun coût', async () => {
    const { page, errors, context } = await session(EMAILS.adminNoCouts);
    const t = await text(page);
    assert.doesNotMatch(t, /Bénéfice/);
    assert.match(t, /Commandes en attente/);
    await page.goto('http://localhost:5173/index.html');
    assert.deepEqual(errors, []);
    await context.close();
  });
  it('employé : seulement ses ventes, ses clients, aucun bénéfice', async () => {
    const { page, errors, context } = await session(EMAILS.empA);
    const t = await text(page);
    assert.match(t, /Employé/);
    assert.match(t, /Mes ventes du mois/);
    assert.match(t, /100[\s\u202f\u00a0]000 F/, 'ses ventes : 100 000 (la facture de Boris ne compte pas)');
    assert.doesNotMatch(t, /150[\s\u202f\u00a0]000/);
    assert.doesNotMatch(t, /Bénéfice/);
    assert.doesNotMatch(t, /Boris|Performance|Comptes en attente|Fournisseur Secret/);
    const nav = await page.locator('#dsk-nav').textContent();
    assert.doesNotMatch(nav, /Fournisseurs|Équipe/);
    await shot(page, 'dashboard-employe-desktop');
    assert.deepEqual(errors, []);
    await context.close();
  });
});

describe('Listes en tableaux et accès aux données (ordinateur)', () => {
  it('employé : ses clients seulement (cartes), pas de fournisseur', async () => {
    const { page, context } = await session(EMAILS.empA);
    await page.click('#dsk-menu'); await page.click('#dsk-nav [data-tab=\"clients\"]');
    await page.waitForSelector('.dc-grid', { timeout: 15000 });
    const t = await text(page);
    assert.match(t, /Client Un/);
    assert.doesNotMatch(t, /Client Deux|sans propriétaire/);
    await shot(page, 'clients-employe-desktop');
    await page.evaluate(() => goTab('fournisseurs'));
    await page.waitForTimeout(600);
    assert.doesNotMatch(await text(page), /Fournisseur Secret/);
    await context.close();
  });
  it('patron : tous les clients, cartes des commandes, recherche rapide', async () => {
    const { page, context } = await session(EMAILS.patron);
    await page.click('#dsk-menu'); await page.click('#dsk-nav [data-tab=\"clients\"]');
    await page.waitForSelector('.dc-grid');
    const t = await text(page);
    assert.match(t, /Client Un/); assert.match(t, /Client Deux/); assert.match(t, /sans propriétaire/);
    await page.click('#dsk-menu'); await page.click('#dsk-nav [data-tab=\"commandes\"]');
    await page.waitForSelector('.dc-grid');
    assert.equal(await page.locator('.dc-card').count(), 2);
    await page.fill('#dsk-q', 'Deux');
    await page.waitForTimeout(300);
    assert.equal(await page.locator('.dc-card').count(), 1);
    await shot(page, 'commandes-patron-desktop');
    await context.close();
  });
  it('patron : factures avec bénéfice ; administrateur sans « couts » : colonne absente', async () => {
    let s = await session(EMAILS.patron);
    await s.page.click('#dsk-menu'); await s.page.click('#dsk-nav [data-tab=\"factures\"]');
    await s.page.waitForSelector('.dc-grid');
    assert.match(await s.page.locator('.dc-grid[data-kind="fac"]').textContent(), /Bénéfice/);
    await s.context.close();
    s = await session(EMAILS.adminNoCouts);
    await s.page.click('#dsk-menu'); await s.page.click('#dsk-nav [data-tab=\"factures\"]');
    await s.page.waitForSelector('.dc-grid');
    assert.doesNotMatch(await s.page.locator('.dc-grid[data-kind="fac"]').textContent(), /Bénéfice/);
    await s.context.close();
  });
});

describe('Mobile préservé', () => {
  it('employé sur téléphone : barre du bas, pas de navigation latérale, tableau de bord lisible', async () => {
    const { page, errors, context } = await session(EMAILS.empA, { width: 390, height: 844 });
    assert.equal(await page.locator('#dsk-nav').isVisible(), false);
    assert.equal(await page.locator('.v2-tabbar').isVisible(), true);
    assert.match(await text(page), /Mes ventes du mois/);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(overflow <= 1, 'défilement horizontal : ' + overflow);
    await shot(page, 'dashboard-employe-mobile');
    assert.deepEqual(errors, []);
    await context.close();
  });
});

describe('Approbation des nouveaux comptes (de bout en bout)', () => {
  it('inscription → refus de connexion → approbation par le patron → connexion', async () => {
    const s = await openApp(browser);
    await s.page.waitForSelector('#tab-signup');
    await s.page.click('#tab-signup');
    await s.page.fill('#s-nom', 'Jean Recrue');
    await s.page.fill('#s-email', 'recrue@test.local');
    await s.page.fill('#s-pwd', 'MotDePasse-Test-1');
    await s.page.fill('#s-pwd2', 'MotDePasse-Test-1');
    await s.page.click('#btn-signup');
    await s.page.waitForFunction(() => /approbation/i.test(document.getElementById('l-err').textContent), null, { timeout: 20000 });
    assert.equal(await s.page.evaluate(() => document.getElementById('app-page').style.display), 'none');
    await s.context.close();
    // le patron l'approuve
    let uidRecrue = null;
    await env.withSecurityRulesDisabled(async (ctx) => {
      const snap = await getDocs(collection(ctx.firestore(), 'users'));
      const d = snap.docs.find((x) => x.data().email === 'recrue@test.local');
      assert.equal(d.data().statut, 'en_attente');
      assert.equal(d.data().role, 'employe');
      uidRecrue = d.id;
    });
    const p = await session(EMAILS.patron);
    assert.ok(uidRecrue);
    await p.page.click('#dsk-menu'); await p.page.click('#dsk-nav [data-tab=\"equipe\"]');
    await p.page.click('.ui-row:has-text("Jean Recrue")');
    await p.page.waitForSelector('text=Approuver le compte', { timeout: 8000 });
    await p.page.click('text=Approuver le compte');
    await p.page.waitForTimeout(800);
    await p.context.close();
    const e = await openApp(browser);
    await login(e.page, 'recrue@test.local');
    await e.page.waitForSelector('#main-content .dsk-hello', { timeout: 25000 });
    assert.match(await e.page.locator('#main-content').innerText(), /Jean Recrue|Employé/);
    await e.context.close();
  });
});
