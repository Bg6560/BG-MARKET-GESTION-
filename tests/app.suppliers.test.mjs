// Catalogue des téléphones par fournisseur : lecture des listes, doublons, comparaison, marge estimée.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
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
    else if (c === '/' && /[=(,:;!&|?{}\n]\s*$/.test(app.slice(Math.max(0, i - 3), i))) { for (i++; app[i] !== '/'; i++) { if (app[i] === '\\') i++; else if (app[i] === '[') { for (i++; app[i] !== ']'; i++) if (app[i] === '\\') i++; } } }
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return app.slice(m.index, i + 1);
  }
  throw new Error('accolades non équilibrées : ' + name);
}
const brands = /var CF_BRANDS=\[[^\]]*\];/.exec(app)[0] + /var CF_MARQUES=[\s\S]*?var CF_ETAT_LIB=[^;]*;/.exec(app)[0];
const ctx = vm.createContext({ Date });
vm.runInContext(brands + ['cfNorm', 'cfKey', 'cfTokens', 'cfWeak', 'cfSet', 'cfDocId', 'cfPrice', 'cfLow', 'cfEtat', 'cfSansEtat', 'cfMarquesDe', 'cfItemKey', 'cfPrixFin', 'cfNomPropre', 'cfStockage', 'cfAnalyse', 'cfParse', 'cfPlan', 'cfCompare', 'cfAgeTxt'].map(extractFn).join('\n'), ctx);
const f = (name, ...a) => vm.runInContext(`${name}`, ctx)(...a);
const J = (o) => JSON.parse(JSON.stringify(o));

describe('Prix : lecture d\'un montant', () => {
  it('formats courants', () => {
    for (const [s, v] of [['85000', 85000], ['85 000', 85000], ['85.000', 85000], ['85 000 F', 85000], ['85000 FCFA', 85000], ['85k', 85000], ['85 mille', 85000]]) assert.equal(f('cfPrice', s), v, s);
  });
  it('refuse ce qui n\'est pas un prix', () => {
    for (const s of ['128', 'abc', '', '12', '-5000', '85000000000']) assert.equal(f('cfPrice', s), null, s);
  });
});

describe('Modèle : clé stable', () => {
  it('même téléphone écrit de façons différentes → même clé', () => {
    const k = f('cfKey', 'Samsung Galaxy A15 128 Go');
    for (const s of ['SAMSUNG  galaxy a15 128GB', 'Galaxy A15 128go Samsung', 'samsung galaxy a15 128g', 'Samsung Galaxy A15 128 Go (neuf)']) assert.equal(f('cfKey', s), k, s);
  });
  it('5G n\'est pas confondu avec le stockage ; capacités distinctes = clés distinctes', () => {
    assert.notEqual(f('cfKey', 'Tecno Spark 20 128Go'), f('cfKey', 'Tecno Spark 20 256Go'));
    assert.match(f('cfKey', 'Redmi Note 13 5G 256Go'), /\b5g\b/);
    assert.match(f('cfKey', 'Redmi 13C 4/128'), /4gb/);
  });
  it('identifiant de document sûr et déterministe', () => {
    const id = f('cfDocId', 'F1', f('cfKey', 'Tecno Spark 20+ 128Go'));
    assert.equal(id, f('cfDocId', 'F1', f('cfKey', 'tecno spark 20+ 128 go')));
    assert.doesNotMatch(id, /[\/ +]/);
  });
});

