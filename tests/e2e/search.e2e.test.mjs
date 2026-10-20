// Bout en bout : recherche dynamique des produits dans le formulaire de commande et de facture.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { doc, setDoc, getDoc, getDocs, collection } from 'firebase/firestore';
import { launch, openApp, login, clearAll, authSignUp, loadRules } from './harness.mjs';

const EMAILS = { patron: 'bgmarket99@gmail.com', emp: 'emp@test.local' };
const U = {};
let browser, env, out;
const read = (path) => env.withSecurityRulesDisabled(async (ctx) => { const s = await getDoc(doc(ctx.firestore(), path)); out = s.exists() ? s.data() : null; }).then(() => out);

before(async () => {
  await clearAll();
  for (const [k, e] of Object.entries(EMAILS)) U[k] = await authSignUp(e);
  env = await loadRules(U.patron);
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users', U.patron), { uid: U.patron, email: EMAILS.patron, nom: 'Patron', role: 'admin', statut: 'actif' });
    await setDoc(doc(db, 'users', U.emp), { uid: U.emp, email: EMAILS.emp, nom: 'Awa', role: 'employe', statut: 'actif' });
    await setDoc(doc(db, 'app_config', 'settings'), { invNumR: 1, stockAlerte: 2 });
    await setDoc(doc(db, 'produits', 'p1'), { marque: 'Samsung', modele: 'Galaxy A15', stockage: '128 GB', ram: '4 GB', prixVente: 100000, quantite: 3 });
    await setDoc(doc(db, 'produits', 'p2'), { marque: 'Samsung', modele: 'Galaxy A15', stockage: '256 GB', ram: '8 GB', prixVente: 120000, quantite: 0 });
    await setDoc(doc(db, 'produits', 'p3'), { marque: 'Tecno', modele: 'Spark 20', stockage: '128 GB', prixVente: 80000, quantite: 1 });
    await setDoc(doc(db, 'produits_prive', 'p1'), { prixAchat: 80000 });
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
const openCmd = async (page) => {
  await page.evaluate(() => openNvCmd());
  await page.waitForSelector('[id^="cprod-name-"]');
  await page.waitForFunction(() => ORDP.ready);
  return page.evaluate(() => cmdProducts[0].id);
};
const stock = async (id) => (await read('produits/' + id)).quantite;

describe('Formulaire de commande : recherche de produits', () => {
  it('employé : les produits apparaissent pendant la saisie, le choix remplit la fiche, aucun coût', async () => {
    const { page, context, errors } = await session(EMAILS.emp);
    const id = await openCmd(page);
    await page.type('#cprod-name-' + id, 'a15', { delay: 30 });
    await page.waitForSelector('#cprod-sg-' + id + ' .ui-suggest-item');
    const sg = await page.locator('#cprod-sg-' + id).textContent();
    assert.match(sg, /Galaxy A15/);
    assert.match(sg, /3 en stock/);
    assert.match(sg, /Rupture/);
    assert.equal(await page.locator('#cprod-sg-' + id + ' .ui-suggest-item').count(), 2);
    await page.locator('#cprod-sg-' + id + ' .ui-suggest-item').first().click();
    const st = await page.evaluate(() => ({ ...cmdProducts[0] }));
    assert.equal(st.pid, 'p1');
    assert.equal(st.name, 'Samsung Galaxy A15');
    assert.equal(st.stockage, '128GB');
    assert.equal(st.ram, '4GB');
    assert.equal(st.prix, 100000);
    assert.equal(st.cost, 0, 'un employé ne reçoit aucun prix d\'achat');
    assert.equal(await page.locator('#cprod-prix-' + id).inputValue(), '100000');
    assert.match(await page.locator('.ordp-info').first().textContent(), /En stock : 3/);
    assert.deepEqual(errors, []);
    await context.close();
  });

  it('quantité supérieure au stock : avertissement, jamais de blocage ; rupture : « à commander »', async () => {
    const { page, context } = await session(EMAILS.emp);
    const id = await openCmd(page);
    await page.fill('#cprod-name-' + id, 'a15 256');
    await page.locator('#cprod-sg-' + id + ' .ui-suggest-item').first().click();
    assert.match(await page.locator('.ordp-info').first().textContent(), /Hors stock : à commander chez le fournisseur/);
    const id2 = await page.evaluate(() => { addCmdProduct(); return cmdProducts[1].id; });
    await page.fill('#cprod-name-' + id2, 'a15 128');
    await page.locator('#cprod-sg-' + id2 + ' .ui-suggest-item').first().click();
    await page.locator('input[type=number][oninput*="\'qty\'"]').nth(1).fill('5');
    assert.match(await page.locator('.ordp-info').nth(1).textContent(), /Stock insuffisant : 3 disponibles pour 5 demandés/);
    await context.close();
  });

  it('saisie à la main après un choix : le lien avec le produit est retiré (pas de mauvais produit déduit)', async () => {
    const { page, context } = await session(EMAILS.emp);
    const id = await openCmd(page);
    await page.fill('#cprod-name-' + id, 'tecno spark');
    await page.locator('#cprod-sg-' + id + ' .ui-suggest-item').first().click();
    assert.equal(await page.evaluate(() => cmdProducts[0].pid), 'p3');
    await page.fill('#cprod-name-' + id, 'Tecno Spark 30');
    assert.equal(await page.evaluate(() => cmdProducts[0].pid), '', 'le nom a changé : plus de produit lié');
    assert.equal(await page.locator('.ordp-info').first().textContent(), '');
    await page.fill('#cprod-name-' + id, 'zzzz inconnu');
    await page.waitForSelector('#cprod-sg-' + id + ' .ui-suggest-item');
    assert.match(await page.locator('#cprod-sg-' + id).textContent(), /Aucun produit enregistré ne correspond/);
    await context.close();
  });

  it('enregistrer la commande : le produit est mémorisé (pid) et le stock n\'est PAS touché', async () => {
    const { page, context, errors } = await session(EMAILS.emp);
    const id = await openCmd(page);
    await page.fill('#cprod-name-' + id, 'a15 128');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => cmdProducts[0].pid === 'p1');
    await page.fill('#fc-nom', 'Client Recherche');
    await page.fill('#fc-tel', '0100000077');
    await page.evaluate(() => saveCmd());
    await page.waitForFunction(() => /Commande enregistree/.test(document.body.textContent), null, { timeout: 15000 });
    const cmds = await env.withSecurityRulesDisabled(async (ctx) => { const s = await getDocs(collection(ctx.firestore(), 'commandes')); out = s.docs.map((d) => d.data()); }).then(() => out);
    assert.equal(cmds.length, 1);
    assert.equal(cmds[0].produits[0].pid, 'p1');
    assert.equal(cmds[0].produits[0].cost, undefined, 'aucun coût dans le document public');
    assert.equal(await stock('p1'), 3, 'le stock ne bouge pas à la commande');
    assert.deepEqual(errors, []);
    await context.close();
  });

  it('patron (droit coûts) : le prix d\'achat du produit est repris depuis son document privé', async () => {
    const { page, context } = await session(EMAILS.patron);
    const id = await openCmd(page);
    await page.fill('#cprod-name-' + id, 'a15 128');
    await page.locator('#cprod-sg-' + id + ' .ui-suggest-item').first().click();
    await page.waitForFunction(() => cmdProducts[0].cost === 80000, null, { timeout: 8000 });
    assert.equal(await page.locator('#cprod-cost-' + id).inputValue(), '80000');
    await context.close();
  });
});

describe('Formulaire de facture : recherche de produits', () => {
  it('le choix lie la ligne au produit ; la vente déduit le bon produit du stock (seulement le disponible)', async () => {
    const { page, context, errors } = await session(EMAILS.emp);
    await page.evaluate(() => openNvFac());
    await page.waitForSelector('[id^="fl-nm-"]');
    await page.waitForFunction(() => ORDP.ready);
    const lid = await page.evaluate(() => facDraft.lines[0].id);
    await page.fill('#fl-nm-' + lid, 'spark');
    await page.locator('#fl-sg-' + lid + ' .ui-suggest-item').first().click();
    const l = await page.evaluate(() => ({ ...facDraft.lines[0] }));
    assert.equal(l.pid, 'p3');
    assert.equal(l.name, 'Tecno Spark 20 128 GB');
    assert.equal(l.price, 80000);
    await page.locator('input[type=number][oninput*="\'qty\'"]').first().fill('3');
    assert.match(await page.locator('.ordp-info').first().textContent(), /seulement 1 seront déduits du stock/);
    // la déduction (code existant) cible le produit choisi et plafonne au stock disponible
    await page.evaluate(() => stockAfterSale([{ pid: 'p3', name: 'Tecno Spark 20 128 GB', qty: 3 }], 'fac-test', currentUser.uid));
    await page.waitForFunction(() => true);
    await page.waitForTimeout(800);
    assert.equal(await stock('p3'), 0);
    assert.equal(await stock('p1'), 3, 'les autres produits ne bougent pas');
    assert.deepEqual(errors, []);
    await context.close();
  });
});
