// Galerie de rendu (données FICTIVES) : chaque section et fiche, thèmes sombre et clair, ordinateur et téléphone.
// Vérifie l'absence de débordement horizontal et d'erreur ; les captures servent à la relecture visuelle.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { launch, openApp, login, clearAll, authSignUp, loadRules } from './harness.mjs';

const SHOT = (n) => new URL(`./shots/gallery/${n}.png`, import.meta.url).pathname;
const EMAILS = { patron: 'bgmarket99@gmail.com', emp: 'emp@test.local' };
const U = {};
let browser, env;
const now = new Date();
const at = (mBack, d, h = 11) => Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth() - mBack, Math.min(d, 28), h));

before(async () => {
  await clearAll();
  for (const [k, e] of Object.entries(EMAILS)) U[k] = await authSignUp(e);
  env = await loadRules(U.patron);
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users', U.patron), { uid: U.patron, email: EMAILS.patron, nom: 'Patron Démo', role: 'admin', statut: 'actif' });
    await setDoc(doc(db, 'users', U.emp), { uid: U.emp, email: EMAILS.emp, nom: 'Vendeur Démo', role: 'employe', statut: 'actif' });
    await setDoc(doc(db, 'users', 'att1'), { uid: 'att1', email: 'nouveau@test.local', nom: 'Recrue Démo', role: 'employe', statut: 'en_attente' });
    await setDoc(doc(db, 'app_config', 'settings'), { invNumR: 40, stockAlerte: 2, objectifMois: 3000000, bizName: 'Boutique Démo', validationFactures: true });
    const prods = ['Samsung Galaxy A15 128GB', 'Xiaomi Redmi 13C 256GB', 'iPhone 13 128GB', 'Tecno Spark 20 128GB', 'Honor X8 128GB'];
    const ventes = [[5, 3, 0, 420000, 60000], [4, 6, 1, 520000, 80000], [3, 9, 2, 610000, 95000], [2, 4, 3, 480000, 70000], [1, 11, 0, 720000, 120000], [1, 25, 4, 350000, 50000], [0, 2, 0, 540000, 90000], [0, 5, 1, 310000, 40000], [0, Math.max(1, now.getDate() - 1), 2, 280000, null]];
    let i = 0;
    for (const [m, d, pi, total, profit] of ventes) {
      const id = 'f' + (++i), uid = i % 2 ? U.emp : U.patron;
      await setDoc(doc(db, 'factures', id), { uid, vendeur: i % 2 ? 'Vendeur Démo' : 'Patron Démo', num: 'FAC-' + (100 + i), client: 'Client démo ' + i, tel: '01000000' + (10 + i), total, ts: at(m, d), date: '01/10/2026', validation: 'validee', statut: 'payee', products: [{ name: prods[pi], qty: 1, price: total }] });
      if (profit !== null) await setDoc(doc(db, 'factures_couts', id), { uid, ts: at(m, d), cost: total - profit, profit, costs: [total - profit] });
    }
    await setDoc(doc(db, 'factures', 'fp'), { uid: U.emp, vendeur: 'Vendeur Démo', num: 'FAC-150', client: 'Client à valider', total: 99000, ts: at(0, 3), validation: 'a_valider', statut: 'en_attente', products: [{ name: prods[3], qty: 1, price: 99000 }] });
    await setDoc(doc(db, 'commandes', 'c1'), { uid: U.emp, vendeur: 'Vendeur Démo', num: 'CMD-201', client: 'Client démo A', tel: '0100000001', produit: prods[0], produits: [{ name: prods[0], qty: 1, prix: 250000, stockage: '128GB' }], total: 250000, statut: 'en_attente', ts: at(0, 4) });
    await setDoc(doc(db, 'commandes', 'c2'), { uid: U.patron, vendeur: 'Patron Démo', num: 'CMD-202', client: 'Client démo B', tel: '0100000002', produit: prods[2], produits: [{ name: prods[2], qty: 2, prix: 450000 }], total: 900000, statut: 'validee', ts: at(0, 3) });
    await setDoc(doc(db, 'produits', 'p1'), { marque: 'Samsung', modele: 'Galaxy A15', stockage: '128 GB', ram: '4 GB', prixVente: 100000, quantite: 1 });
    await setDoc(doc(db, 'produits', 'p2'), { marque: 'Xiaomi', modele: 'Redmi 13C', stockage: '256 GB', prixVente: 85000, quantite: 8 });
    await setDoc(doc(db, 'produits', 'p3'), { marque: 'Apple', modele: 'iPhone 13', stockage: '128 GB', prixVente: 450000, quantite: 0 });
    await setDoc(doc(db, 'produits_prive', 'p1'), { prixAchat: 80000 });
    await setDoc(doc(db, 'clients', 'k1'), { nom: 'Client démo A', tel: '0100000001', uid: U.emp, ts: at(0, 4) });
    await setDoc(doc(db, 'clients', 'k2'), { nom: 'Client démo B', tel: '0100000002', uid: U.patron, ts: at(0, 3) });
    await setDoc(doc(db, 'precommandes', 'r1'), { uid: U.emp, vendeur: 'Vendeur Démo', client: 'Client démo C', tel: '0100000003', produit: 'iPhone 15 Pro', prixTotal: 650000, acompte: 200000, versements: [], statut: 'acompte', ts: at(0, 2) });
    await setDoc(doc(db, 'sav', 's1'), { uid: U.emp, vendeur: 'Vendeur Démo', client: 'Client démo D', tel: '0100000004', produit: 'Tecno Spark 20', panne: 'Écran cassé', statut: 'en_reparation', ts: at(0, 2) });
    await setDoc(doc(db, 'fournisseurs', 'F1'), { nom: 'Fournisseur Démo', whatsapp: '0100000009', ville: 'Abidjan', specialite: 'Samsung' });
    await setDoc(doc(db, 'catalogue_fournisseurs', 'F1_a15'), { fournisseurId: 'F1', fournisseurNom: 'Fournisseur Démo', nom: 'Samsung A15 128GB', prixAchat: 82000, devise: 'FCFA', majAt: at(0, 3) });
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
  await s.page.waitForTimeout(1400);
  return s;
}
const VUES = [
  ['dashboard', "goTab('dashboard')"], ['commandes', "goTab('commandes')"], ['commande-fiche', "viewCmd('c1')"], ['commande-nouvelle', 'openNvCmd()'],
  ['factures', "goTab('factures')"], ['facture-fiche', "viewFacture('f1')"], ['facture-nouvelle', 'openNvFac()'],
  ['precommandes', "goTab('precommandes')"], ['clients', "goTab('clients')"], ['client-fiche', "viewClient('k1')"],
  ['produits', "goTab('produits')"], ['produit-fiche', "viewProd('p1')"], ['sav', "goTab('sav')"],
  ['fournisseurs', "goTab('fournisseurs')"], ['fournisseur-fiche', "viewFourn('F1')"], ['import', "CF.fid='F1';CF.fnom='Fournisseur Démo';cfOpenImport('F1')"],
  ['comparer', "goTab('fournisseurs');setTimeout(function(){showFournTab('compare')},300)"], ['equipe', "goTab('equipe')"], ['historique', "goTab('historique')"],
  ['reglages', "goTab('parametres')"], ['reglages-notifs', "uiSettings('notifications')"], ['menu-creer', "goTab('dashboard');setTimeout(function(){v2Toggle('create')},400)"], ['menu-plus', "goTab('dashboard');setTimeout(function(){v2Toggle('more')},400)"],
];
async function tour(page, prefix, vues, check) {
  for (const [nom, js] of vues) {
    await page.evaluate((c) => { window.scrollTo(0, 0); (0, eval)(c); }, js);
    await page.waitForTimeout(nom === 'dashboard' ? 1800 : 1200);
    const ov = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check.push([nom, ov]);
    await page.screenshot({ path: SHOT(prefix + '-' + nom) });
    await page.evaluate(() => { try { document.body.classList.remove('v2-sheet-create', 'v2-sheet-more'); } catch (e) {} });
  }
}
describe('Galerie', () => {
  it('page de connexion : sombre et clair, ordinateur et téléphone, onglet inscription', async () => {
    for (const [nom, vp] of [['pc', { width: 1440, height: 900 }], ['tel', { width: 390, height: 844 }]]) {
      for (const theme of ['dark', 'light']) {
        const s = await openApp(browser, vp);
        await s.page.evaluate((t) => { localStorage.setItem('bg_theme', t); document.documentElement.setAttribute('data-theme', t); }, theme);
        await s.page.waitForSelector('#l-email', { state: 'visible' });
        await s.page.waitForTimeout(1200);
        assert.ok(await s.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth) <= 0);
        await s.page.screenshot({ path: SHOT(`${nom}-${theme}-connexion`) });
        if (nom === 'tel') { await s.page.evaluate(() => switchAuthTab('signup')); await s.page.waitForTimeout(500); await s.page.screenshot({ path: SHOT(`${nom}-${theme}-inscription`) }); }
        assert.deepEqual(s.errors, []);
        await s.context.close();
      }
    }
  });
  for (const [nom, vp] of [['pc', { width: 1440, height: 1000 }], ['tel', { width: 390, height: 860 }]]) {
    for (const theme of ['dark', 'light']) {
      it(`patron · ${nom} · ${theme}`, async () => {
        const { page, context, errors } = await session(EMAILS.patron, vp, theme);
        const check = [];
        await tour(page, `${nom}-${theme}`, theme === 'light' && nom === 'pc' ? VUES.filter((v) => /dashboard|commandes$|produit-fiche|import|reglages$|facture-nouvelle/.test(v[0])) : VUES, check);
        const bad = check.filter((c) => c[1] > 0);
        assert.deepEqual(bad, [], 'débordement horizontal');
        assert.deepEqual(errors, []);
        await context.close();
      });
    }
  }
  it('employé · téléphone · sombre', async () => {
    const { page, context, errors } = await session(EMAILS.emp, { width: 390, height: 860 }, 'dark');
    const check = [];
    await tour(page, 'tel-emp', VUES.filter((v) => /^(dashboard|commandes|commande-nouvelle|factures|clients|produits|reglages)$/.test(v[0])), check);
    assert.deepEqual(check.filter((c) => c[1] > 0), []);
    assert.deepEqual(errors, []);
    await context.close();
  });
});
