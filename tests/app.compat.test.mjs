// Compatibilité code / règles, absence de secrets dans le dépôt, fichiers d'installation cohérents.
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const html = read('index.html'), rules = read('firestore.rules'), sw = read('sw.js'), fn = read('functions/index.js') + read('functions/lib/dispatch.js');
const ruledCollections = new Set([...rules.matchAll(/match \/([a-z_]+)\/\{/g)].map((m) => m[1]));
const used = (src, re) => new Set([...src.matchAll(re)].map((m) => m[1]));

describe('Le code n\'utilise que des collections prévues par les règles', () => {
  it('toutes les collections de index.html ont une règle', () => {
    const cols = used(html, /collection\('([a-z_]+)'\)/g);
    assert.ok(cols.size >= 15);
    for (const c of cols) assert.ok(ruledCollections.has(c), `collection sans règle : ${c}`);
  });
  it('collections du serveur : soit prévues par les règles, soit réservées au serveur (aucune règle = refus pour les clients)', () => {
    const cols = used(fn, /(?:collection|doc)\('([a-z_]+)[/']/g);
    const serverOnly = new Set(['notifications_log', 'notifications_envoyees']);
    for (const c of cols) assert.ok(ruledCollections.has(c) || serverOnly.has(c), `collection inattendue côté serveur : ${c}`);
    for (const c of ['notifications_log', 'notifications_envoyees']) assert.equal(ruledCollections.has(c), false, c + ' ne doit jamais être accessible aux clients');
  });
  it('aucune règle fourre-tout', () => {
    assert.doesNotMatch(rules, /match \/\{[a-zA-Z]+=\*\*\}/);
    assert.doesNotMatch(rules, /allow (read|write)(, \w+)*: if true/);
  });
  it('les règles cibles ne sont pas publiables par erreur : l\'UID du patron est encore à remplacer', () => {
    assert.match(rules, /PATRON_UID_A_REMPLACER/);
  });
});

describe('Coûts : le code n\'écrit plus de coût dans les documents publics', () => {
  it('les écritures de commandes/factures/produits passent par les collections privées', () => {
    assert.match(html, /collection\('commandes_couts'\)\.doc\(cref\.id\)/);
    assert.match(html, /collection\('produits_prive'\)\.doc\(pref\.id\)/);
    assert.match(html, /collection\('factures_couts'\)/);
    assert.match(html, /function coutsNoCost/);
  });
});

describe('Aucun secret dans le dépôt', () => {
  const files = execSync('git ls-files', { cwd: new URL('..', import.meta.url).pathname, encoding: 'utf8' }).split('\n').filter(Boolean);
  const SELF = 'tests/app.compat.test.mjs';
  const patterns = [['clé privée', new RegExp('-----BEGIN ' + '(RSA |EC )?PRIVATE KEY')], ['compte de service', new RegExp('"private_' + 'key"')], ['jeton GitHub', new RegExp('gh[pousr]_' + '[A-Za-z0-9]{30,}')], ['clé secrète', new RegExp('sk-' + '[A-Za-z0-9]{30,}')], ['jeton serveur FCM', new RegExp('AAAA[A-Za-z0-9_-]{7}:' + 'APA91b')]];
  it('aucun motif de secret dans les fichiers suivis', () => {
    for (const f of files) {
      if (f === SELF || /\.(png|jpg|ico)$/.test(f) || f === 'package-lock.json' || f === 'functions/package-lock.json') continue;
      const txt = readFileSync(new URL('../' + f, import.meta.url), 'utf8');
      for (const [name, re] of patterns) assert.doesNotMatch(txt, re, `${name} trouvé dans ${f}`);
    }
  });
  it('aucun fichier d\'identifiants suivi', () => {
    assert.deepEqual(files.filter((f) => /(service-?account|compte-de-service|credentials|\.env($|\.))/i.test(f)), []);
  });
  it('les sauvegardes et sorties de migration sont ignorées par Git', () => {
    const ig = read('.gitignore');
    for (const p of ['sauvegardes', 'tools/out', 'node_modules']) assert.match(ig, new RegExp(p));
  });
});

describe('Service worker et installation', () => {
  it('le SW préchache la messagerie et ne met jamais en cache les données', () => {
    assert.match(sw, /firebase-messaging-compat\.js/);
    assert.match(sw, /firestore\.googleapis\.com/);
  });
  it('index.html charge la messagerie Firebase en même version que le reste', () => {
    const v = [...html.matchAll(/firebasejs\/(\d+\.\d+\.\d+)\/firebase-(app|auth|firestore|messaging)-compat\.js/g)];
    assert.equal(new Set(v.map((m) => m[2])).size, 4);
    assert.equal(new Set(v.map((m) => m[1])).size, 1);
  });
});
