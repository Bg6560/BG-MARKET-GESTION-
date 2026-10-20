// Vérifications du Lot 2B : coûts, marges et bénéfices séparés des documents publics.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
const app = [...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).pop();

function extractFn(name) {
  const m = new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`).exec(app);
  assert.ok(m, `fonction introuvable : ${name}`);
  let i = app.indexOf('{', m.index), depth = 0;
  for (; i < app.length; i++) {
    const c = app[i];
    if (c === "'" || c === '"' || c === '`') { for (i++; app[i] !== c; i++) if (app[i] === '\\') i++; }
    else if (c === '/' && app[i + 1] === '/') i = app.indexOf('\n', i);
    else if (c === '/' && app[i + 1] === '*') i = app.indexOf('*/', i) + 1;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return app.slice(m.index, i + 1);
  }
  throw new Error('accolades non équilibrées : ' + name);
}
const run = (ctx, code) => vm.runInContext(code, ctx);
const clone = (o) => JSON.parse(JSON.stringify(o));
const TS = 'SERVER_TS';

/* faux Firestore : enregistre les lots d'écritures */
function fakeDb() {
  const log = { batches: [], docs: 0 };
  const db = {
    batch() {
      const ops = [];
      const b = {
        set: (ref, data, opts) => { ops.push({ op: 'set', path: ref.path, data: clone(data), opts }); },
        update: (ref, data) => { ops.push({ op: 'update', path: ref.path, data: clone(data) }); },
        delete: (ref) => { ops.push({ op: 'delete', path: ref.path }); },
        commit: async () => { log.batches.push(ops); },
      };
      return b;
    },
    collection(name) {
      return {
        doc(id) { const i = id || 'auto' + (++log.docs); return { id: i, path: `${name}/${i}` }; },
        where() { return { where() { return this; }, limit() { return this; }, get: async () => ({ empty: false }) }; },
      };
    },
  };
  return { db, log };
}
const costKeys = /cost|profit|benefice|prixAchat|coutCatalogue/i;
const noCostIn = (obj) => !costKeys.test(JSON.stringify(Object.keys(JSON.parse(JSON.stringify(obj)))) + JSON.stringify(obj).replace(/"[^"]*":/g, (k) => k));

describe('Hydratation : qui voit les coûts', () => {
  const code = ['var COUTS={cmd:new Map(),fac:new Map(),prod:new Map(),fourn:new Map()};',
    'function can(k){return perms[k]===true;}',
    extractFn('coutsNoCost'), extractFn('coutsCmd'), extractFn('coutsFac'), extractFn('coutsProd')].join('\n');
  const ctxFor = (isAdmin, perms) => {
    const ctx = vm.createContext({ isAdmin, perms });
    run(ctx, code);
    run(ctx, `COUTS.cmd.set('c1',{coutCatalogue:800,profit:200,costs:[500,300]});
              COUTS.fac.set('f1',{cost:800,profit:200,costs:[800]});
              COUTS.prod.set('p1',{prixAchat:8000});
              COUTS.fourn.set('c1',{fournisseurId:'F1',fournisseurNom:'Fournisseur Test',fournisseurWa:'0100'});`);
    return ctx;
  };
  const cmd = () => ({ id: 'c1', total: 1000, produits: [{ name: 'A', prix: 600, cost: 111 }, { name: 'B', prix: 400, cost: 222 }], coutCatalogue: 9, profit: 9, beneficeCmd: 9, fournisseurNom: 'ancien' });
  it('employé : aucun coût, marge ni fournisseur, même dans les anciens documents', () => {
    const ctx = ctxFor(false, {});
    ctx.c = cmd(); ctx.f = { id: 'f1', total: 1, cost: 5, profit: 5, products: [{ name: 'A', price: 1, cost: 5 }] }; ctx.p = { id: 'p1', prixAchat: 77, prixVente: 1 };
    run(ctx, 'coutsCmd(c);coutsFac(f);coutsProd(p);');
    assert.equal(noCostIn(ctx.c) && !('fournisseurNom' in ctx.c), true);
    assert.equal(ctx.c.produits.every((x) => !('cost' in x)), true);
    assert.equal(noCostIn(ctx.f) && ctx.f.products.every((x) => !('cost' in x)), true);
    assert.equal('prixAchat' in ctx.p, false);
  });
  it('administrateur sans droit « couts » : fournisseur visible, coûts masqués', () => {
    const ctx = ctxFor(true, {});
    ctx.c = cmd(); ctx.p = { id: 'p1', prixAchat: 1 };
    run(ctx, 'coutsCmd(c);coutsProd(p);');
    assert.equal(ctx.c.profit, undefined);
    assert.equal(ctx.c.coutCatalogue, undefined);
    assert.equal(ctx.c.fournisseurNom, 'Fournisseur Test');
    assert.equal('prixAchat' in ctx.p, false);
  });
  it('patron / administrateur avec « couts » : valeurs lues dans les documents privés', () => {
    const ctx = ctxFor(true, { couts: true });
    ctx.c = cmd(); ctx.f = { id: 'f1', products: [{ name: 'A', price: 1 }] }; ctx.p = { id: 'p1' };
    run(ctx, 'coutsCmd(c);coutsFac(f);coutsProd(p);');
    assert.equal(ctx.c.profit, 200);
    assert.deepEqual(ctx.c.produits.map((x) => x.cost), [500, 300]);
    assert.equal(ctx.f.profit, 200);
    assert.equal(ctx.f.products[0].cost, 800);
    assert.equal(ctx.p.prixAchat, 8000);
  });
  it('document ancien sans document privé : valeurs historiques conservées pour qui a le droit', () => {
    const ctx = ctxFor(true, { couts: true });
    ctx.c = { id: 'ancien', produits: [{ name: 'A', cost: 42 }], profit: 7, coutCatalogue: 42 };
    run(ctx, 'coutsCmd(c);');
    assert.equal(ctx.c.profit, 7);
    assert.equal(ctx.c.produits[0].cost, 42);
  });
});

describe('Écritures : aucun coût dans les documents publics', () => {
  it('saveCmd : commande publique sans coût, coûts dans commandes_couts, fournisseur dans commandes_fourn (lot unique)', async () => {
    const { db, log } = fakeDb();
    const els = { 'fc-nom': { value: 'Client Test' }, 'fc-tel': { value: '0100000001' }, 'fc-fourn-id': { value: 'F1', selectedIndex: 0, options: [{ text: 'Fournisseur Test', dataset: { wa: '0100' } }] } };
    const ctx = vm.createContext({
      db, console, Date, Math, parseFloat, parseInt, confirm: () => true,
      firebase: { firestore: { FieldValue: { serverTimestamp: () => TS } } },
      document: { getElementById: (id) => els[id] || null },
      cmdProducts: [{ id: 1, name: 'Phone Test', stockage: '128GB', ram: '--', couleur: '', qty: 2, prix: 100000, cost: 80000 }],
      etatCmd: 'neuf', expOn: false, payMode: 'Cash', pad: (n) => String(n).padStart(3, '0'),
      userProfile: { nom: 'Emp' }, currentUser: { uid: 'empA', email: 'a@test.local' },
      showOv() {}, hideOv() {}, showToast() {}, renderCommandes() {}, cliBaseQuery: () => db.collection('clients'),
    });
    run(ctx, extractFn('coutsNoCost') + '\n' + extractFn('saveCmd'));
    await run(ctx, 'saveCmd()');
    assert.equal(log.batches.length, 1);
    const ops = log.batches[0];
    const pub = ops.find((o) => o.path.startsWith('commandes/'));
    const priv = ops.find((o) => o.path.startsWith('commandes_couts/'));
    const fourn = ops.find((o) => o.path.startsWith('commandes_fourn/'));
    assert.ok(pub && priv && fourn);
    assert.equal(pub.path.split('/')[1], priv.path.split('/')[1], 'même identifiant');
    assert.equal(noCostIn(pub.data), true, 'coûts dans le document public : ' + JSON.stringify(pub.data));
    assert.equal(pub.data.produits[0].cost, undefined);
    assert.equal(pub.data.uid, 'empA');
    assert.equal(priv.data.coutCatalogue, 160000);
    assert.equal(priv.data.profit, 40000);
    assert.deepEqual(priv.data.costs, [80000]);
    assert.equal(priv.data.uid, 'empA');
    assert.equal(fourn.data.fournisseurNom, 'Fournisseur Test');
  });
  it('saveCmd (employé, sans fournisseur) : pas de document fournisseur', async () => {
    const { db, log } = fakeDb();
    const els = { 'fc-nom': { value: 'Client Test' }, 'fc-tel': { value: '0100000001' } };
    const ctx = vm.createContext({
      db, console, Date, Math, parseFloat, parseInt, confirm: () => true,
      firebase: { firestore: { FieldValue: { serverTimestamp: () => TS } } },
      document: { getElementById: (id) => els[id] || null },
      cmdProducts: [{ id: 1, name: 'Phone Test', qty: 1, prix: 50000, cost: 0 }],
      etatCmd: 'neuf', expOn: false, payMode: '', pad: String, userProfile: { nom: 'Emp' }, currentUser: { uid: 'empA', email: 'a@test.local' },
      showOv() {}, hideOv() {}, showToast() {}, renderCommandes() {}, cliBaseQuery: () => db.collection('clients'),
    });
    run(ctx, extractFn('coutsNoCost') + '\n' + extractFn('saveCmd'));
    await run(ctx, 'saveCmd()');
    assert.equal(log.batches[0].some((o) => o.path.startsWith('commandes_fourn/')), false);
    assert.equal(log.batches[0].length, 2);
  });
  it('saveProd : prix d\'achat à part, et seulement avec le droit « couts »', async () => {
    for (const [couts, attendu] of [[true, true], [false, false]]) {
      const { db, log } = fakeDb();
      const vals = { 'pr-marque': 'Marque', 'pr-modele': 'Modèle', 'pr-achat': '80000', 'pr-vente': '100000', 'pr-qte': '3' };
      const ctx = vm.createContext({
        db, console, parseFloat, parseInt, Math, isAdmin: true,
        firebase: { firestore: { FieldValue: { serverTimestamp: () => TS } } },
        document: { getElementById: (id) => (id in vals ? { value: vals[id] } : null) },
        can: () => couts, showOv() {}, hideOv() {}, showToast() {}, renderProduits() {}, viewProd() {}, t: (k) => k,
      });
      run(ctx, extractFn('uiVal') + '\n' + extractFn('saveProd'));
      await run(ctx, "saveProd('')");
      const ops = log.batches[0];
      const pub = ops.find((o) => o.path.startsWith('produits/'));
      assert.equal('prixAchat' in pub.data, false);
      assert.equal(ops.some((o) => o.path.startsWith('produits_prive/')), attendu);
      if (attendu) assert.equal(ops.find((o) => o.path.startsWith('produits_prive/')).data.prixAchat, 80000);
    }
  });
  it('factures (création manuelle et automatique) : aucun champ de coût dans le document public', () => {
    for (const name of ['facSave', 'facAutoFromCmd']) {
      const body = extractFn(name);
      const lit = /var data=\{[\s\S]*?\n  \};/.exec(body);
      assert.ok(lit, 'littéral data introuvable : ' + name);
      assert.doesNotMatch(lit[0], /\bprofit\s*:|\bcost\s*:|coutCatalogue/, name);
      assert.match(body, /factures_couts/, name);
    }
  });
  it('plus aucune création directe de commandes, factures ou produits hors lot', () => {
    for (const col of ['commandes', 'factures', 'produits']) {
      assert.equal(app.includes(`db.collection('${col}').add(`), false, col);
    }
  });
  it('stockAfterSale : décrémentation relative plafonnée au stock, mouvement enregistré, produit déjà à zéro sans erreur', async () => {
    const { db, log } = fakeDb();
    const prods = [{ id: 'p1', nom: 'Phone Alpha', quantite: 0 }, { id: 'p2', nom: 'Phone Bravo', quantite: 5 }];
    const real = db.collection.bind(db);
    db.collection = (n) => (n === 'produits' ? { get: async () => ({ docs: prods.map((p) => ({ id: p.id, data: () => p })) }), doc: (id) => ({ id, path: 'produits/' + id }) } : real(n));
    const ctx = vm.createContext({
      console, db, cleanName: (s) => s, prodName: (p) => p.nom || p.modele, currentUser: { uid: 'empA' }, allProduits: [],
      firebase: { firestore: { FieldValue: { serverTimestamp: () => TS, increment: (n) => ({ inc: n }) } } },
    });
    run(ctx, extractFn('stockMatch') + '\n' + extractFn('stockAfterSale'));
    await run(ctx, "stockAfterSale([{name:'Phone Alpha',qty:1},{name:'Phone Bravo',qty:2},{name:'Phone Bravo',qty:9,pid:'p2'}],'F1','empA')");
    const ops = log.batches[0];
    const maj = ops.filter((o) => o.op === 'update');
    assert.equal(JSON.stringify(maj.map((o) => [o.path, o.data.quantite && o.data.quantite.inc])), JSON.stringify([['produits/p2', -2], ['produits/p2', -3]]));
    const mv = ops.filter((o) => o.path.startsWith('mouvements_stock/'));
    assert.equal(mv.length, 3);
    assert.equal(mv[0].data.insuffisant, true, 'produit à zéro : vente signalée, stock non touché');
    assert.equal(mv[0].data.delta, 0);
    assert.equal(mv[2].data.demande, 9);
    assert.equal(mv.every((m) => m.data.factureId === 'F1' && m.data.uid === 'empA'), true);
  });
});

describe('Cohérence application / règles Firestore', () => {
  it('toute collection utilisée par l\'application a une règle explicite', () => {
    const used = new Set([...app.matchAll(/collection\('([a-z_]+)'\)/g)].map((m) => m[1]));
    const ruled = new Set([...rules.matchAll(/match \/([a-z_]+)\/\{/g)].map((m) => m[1]));
    const manquantes = [...used].filter((c) => !ruled.has(c));
    assert.deepEqual(manquantes, [], 'collections sans règle : ' + manquantes);
  });
  it('l\'application ne lit les coûts que si l\'utilisateur y a droit (listeners)', () => {
    const f = extractFn('coutsStart');
    assert.match(f, /watch\('commandes_couts','cmd',can\('couts'\)\)/);
    assert.match(f, /watch\('factures_couts','fac',can\('couts'\)\)/);
    assert.match(f, /watch\('produits_prive','prod',can\('couts'\)\)/);
    assert.match(f, /watch\('commandes_fourn','fourn',isAdmin\)/);
  });
  it('l\'employé ne voit plus ses propres bénéfices', () => {
    assert.match(app, /function facSeesProfit\(f\)\{return can\('couts'\);\}/);
    assert.match(extractFn('viewCmd'), /var voitBenef=can\('couts'\);/);
  });
});
