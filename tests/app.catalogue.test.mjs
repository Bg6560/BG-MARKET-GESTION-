// Lecture des catalogues fournisseurs reçus par WhatsApp : formats réels, années, catégories, états, ambiguïtés.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = [...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).pop();
function extractFn(name) {
  const m = new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`).exec(app);
  assert.ok(m, name);
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
}
const vars = /var CF_BRANDS=\[[^\]]*\];/.exec(app)[0] + /var CF_MARQUES=[\s\S]*?var CF_ETAT_LIB=[^;]*;/.exec(app)[0];
const ctx = vm.createContext({});
vm.runInContext(vars + ['cfNorm', 'cfKey', 'cfTokens', 'cfDocId', 'cfLow', 'cfEtat', 'cfSansEtat', 'cfMarquesDe', 'cfItemKey', 'cfPrixFin', 'cfNomPropre', 'cfStockage', 'cfAnalyse', 'cfPlan'].map(extractFn).join('\n'), ctx);
const analyse = (t) => JSON.parse(JSON.stringify(vm.runInContext('cfAnalyse', ctx)(t)));
const plan = (items, ex = {}) => JSON.parse(JSON.stringify(vm.runInContext('cfPlan', ctx)(items, ex, 'F1', 1)));
const prixDe = (r, re) => { const x = r.items.find((i) => re.test(i.nom)); return x && x.prix; };

const CATALOGUE = `*SAMSUNG SERIES A*

A14 128gb….50.000
A15 128GB…65.000
A16 128….70.000
A17 128gb….80.000

*SAMSUNG S*

S20 256GB - 100.000
S21 ultra 256GB - 175.000
S22 ultra 128gb…180.000

*XIAOMI & REDMI*

Redmi 13C 256GB - 45.000
Mi 11 ultra 256GB - 185.000

*HUAWEI*

P30pro 128gb…….80.000
P30pro 256GB.....100.000

*KAZI NEUFS*
Honor 5A ……………12.000
HUAWEI Y6prime …….15.000
HUAWEI Y9 2018…………20.000
Y9prime 2019 ……………35.000
Y7 Pro 2019 : 30.000
Redmi 9A…………………..27500
Motorola G 2025 128GB : 80.000`;

describe('Catalogue WhatsApp réel', () => {
  const r = analyse(CATALOGUE);
  it('toutes les lignes produit sont lues, aucune ne disparaît', () => {
    assert.equal(r.items.length, 18);
    assert.deepEqual([r.aVerifier.length, r.sansPrix.length, r.ignorees.length], [0, 0, 0]);
  });
  it('les années font partie du modèle, jamais du prix (anomalie observée : 2 025 F, 2 018 F, 2 019 F)', () => {
    assert.equal(prixDe(r, /Y9 2018/), 20000);
    assert.equal(prixDe(r, /Y9prime 2019/), 35000);
    assert.equal(prixDe(r, /Y7 Pro 2019/), 30000);
    assert.equal(prixDe(r, /Motorola G 2025/), 80000);
    assert.ok(r.items.every((i) => i.prix >= 10000), JSON.stringify(r.items.map((i) => i.prix)));
  });
  it('séparateurs WhatsApp : points de suspension, tirets, deux-points, suites de points', () => {
    assert.equal(prixDe(r, /A14/), 50000);
    assert.equal(prixDe(r, /A15/), 65000);
    assert.equal(prixDe(r, /S21 ultra/), 175000);
    assert.equal(prixDe(r, /P30pro 256/), 100000);
    assert.equal(prixDe(r, /Redmi 9A/), 27500);
  });
  it('« A16 128 » : 128 est la capacité, 70 000 le prix', () => {
    const a16 = r.items.find((i) => /A16/.test(i.nom));
    assert.equal(a16.prix, 70000);
    assert.equal(a16.stockage, '128GB');
    assert.equal(a16.nom, 'Samsung A16 128', 'le nom reste tel qu\'écrit');
  });
  it('titres reconnus ; la marque du titre s\'applique aux lignes sans marque', () => {
    assert.deepEqual(r.titres, ['SAMSUNG SERIES A', 'SAMSUNG S', 'XIAOMI & REDMI', 'HUAWEI', 'KAZI NEUFS']);
    assert.equal(r.items.find((i) => /A14/.test(i.nom)).marque, 'Samsung');
    assert.equal(r.items.find((i) => /P30pro 128/.test(i.nom)).marque, 'Huawei');
    assert.equal(r.items.find((i) => /Mi 11/.test(i.nom)).marque, 'Xiaomi');
  });
  it('« Kazi neuf » est conservé, jamais confondu avec « neuf »', () => {
    const kazi = r.items.filter((i) => i.etat === 'kazi neuf').map((i) => i.nom);
    assert.equal(kazi.length, 7);
    assert.ok(kazi.includes('Honor 5A'));
    assert.equal(r.items.find((i) => /A14/.test(i.nom)).etat, '', 'aucun état inventé');
  });
  it('capacités et variantes distinctes : jamais fusionnées', () => {
    const p = plan(r.items);
    assert.equal(p.creer.length, 18);
    assert.equal(p.doublons.length + p.conflits.length, 0);
    const k = (re) => r.items.find((i) => re.test(i.nom)).cle;
    assert.notEqual(k(/P30pro 128/), k(/P30pro 256/));
    assert.notEqual(k(/Y9 2018/), k(/Y9prime 2019/));
    assert.notEqual(k(/^Samsung S21/), k(/^Samsung S22/));
  });
});

describe('Formats de prix', () => {
  const one = (l) => analyse(l);
  for (const [ligne, prix] of [['Tecno Spark 20 - 50000', 50000], ['Tecno Spark 20 - 50.000', 50000], ['Tecno Spark 20 - 50 000', 50000], ['Tecno Spark 20 - 50,000', 50000],
    ['Tecno Spark 20 : 50 000 F', 50000], ['Tecno Spark 20 = 50.000 FCFA', 50000], ['Tecno Spark 20 50k', 50000], ['Tecno Spark 20 → 1.250.000', 1250000], ['iPhone 15 Pro Max 256GB : 1 250 000 F CFA', 1250000],
    ['Tecno Spark 20 | 128Go | 72 000 F', 72000], ['Itel A70, 256Go, 58000', 58000], ['Redmi 13C 4/128 : 79k', 79000], ['Redmi 13C 4/128 : 79,5k', 79500]]) {
    it(ligne, () => { const r = one(ligne); assert.equal(r.items.length, 1, JSON.stringify(r)); assert.equal(r.items[0].prix, prix); });
  }
  it('virgule décimale ambiguë : à vérifier, jamais convertie à l\'aveugle', () => {
    for (const l of ['Coque silicone - 12,5', 'Chargeur - 2.50']) { const r = one(l); assert.equal(r.items.length, 0, l); assert.equal(r.aVerifier.length, 1, l); }
  });
  it('année seule après un séparateur : à vérifier', () => {
    const r = one('Galaxy A05 - 2024');
    assert.equal(r.items.length, 0);
    assert.match(r.aVerifier[0].raison, /année/);
  });
  it('année collée au modèle sans prix : ligne sans prix (pas un prix de 2 018 F)', () => {
    const r = one('HUAWEI Y9 2018');
    assert.equal(r.items.length, 0);
    assert.equal(r.sansPrix.length, 1);
  });
  it('petit montant sans devise : à vérifier ; avec devise : accepté (accessoires)', () => {
    assert.equal(one('Écouteurs - 500').aVerifier.length, 1);
    assert.equal(one('Écouteurs - 500 F').items[0].prix, 500);
  });
  it('plusieurs montants sur une ligne : à vérifier', () => {
    assert.equal(one('A15 128GB 65.000 / 70.000').aVerifier.length, 1);
  });
});

describe('Lignes non produit', () => {
  const r = analyse(`Bonjour chers clients
📱📱📱
-----------
Contact : 07 07 12 34 56
*ACCESSOIRES*
Montre connectée T500 - 8.000
Nokia 105 (téléphone à touches) - 9.500
iPhone 13 128Go
LIVRAISON GRATUITE`);
  it('texte, décorations et numéros de téléphone ignorés avec une raison', () => {
    const raisons = r.ignorees.map((x) => x.raison);
    assert.ok(raisons.includes('numéro de téléphone'));
    assert.ok(raisons.includes('texte sans prix ni modèle'));
    assert.ok(r.ignorees.every((x) => x.raison));
    assert.equal(r.items.some((i) => /07 07/.test(i.nom)), false);
  });
  it('accessoires et téléphones à touches acceptés sans capacité inventée', () => {
    const montre = r.items.find((i) => /Montre/.test(i.nom));
    assert.equal(montre.prix, 8000);
    assert.equal(montre.stockage, '');
    assert.equal(montre.categorie, 'ACCESSOIRES');
    assert.equal(r.items.find((i) => /Nokia 105/.test(i.nom)).prix, 9500);
  });
  it('produit sans prix signalé ; titres en majuscules reconnus', () => {
    assert.deepEqual(r.sansPrix.map((x) => x.ligne), ['iPhone 13 128Go']);
    assert.ok(r.titres.includes('LIVRAISON GRATUITE'));
  });
});

describe('États commerciaux', () => {
  it('état écrit sur la ligne ou dans le titre ; distinct du neuf', () => {
    const r = analyse('*SCELLÉS*\niPhone 12 64GB - 250.000\n*OCCASION*\niPhone 12 64GB - 180.000\niPhone 12 64GB neuf - 260.000');
    assert.deepEqual(r.items.map((i) => i.etat), ['scelle', 'occasion', 'neuf']);
    const p = plan(r.items);
    assert.equal(p.creer.length, 3, 'trois produits distincts');
    assert.equal(p.conflits.length, 0);
    assert.equal(r.items[2].nom, 'iPhone 12 64GB', 'le mot d\'état est retiré du nom, gardé dans l\'état');
  });
});
