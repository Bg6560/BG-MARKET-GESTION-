// Notifications internes (sans serveur) : rôles, clés uniques (pas de doublon), « traité », suivi des statuts, historique.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, it, beforeEach } from 'node:test';
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
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return app.slice(m.index, i + 1);
  }
  throw new Error('accolades non équilibrées : ' + name);
}
const decl = (re) => { const m = re.exec(app); assert.ok(m, 'déclaration introuvable : ' + re); return m[0]; };
const FNS = ['ntfKey', 'ntfLoad', 'ntfSave', 'ntfPrune', 'ntfCatsForMe', 'ntfPrefs', 'ntfOn', 'ntfTogglePref', 'ntfList', 'ntfUnread', 'ntfAnnounce',
  'ntfSync', 'ntfTrack', 'ntfCmdItem', 'ntfFacItem', 'ntfStkItem', 'ntfUsrItem', 'ntfDocs', 'ntfCache', 'ntfFeed', 'ntfReadAll', 'ntfClearHistory'];

let ctx, toasts, store;
function make(role) {
  toasts = []; store = {};
  ctx = vm.createContext({
    isBoss: role === 'boss', isAdmin: role !== 'emp', window: {},
    localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } },
    showToast: (m) => toasts.push(m), ntfPaint: () => {}, uiSettings: () => {},
    uiName: (s) => s || '', v2ToDate: (t) => (t ? new Date(t) : null), prodName: (p) => p.modele, prodCap: (s) => s,
  });
  vm.runInContext([decl(/var NTF=\{[^\n]*\n/), decl(/var NTF_CATS=\[[\s\S]*?\n\];/), decl(/var NTF_CMD_ST=\{[^\n]*\n/), 'var NTF_INIT={};', ...FNS.map(extractFn)].join('\n'), ctx);
  vm.runInContext("ntfLoad('u1')", ctx);
}
const snap = (docs, fromCache = false) => ({ docs: docs.map((d) => ({ id: d.id, data: () => d })), metadata: { fromCache } });
const run = (code) => { const v = vm.runInContext(code, ctx); return Array.isArray(v) ? [...v] : v; };
const feed = (src, docs, mk, cache) => { ctx.__s = snap(docs, cache); run(`ntfFeed('${src}',__s,${mk})`); };
const unread = () => run('ntfUnread()');

describe('Notifications internes', () => {
  it('catégories selon le rôle (le patron seul voit les comptes, l\'employé seulement son suivi)', () => {
    make('boss'); assert.deepEqual(run('ntfCatsForMe().map(c=>c.k)'), ['cmd', 'fac', 'stk', 'cpt']);
    make('admin'); assert.deepEqual(run('ntfCatsForMe().map(c=>c.k)'), ['cmd', 'fac', 'stk']);
    make('emp'); assert.deepEqual(run('ntfCatsForMe().map(c=>c.k)'), ['suivi']);
  });

  it('commandes à valider : comptées une seule fois, pas d\'annonce au chargement, annonce ensuite, sans montant', () => {
    make('admin');
    feed('cmd', [{ id: 'a', client: 'Awa', num: 'CMD-1', total: 450000, vendeur: 'Koffi' }], 'ntfCmdItem');
    assert.equal(unread(), 1);
    assert.deepEqual(toasts, [], 'rien d\'annoncé au chargement');
    feed('cmd', [{ id: 'a', client: 'Awa', num: 'CMD-1' }, { id: 'b', client: 'Yao', num: 'CMD-2', total: 90000 }], 'ntfCmdItem');
    feed('cmd', [{ id: 'a', client: 'Awa', num: 'CMD-1' }, { id: 'b', client: 'Yao', num: 'CMD-2' }], 'ntfCmdItem');
    assert.equal(unread(), 2, 'même commande reçue deux fois : une seule notification');
    assert.equal(toasts.length, 1);
    assert.match(toasts[0], /Commande à valider · Yao · CMD-2/);
    const all = JSON.stringify(run('ntfList()'));
    assert.doesNotMatch(all, /450000|90000|450 000/, 'aucun montant');
  });

  it('copie locale (hors ligne) : rien n\'est classé « traité » ni annoncé à tort', () => {
    make('admin');
    feed('cmd', [{ id: 'a' }], 'ntfCmdItem', true);
    feed('cmd', [{ id: 'a' }, { id: 'b' }], 'ntfCmdItem', false);
    assert.deepEqual(toasts, [], 'la première réponse du serveur reste « chargement »');
    feed('cmd', [], 'ntfCmdItem', true);
    assert.equal(run('ntfList().filter(x=>x.done).length'), 0);
  });

  it('commande validée par quelqu\'un d\'autre : passe dans l\'historique, n\'est plus comptée', () => {
    make('boss');
    feed('cmd', [{ id: 'a' }, { id: 'b' }], 'ntfCmdItem');
    feed('cmd', [{ id: 'b' }], 'ntfCmdItem');
    assert.equal(unread(), 1);
    assert.equal(run("NTF.items['cmd:a'].done>0"), true);
  });

  it('stock : bas puis rupture = deux alertes distinctes ; réapprovisionné puis à nouveau bas = nouvelle alerte', () => {
    make('admin');
    feed('stk', [{ id: 'p', modele: 'Galaxy A15', quantite: 2 }], 'ntfStkItem');
    feed('stk', [{ id: 'p', modele: 'Galaxy A15', quantite: 0 }], 'ntfStkItem');
    assert.deepEqual(run("Object.keys(NTF.items).sort()"), ['stk:p:low', 'stk:p:out']);
    assert.equal(run("NTF.items['stk:p:low'].done>0"), true);
    assert.match(toasts[0], /Rupture de stock · Galaxy A15/);
    feed('stk', [], 'ntfStkItem');
    run("ntfReadAll()");
    feed('stk', [{ id: 'p', modele: 'Galaxy A15', quantite: 1 }], 'ntfStkItem');
    assert.equal(unread(), 1);
    assert.equal(run("NTF.items['stk:p:low'].done"), 0);
  });

  it('employé : changement de statut de sa commande = une notification, jamais au premier passage ni en double', () => {
    make('emp');
    const rule = "function(c,p,cur){return NTF_CMD_ST[cur]?{t:NTF_CMD_ST[cur],s:c.client,go:'commande:'+c.id}:null;}";
    const track = (docs, initial) => { ctx.__d = docs; run(`ntfTrack('c',__d,'statut',${rule},${initial})`); };
    track([{ id: 'a', statut: 'en_attente', client: 'Awa' }], true);
    assert.equal(unread(), 0, 'point de départ, sans alerte');
    track([{ id: 'a', statut: 'validee', client: 'Awa' }], false);
    track([{ id: 'a', statut: 'validee', client: 'Awa' }], false);
    assert.equal(unread(), 1);
    assert.deepEqual(toasts, ['Commande validée · Awa']);
    /* changement survenu pendant que l'appli était fermée : retrouvé à la réouverture (état gardé sur l'appareil) */
    run("ntfLoad('u1')");
    track([{ id: 'a', statut: 'livree', client: 'Awa' }], true);
    assert.equal(unread(), 2);
    assert.equal(toasts.length, 1, 'trouvé au chargement : cloche, pas d\'annonce');
  });

  it('lu, préférences par catégorie et historique gardés sur l\'appareil', () => {
    make('boss');
    feed('cpt', [{ id: 'u9', nom: 'Nouveau', email: 'n@x' }], 'ntfUsrItem');
    feed('fac', [{ id: 'f1', client: 'Awa', num: 'F-1' }], 'ntfFacItem');
    assert.equal(unread(), 2);
    run("ntfTogglePref('fac')");
    assert.equal(unread(), 1, 'catégorie coupée : ni comptée ni affichée');
    run("ntfReadAll()");
    assert.equal(unread(), 0);
    run("ntfLoad('u1')");
    assert.equal(run("Object.keys(NTF.items).length"), 2, 'rechargé depuis l\'appareil');
    assert.equal(unread(), 0);
    run("ntfLoad('autre')");
    assert.equal(run("Object.keys(NTF.items).length"), 0, 'chaque compte a son propre historique');
  });

  it('historique limité : 30 jours et 150 éléments au plus', () => {
    make('admin');
    run(`for(var i=0;i<200;i++)NTF.items['x'+i]={k:'x'+i,cat:'cmd',done:Date.now()-i*1000,at:0};
         NTF.items.vieux={k:'vieux',cat:'cmd',done:Date.now()-31*864e5,at:0};NTF.items.actif={k:'actif',cat:'cmd',done:0,at:0};ntfSave();`);
    assert.equal(run('Object.keys(NTF.items).length'), 150);
    assert.equal(run("'vieux' in NTF.items"), false);
    assert.equal(run("'actif' in NTF.items"), true, 'ce qui reste à traiter n\'est jamais effacé');
  });
});
