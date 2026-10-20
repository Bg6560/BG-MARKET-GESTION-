// Bout en bout : catalogue de téléphones d'un fournisseur (import, doublons, comparaison, protection des prix d'achat).
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { doc, setDoc, getDocs, collection, getDoc } from 'firebase/firestore';
import { launch, openApp, login, clearAll, authSignUp, loadRules } from './harness.mjs';

const EMAILS = { patron: 'bgmarket99@gmail.com', adminCouts: 'admin1@test.local', adminSans: 'admin2@test.local', emp: 'emp@test.local' };
const U = {};
let browser, env;
const LIST = `Samsung Galaxy A15 128 Go ; 85000
Tecno Spark 20 | 128Go | 72 000 F
Infinix Hot 40i - 64 500 F CFA
Nokia C32 64Go ; 45000`;

before(async () => {
  await clearAll();
  for (const [k, e] of Object.entries(EMAILS)) U[k] = await authSignUp(e);
  env = await loadRules(U.patron);
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const prof = (k, extra) => setDoc(doc(db, 'users', U[k]), { uid: U[k], email: EMAILS[k], nom: k, statut: 'actif', ...extra });
    await prof('patron', { role: 'admin' });
    await prof('adminCouts', { role: 'administrateur', perms: { couts: true, suppr: false, reglages: true, totaux: true } });
    await prof('adminSans', { role: 'administrateur', perms: { couts: false, suppr: false, reglages: true, totaux: false } });
    await prof('emp', { role: 'employe' });
    await setDoc(doc(db, 'app_config', 'settings'), { invNumR: 1 });
    await setDoc(doc(db, 'fournisseurs', 'F1'), { nom: 'Alpha Phones', whatsapp: '0100000001' });
    await setDoc(doc(db, 'fournisseurs', 'F2'), { nom: 'Beta Import', whatsapp: '0100000002' });
    await setDoc(doc(db, 'produits', 'p1'), { marque: 'Samsung', modele: 'Galaxy A15', stockage: '128 GB', prixVente: 100000, quantite: 3 });
    await setDoc(doc(db, 'produits', 'p2'), { marque: 'Tecno', modele: 'Spark 20', stockage: '128 GB', quantite: 2 });
    await setDoc(doc(db, 'produits', 'p3'), { marque: 'Oppo', modele: 'A18', stockage: '64 GB', prixVente: 60000, quantite: 1 });
  });
  browser = await launch();
});
after(async () => { await browser?.close(); await env?.cleanup(); });

async function session(email) {
  const s = await openApp(browser, { width: 1440, height: 1500 });
  await login(s.page, email);
  await s.page.waitForSelector('#main-content .dsk-hello', { timeout: 25000 });
  return s;
}
const catalogue = () => env.withSecurityRulesDisabled(async (ctx) => { const s = await getDocs(collection(ctx.firestore(), 'catalogue_fournisseurs')); out = s.docs.map((d) => ({ id: d.id, ...d.data() })); }).then(() => out);
let out;
const fiche = async (page, id) => { await page.evaluate((i) => viewFourn(i), id); await page.waitForFunction(() => document.querySelector('#cf-sec, #main-content .ui-card'), null, { timeout: 10000 }); };
const importer = async (page, fid, text) => {
  await page.evaluate((i) => { CF.fid = i; cfOpenImport(i); }, fid);
  await page.fill('#cf-txt', text);
  await page.evaluate(() => cfAnalyze());
  await page.waitForSelector('#cf-preview button.ui-btn-primary, #cf-preview .ui-note-danger', { timeout: 10000 });
};