describe('Import : lecture des listes', () => {
  const lines = `Liste du 12/10:
Samsung Galaxy A15 128 Go ; 85000
Tecno Spark 20 | 128Go | 72 000 F
Infinix Hot 40i - 64 500 F CFA
modèle;prix
Itel A70, 256Go, 58000
iPhone 13 128Go
Redmi 13C 4/128 : 79k`;
  const r = J(f('cfParse', lines));
  it('reconnaît les téléphones avec prix, tous formats', () => {
    const by = Object.fromEntries(r.items.map((x) => [x.nom, x.prix]));
    assert.equal(r.items.length, 5, JSON.stringify(r.items));
    assert.equal(by['Samsung Galaxy A15 128 Go'], 85000);
    assert.equal(Object.values(by).includes(72000), true);
    assert.equal(Object.values(by).includes(64500), true);
    assert.equal(Object.values(by).includes(58000), true);
    assert.equal(Object.values(by).includes(79000), true);
  });
  it('signale sans l\'enregistrer une ligne sans prix ; ignore titres et en-têtes', () => {
    assert.deepEqual(r.sansPrix, ['iPhone 13 128Go']);
  });
  it('liste vide ou illisible : rien', () => {
    assert.deepEqual(J(f('cfParse', '\n\n   \n')), { items: [], sansPrix: [] });
  });
});

describe('Plan d\'import : jamais de doublon ni de remplacement silencieux', () => {
  const items = [{ nom: 'Samsung A15 128Go', prix: 85000 }, { nom: 'Tecno Spark 20 128Go', prix: 72000 }];
  it('même produit deux fois au même prix : un seul, signalé en doublon', () => {
    const p = J(f('cfPlan', [...items, { nom: 'samsung a15 128 go', prix: 85000 }], {}, 'F1', 1));
    assert.equal(p.creer.length, 2);
    assert.equal(p.doublons.length, 1);
  });
  it('même produit avec deux prix différents : rien n\'est enregistré, « à vérifier »', () => {
    const p = J(f('cfPlan', [...items, { nom: 'samsung a15 128 go', prix: 83000 }], {}, 'F1', 1));
    assert.equal(p.creer.length, 1);
    assert.equal(p.conflits.length, 1);
    assert.deepEqual(p.conflits[0].prix.sort(), [83000, 85000]);
  });
  it('réimport de la même liste : rien de créé, tout confirmé (mêmes identifiants)', () => {
    const first = J(f('cfPlan', items, {}, 'F1', 1));
    const existing = Object.fromEntries(first.creer.map((x) => [x.id, { nom: x.nom, prixAchat: x.prix, majMs: 1000 }]));
    const p2 = J(f('cfPlan', items, existing, 'F1', 2));
    assert.equal(p2.creer.length, 0);
    assert.equal(p2.confirmer.length, 2);
    assert.equal(p2.modifier.length, 0);
  });
  it('prix changé : modification listée avec l\'ancien prix', () => {
    const first = J(f('cfPlan', items, {}, 'F1', 1));
    const existing = Object.fromEntries(first.creer.map((x) => [x.id, { nom: x.nom, prixAchat: x.prix, majMs: 5000 }]));
    const p2 = J(f('cfPlan', [{ nom: 'Tecno Spark 20 128 Go', prix: 75000 }], existing, 'F1', 2));
    assert.equal(p2.modifier.length, 1);
    assert.equal(p2.modifier[0].avant, 72000);
    assert.equal(p2.modifier[0].prix, 75000);
    assert.equal(p2.modifier[0].avantMs, 5000);
  });
  it('un ancien document enregistré sous une autre écriture est retrouvé (pas de doublon)', () => {
    const existing = { 'F1_ancien-id': { nom: 'Huawei P30 Pro 128 Go', prixAchat: 80000, majMs: 1 } };
    const p = J(f('cfPlan', [{ nom: 'Huawei P30pro 128gb', prix: 82000 }], existing, 'F1', 2));
    assert.equal(p.creer.length, 0);
    assert.equal(p.modifier[0].id, 'F1_ancien-id');
  });
  it('même modèle, état différent (Kazi neuf) : deux produits distincts', () => {
    const p = J(f('cfPlan', [{ nom: 'Redmi 9A', prix: 27500, etat: 'kazi neuf' }, { nom: 'Redmi 9A', prix: 40000, etat: '' }], {}, 'F1', 1));
    assert.equal(p.creer.length, 2);
    assert.equal(p.conflits.length, 0);
  });
  it('un autre fournisseur a ses propres documents', () => {
    const a = J(f('cfPlan', items, {}, 'F1', 1)), b = J(f('cfPlan', items, {}, 'F2', 1));
    assert.equal(a.creer.some((x) => b.creer.some((y) => y.id === x.id)), false);
  });
});

describe('Comparaison et marge estimée', () => {
  const DAY = 86400000, now = 100 * DAY;
  const E = (fid, fn, nom, prix, ageJ) => ({ fournisseurId: fid, fournisseurNom: fn, nom, cle: f('cfKey', nom), prixAchat: prix, majMs: now - ageJ * DAY });
  const entries = [
    E('F1', 'Alpha', 'Samsung Galaxy A15 128 Go', 85000, 2),
    E('F2', 'Beta', 'Galaxy A15 128GB', 82000, 3),
    E('F3', 'Gamma', 'Galaxy A15 128Go', 90000, 60),
    E('F1', 'Alpha', 'Tecno Spark 20 128Go', 70000, 45),
    E('F2', 'Beta', 'Infinix Hot 40i 256Go', 65000, 1),
    E('F2', 'Beta', 'Redmi 13C 4/128', 60000, 1),
  ];
  const produits = [
    { id: 'p1', marque: 'Samsung', modele: 'Galaxy A15', stockage: '128 GB', prixVente: 100000 },
    { id: 'p2', marque: 'Tecno', modele: 'Spark 20', stockage: '128 GB', prixVente: 0 },
    { id: 'p3', marque: 'Xiaomi', modele: 'Redmi 13C', stockage: '128 GB', prixVente: 75000 },
    { id: 'p4', marque: 'Nokia', modele: 'C32', stockage: '64 GB', prixVente: 50000 },
  ];
  const c = J(f('cfCompare', entries, produits, now, 30));
  const row = (re) => c.rows.find((r) => re.test(r.nom));
  it('meilleur prix, écart avec le suivant, fournisseur gagnant', () => {
    const r = row(/A15/);
    assert.equal(r.offres.length, 3);
    assert.equal(r.meilleur.prix, 82000);
    assert.equal(r.meilleur.fournisseur, 'Beta');
    assert.equal(r.ecart, 3000);
  });
  it('marge brute estimée = prix de vente − meilleur prix d\'achat', () => {
    const r = row(/A15/);
    assert.equal(r.produit.id, 'p1');
    assert.equal(r.approx, false);
    assert.equal(r.marge, 18000);
    assert.equal(r.margePct, 18);
  });
  it('prix ancien signalé (au-delà de 30 jours) ; offre ancienne repérée', () => {
    assert.equal(row(/Tecno/).ancien, true);
    assert.equal(row(/A15/).ancien, false);
    assert.equal(row(/A15/).offres.find((o) => o.fournisseur === 'Gamma').ancien, true);
  });
  it('prix de vente absent signalé, pas de marge inventée', () => {
    const r = row(/Tecno/);
    assert.equal(r.sansPrixVente, true);
    assert.equal(r.marge, undefined);
  });
  it('correspondance douteuse (RAM absente du stock) marquée « à vérifier »', () => {
    const r = row(/Redmi/);
    assert.equal(r.produit.id, 'p3');
    assert.equal(r.approx, true);
  });
  it('modèle absent du stock : pas de produit ; produit du stock sans prix fournisseur listé', () => {
    assert.equal(row(/Infinix/).produit, undefined);
    assert.deepEqual(c.manquants.map((p) => p.id), ['p4']);
  });
  it('ancienneté lisible', () => {
    assert.equal(f('cfAgeTxt', now - 3 * DAY, now), 'il y a 3 j');
    assert.equal(f('cfAgeTxt', 0, now), 'date inconnue');
  });
});