describe('Catalogue fournisseur', () => {
  it('patron : importe une liste, voit l\'analyse, enregistre ; les prix sont lisibles sur la fiche', async () => {
    const { page, context, errors } = await session(EMAILS.patron);
    await fiche(page, 'F1');
    await page.waitForFunction(() => /Aucun téléphone enregistré/.test((document.querySelector('#cf-body')||{textContent:''}).textContent), null, { timeout: 10000 });
    await importer(page, 'F1', LIST + '\niPhone 13 128Go');
    const prev = await page.locator('#cf-preview').textContent();
    assert.match(prev, /Nouveaux produits\s*4/);
    assert.match(prev, /Lignes sans prix\s*1/);
    await page.evaluate(() => cfSaveImport());
    await page.waitForFunction(() => document.querySelector('#cf-body') && /Samsung Galaxy A15/.test((document.querySelector('#cf-body')||{textContent:''}).textContent), null, { timeout: 15000 });
    const docs = await catalogue();
    assert.equal(docs.length, 4);
    assert.ok(docs.every((d) => d.fournisseurId === 'F1' && typeof d.prixAchat === 'number' && d.devise === 'FCFA'));
    const t = await page.locator('#cf-body').textContent();
    assert.match(t, /85 000 F/);
    assert.match(t, /aujourd'hui/);
    assert.deepEqual(errors, []);
    await context.close();
  });

  it('réimport de la même liste : aucun doublon ; prix modifié : ancien prix gardé', async () => {
    const { page, context } = await session(EMAILS.patron);
    await fiche(page, 'F1');
    await page.waitForFunction(() => /Samsung Galaxy A15/.test((document.querySelector('#cf-body')||{textContent:''}).textContent), null, { timeout: 10000 });
    await importer(page, 'F1', LIST);
    assert.match(await page.locator('#cf-preview').textContent(), /Prix inchangés\s*4/);
    await page.evaluate(() => cfSaveImport());
    await page.waitForTimeout(800);
    assert.equal((await catalogue()).length, 4, 'toujours 4 documents');
    await importer(page, 'F1', LIST.replace('85000', '83000'));
    assert.match(await page.locator('#cf-preview').textContent(), /Prix modifiés\s*1/);
    assert.match(await page.locator('#cf-preview').textContent(), /baisse de 2 000 F/);
    page.once('dialog', (d) => d.accept()); // confirmation avant remplacement d'un prix existant
    await page.evaluate(() => cfSaveImport());
    await page.waitForFunction(() => /83 000 F/.test((document.querySelector('#cf-body')||{textContent:''}).textContent), null, { timeout: 15000 });
    const a15 = (await catalogue()).find((d) => /A15/.test(d.nom));
    assert.equal(a15.prixAchat, 83000);
    assert.equal(a15.prixPrecedent, 85000);
    assert.equal((await catalogue()).length, 4);
    await context.close();
  });

  it('comparaison entre fournisseurs : meilleur prix, marge brute estimée, alertes', async () => {
    // second fournisseur : moins cher sur le A15, prix ancien (50 jours) sur le Spark
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      const { Timestamp } = await import('firebase/firestore');
      await setDoc(doc(db, 'catalogue_fournisseurs', 'F2_a15'), { fournisseurId: 'F2', fournisseurNom: 'Beta Import', nom: 'Galaxy A15 128GB', cle: 'a15 128gb galaxy', prixAchat: 80000, devise: 'FCFA', majAt: Timestamp.now() });
      await setDoc(doc(db, 'catalogue_fournisseurs', 'F2_spark'), { fournisseurId: 'F2', fournisseurNom: 'Beta Import', nom: 'Tecno Spark 20 128Go', cle: '128gb 20 spark', prixAchat: 69000, devise: 'FCFA', majAt: Timestamp.fromMillis(Date.now() - 50 * 86400000) });
    });
    const { page, context } = await session(EMAILS.patron);
    await page.evaluate(() => { goTab('fournisseurs'); });
    await page.waitForSelector('#tab-compare', { timeout: 10000 });
    await page.evaluate(() => showFournTab('compare'));
    await page.waitForFunction(() => /Marge brute estimée/.test(document.querySelector('#fourn-tab-content').textContent) && !!document.querySelector('#cf-q'), null, { timeout: 15000 });
    const t = await page.locator('#fourn-tab-content').textContent();
    assert.match(t, /Beta Import/);
    assert.match(t, /\+20 000 F \(20 %\)/, 'A15 : 100 000 − 80 000');
    assert.match(t, /Prix de vente absent/, 'Spark 20 : pas de prix de vente');
    assert.match(t, /Prix ancien/);
    assert.match(t, /Produits du stock sans prix fournisseur/);
    assert.match(t, /Oppo A18/);
    await page.screenshot({ path: new URL('./shots/fournisseurs-comparaison.png', import.meta.url).pathname });
    await context.close();
  });

  it('administrateur sans droit « coûts » : aucun prix d\'achat, ni à l\'écran ni dans la base', async () => {
    const { page, context, errors } = await session(EMAILS.adminSans);
    await fiche(page, 'F1');
    const t = await page.locator('#main-content').textContent();
    assert.match(t, /réservés aux personnes autorisées/);
    assert.doesNotMatch(t, /83 000|85 000|72 000/);
    assert.equal(await page.locator('#cf-sec').count(), 0);
    await page.evaluate(() => showFournTab && goTab('fournisseurs'));
    await page.waitForSelector('#tab-compare');
    await page.evaluate(() => showFournTab('compare'));
    await page.waitForFunction(() => /réservés aux personnes autorisées/.test(document.querySelector('#fourn-tab-content').textContent));
    const cat = env.authenticatedContext(U.adminSans).firestore();
    await assert.rejects(getDocs(collection(cat, 'catalogue_fournisseurs')));
    assert.deepEqual(errors, []);
    await context.close();
  });

  it('administrateur avec « coûts » : voit et modifie ; employé : aucun accès', async () => {
    const { page, context } = await session(EMAILS.adminCouts);
    await fiche(page, 'F1');
    await page.waitForFunction(() => /83 000 F/.test((document.querySelector('#cf-body')||{textContent:''}).textContent), null, { timeout: 10000 });
    await context.close();
    const emp = env.authenticatedContext(U.emp).firestore();
    await assert.rejects(getDocs(collection(emp, 'catalogue_fournisseurs')));
    await assert.rejects(setDoc(doc(emp, 'catalogue_fournisseurs', 'x'), { fournisseurId: 'F1', prixAchat: 1 }));
    const s = await openApp(browser, { width: 1440, height: 1000 });
    await login(s.page, EMAILS.emp);
    await s.page.waitForSelector('#main-content .dsk-hello', { timeout: 25000 });
    assert.doesNotMatch(await s.page.locator('#dsk-nav').textContent(), /Fournisseurs/);
    await s.context.close();
  });

  it('catalogue WhatsApp réel sur téléphone : années jamais prises pour des prix, Kazi neuf conservé, rien enregistré avant validation', async () => {
    const CAT = `*SAMSUNG SERIES A*\n\nA14 128gb….50.000\nA16 128….70.000\n\n*KAZI NEUFS*\nHonor 5A ……………12.000\nHUAWEI Y9 2018…………20.000\nY7 Pro 2019 : 30.000\nMotorola G 2025 128GB : 80.000\nGalaxy A05 - 2024\nContact : 07 07 12 34 56`;
    const s = await openApp(browser, { width: 390, height: 2400 });
    await login(s.page, EMAILS.patron);
    await s.page.waitForSelector('#main-content .dsk-hello', { timeout: 25000 });
    const avant = (await catalogue()).length;
    await importer(s.page, 'F2', CAT);
    const t = await s.page.locator('#cf-preview').textContent();
    assert.match(t, /Nouveaux produits\s*6/);
    assert.match(t, /À vérifier\s*1/);
    assert.match(t, /ressemble à une année/);
    assert.match(t, /Lignes ignorées\s*1/);
    assert.doesNotMatch(t, /2 0(18|19|25) F/);
    assert.match(t, /Kazi neuf/);
    assert.equal((await catalogue()).length, avant, 'rien d\'enregistré avant validation');
    await s.page.evaluate(() => { document.querySelectorAll('#cf-preview details').forEach((d) => { d.open = true; }); });
    await s.page.screenshot({ path: new URL('./shots/import-catalogue-mobile.png', import.meta.url).pathname });
    // décocher un produit : il n'est pas enregistré
    await s.page.locator('#cf-preview label:has-text("Honor 5A") input[type=checkbox]').uncheck();
    await s.page.evaluate(() => cfSaveImport());
    await s.page.waitForFunction(() => document.querySelector('#cf-body') && /Honor 5A|Motorola/.test(document.querySelector('#cf-body').textContent), null, { timeout: 15000 });
    const apres = (await catalogue()).filter((d) => d.fournisseurId === 'F2' && d.source === 'import');
    assert.equal(apres.length, 5);
    assert.equal(apres.some((d) => /Honor/.test(d.nom)), false, 'produit décoché : non enregistré');
    const moto = apres.find((d) => /Motorola/.test(d.nom));
    assert.equal(moto.prixAchat, 80000);
    assert.equal(moto.etat, 'kazi neuf');
    assert.equal(moto.stockage, '128GB');
    await s.context.close();
  });
});