/* ---------- Recherche de produits dans les formulaires ---------- */
const ctx2 = vm.createContext({ Date });
vm.runInContext(brands + ['cfNorm', 'ordpLabel', 'ordpSearch', 'ordpStockText'].map(extractFn).join('\n'), ctx2);
const g = (name, ...a) => vm.runInContext(name, ctx2)(...a);
const P = [
  { id: 'a', marque: 'Samsung', modele: 'Galaxy A15', stockage: '128 GB', ram: '4 GB', prixVente: 100000, quantite: 3 },
  { id: 'b', marque: 'Samsung', modele: 'Galaxy A15', stockage: '256 GB', ram: '8 GB', prixVente: 120000, quantite: 0 },
  { id: 'c', marque: 'Samsung', modele: 'Galaxy A16', stockage: '128 GB', prixVente: 110000, quantite: 5 },
  { id: 'd', marque: 'Tecno', modele: 'Spark 20', stockage: '128 GB', prixVente: 80000, quantite: 1 },
  { id: 'e', marque: 'Apple', modele: 'iPhone 13', stockage: '128 GB', prixVente: 450000, quantite: 2 },
];
const ids = (q, max) => J(g('ordpSearch', P, q, max)).map((p) => p.id);
describe('Recherche dans le formulaire de commande', () => {
  it('trouve pendant la saisie, avec ou sans marque, majuscules et accents indifférents', () => {
    assert.deepEqual(ids('a15').sort(), ['a', 'b']);
    assert.deepEqual(ids('GALAXY a1').sort(), ['a', 'b', 'c']);
    assert.deepEqual(ids('samsung a15 128').sort(), ['a']);
    assert.deepEqual(ids('iphone'), ['e']);
    assert.deepEqual(ids('spa'), ['d']);
  });
  it('capacité : « 256 » trouve le 256 Go', () => {
    assert.deepEqual(ids('a15 256'), ['b']);
  });
  it('en stock avant rupture à pertinence égale ; mot exact avant mot partiel', () => {
    assert.deepEqual(ids('a15'), ['a', 'b']);
    assert.equal(ids('a1')[0] === undefined, false);
    assert.equal(ids('galaxy a15')[0], 'a');
  });
  it('aucun résultat plutôt qu\'un mauvais produit', () => {
    assert.deepEqual(ids('xyz'), []);
    assert.deepEqual(ids('a15 512'), []);
    assert.deepEqual(ids(''), []);
    assert.deepEqual(ids('   '), []);
  });
  it('nombre de résultats limité', () => {
    assert.equal(ids('galaxy', 2).length, 2);
  });
  it('libellé : marque non répétée, capacité seulement pour la facture', () => {
    assert.equal(g('ordpLabel', { marque: 'Samsung', modele: 'Samsung Galaxy A15', stockage: '128 GB' }), 'Samsung Galaxy A15');
    assert.equal(g('ordpLabel', P[0], true), 'Samsung Galaxy A15 128 GB');
    assert.equal(g('ordpLabel', P[0]), 'Samsung Galaxy A15');
  });
});
describe('Stock affiché : les règles ne changent pas', () => {
  it('commande : rupture permise (à commander), jamais bloquée', () => {
    assert.deepEqual(J(g('ordpStockText', 'cmd', { quantite: 0 }, 1, 2)), { niveau: 'rupture', txt: 'Hors stock : à commander chez le fournisseur' });
    assert.equal(g('ordpStockText', 'cmd', { quantite: 3 }, 5, 2).niveau, 'insuffisant');
    assert.match(g('ordpStockText', 'cmd', { quantite: 3 }, 5, 2).txt, /3 disponibles pour 5 demandés/);
  });
  it('facture : seul le stock disponible sera déduit', () => {
    assert.match(g('ordpStockText', 'fac', { quantite: 0 }, 1, 2).txt, /ne changera pas le stock/);
    assert.match(g('ordpStockText', 'fac', { quantite: 2 }, 4, 2).txt, /seulement 2 seront déduits/);
  });
  it('stock suffisant, bas ou normal', () => {
    assert.equal(g('ordpStockText', 'cmd', { quantite: 10 }, 1, 2).niveau, 'ok');
    assert.equal(g('ordpStockText', 'cmd', { quantite: 2 }, 1, 2).niveau, 'bas');
  });
  it('une commande ne déduit jamais le stock ; seule la facture le fait', () => {
    const saveCmd = extractFn('saveCmd');
    assert.doesNotMatch(saveCmd, /stockAfterSale|increment\(/);
    assert.match(app, /stockAfterSale\(data\.products,ref\.id,data\.uid\)/);
  });
});
