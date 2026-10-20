// Vérifications du Lot 2A (comptes à approuver, clients de l'employé, fournisseurs) sur le code de index.html.
// Les fonctions sont extraites du script de l'application et exécutées avec des faux Firebase/DOM (aucun accès réseau).
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const app = scripts[scripts.length - 1];

// Extrait « function nom(...) {...} » (avec accolades équilibrées, chaînes et commentaires ignorés).
function extractFn(name) {
  const m = new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`).exec(app);
  assert.ok(m, `fonction introuvable : ${name}`);
  let i = app.indexOf('{', m.index), depth = 0;
  const start = m.index;
  for (; i < app.length; i++) {
    const c = app[i];
    if (c === "'" || c === '"' || c === '`') {
      for (i++; app[i] !== c; i++) if (app[i] === '\\') i++;
    } else if (c === '/' && app[i + 1] === '/') { i = app.indexOf('\n', i); }
    else if (c === '/' && app[i + 1] === '*') { i = app.indexOf('*/', i) + 1; }
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return app.slice(start, i + 1);
  }
  throw new Error('accolades non équilibrées : ' + name);
}
const bodyOf = (name) => extractFn(name);

function sandbox(extra = {}) {
  const ctx = vm.createContext({
    console, window: {}, firebase: { firestore: { FieldValue: { serverTimestamp: () => 'TS' } } }, ...extra,
  });
  return ctx;
}
const run = (ctx, code) => vm.runInContext(code, ctx);

describe('Approbation des nouveaux comptes (loadUserProfile)', () => {
  const code = [
    "var UI_BLOCKED=['en_attente','pause','suspendu','retire'];",
    extractFn('uiIsBlocked'), extractFn('uiBlockedMsg'), extractFn('loadUserProfile'),
  ].join('\n');

  function ctxFor({ exists, data, boss = false, readFails = false }) {
    const calls = { set: [], signOut: 0 };
    const ctx = sandbox({
      isBoss: boss, userProfile: null,
      rlApply() {}, uiWatchMyStatus() {},
      auth: { signOut: async () => { calls.signOut++; } },
      db: { collection: () => ({ doc: () => ({
        get: async () => { if (readFails) throw new Error('offline'); return { exists, data: () => data }; },
        set: async (d) => { calls.set.push(d); },
      }) }) },
    });
    run(ctx, code);
    ctx.calls = calls;
    return ctx;
  }
  const user = { uid: 'u1', email: 'jean@test.local', displayName: '' };

  it('nouveau compte employé : profil créé « en_attente », connexion refusée', async () => {
    const ctx = ctxFor({ exists: false });
    ctx.window._signupName = 'Jean Test';
    await assert.rejects(() => run(ctx, 'loadUserProfile(' + JSON.stringify(user) + ')'), (e) => e.blocked === true && /approbation/.test(e.message));
    assert.equal(ctx.calls.set.length, 1);
    assert.equal(ctx.calls.set[0].statut, 'en_attente');
    assert.equal(ctx.calls.set[0].role, 'employe');
    assert.equal(ctx.calls.set[0].nom, 'Jean Test');
    assert.equal(ctx.calls.signOut, 1);
  });
  it('profil existant « en_attente » : connexion refusée', async () => {
    const ctx = ctxFor({ exists: true, data: { statut: 'en_attente', role: 'employe' } });
    await assert.rejects(() => run(ctx, 'loadUserProfile(' + JSON.stringify(user) + ')'), (e) => e.blocked === true);
    assert.equal(ctx.calls.set.length, 0);
  });
  it('profil actif, ancien profil sans statut : connexion permise', async () => {
    for (const data of [{ statut: 'actif', role: 'employe' }, { role: 'employe' }]) {
      const ctx = ctxFor({ exists: true, data });
      await run(ctx, 'loadUserProfile(' + JSON.stringify(user) + ')');
      assert.equal(ctx.calls.signOut, 0);
    }
  });
  it('compte suspendu : toujours refusé', async () => {
    const ctx = ctxFor({ exists: true, data: { statut: 'suspendu' } });
    await assert.rejects(() => run(ctx, 'loadUserProfile(' + JSON.stringify(user) + ')'), (e) => e.blocked === true);
  });
  it('patron sans profil : profil créé « actif », pas de blocage', async () => {
    const ctx = ctxFor({ exists: false, boss: true });
    await run(ctx, 'loadUserProfile(' + JSON.stringify({ ...user, email: 'patron@test.local' }) + ')');
    assert.equal(ctx.calls.set[0].statut, 'actif');
  });
  it('profil illisible : employé refusé (échec fermé), patron conservé', async () => {
    const e1 = ctxFor({ readFails: true });
    await assert.rejects(() => run(e1, 'loadUserProfile(' + JSON.stringify(user) + ')'));
    const e2 = ctxFor({ readFails: true, boss: true });
    await run(e2, 'loadUserProfile(' + JSON.stringify(user) + ')');
  });
});

describe('Clients : l\'employé ne charge que les siens', () => {
  const code = extractFn('cliBaseQuery');
  function ctxFor(isAdmin) {
    const log = [];
    const q = (path) => ({ path, where: (...a) => { log.push(a); return q(path + '+where'); } });
    const ctx = sandbox({ isAdmin, currentUser: { uid: 'empA' }, db: { collection: (n) => q(n) } });
    run(ctx, code);
    return { ctx, log };
  }
  it('employé : requête filtrée par uid', () => {
    const { ctx, log } = ctxFor(false);
    run(ctx, 'cliBaseQuery()');
    assert.deepEqual(log, [['uid', '==', 'empA']]);
  });
  it('patron / administrateur : requête non filtrée', () => {
    const { ctx, log } = ctxFor(true);
    run(ctx, 'cliBaseQuery()');
    assert.equal(log.length, 0);
  });
  it('aucune lecture de clients sans filtre dans le code', () => {
    assert.equal((app.match(/db\.collection\('clients'\)\.get\(\)/g) || []).length, 0);
    assert.equal((app.match(/db\.collection\('clients'\)\.where\('tel'/g) || []).length, 0);
    assert.equal((app.match(/cliBaseQuery\(\)/g) || []).length >= 5, true);
  });
});

describe('Fournisseurs : réservés au patron et à l\'administrateur', () => {
  it('chaque fonction qui lit ou écrit « fournisseurs » est protégée', () => {
    const fnStarts = [...app.matchAll(/(?:async\s+)?function\s+([A-Za-z0-9_]+)\s*\(/g)].map((m) => ({ name: m[1], at: m.index }));
    const enclosing = (idx) => fnStarts.filter((f) => f.at < idx).pop().name;
    const names = new Set([...app.matchAll(/collection\('fournisseurs'\)/g)].map((m) => enclosing(m.index)));
    assert.ok(names.size >= 5, 'fonctions attendues : ' + [...names]);
    for (const n of names) {
      const body = bodyOf(n);
      assert.ok(/if\(!isAdmin\)return;|if\(!foGuard\(\)\)return;|if\(!can\('suppr'\)\)return;/.test(body), `non protégée : ${n}`);
    }
  });
  it('envoi au fournisseur et enregistrement du fournisseur d\'une commande : administrateur seulement', () => {
    assert.match(bodyOf('waFournisseur'), /if\(!isAdmin\)return;/);
    assert.match(bodyOf('facSupSave'), /if\(!isAdmin\)return;/);
  });
  it('le formulaire de commande d\'un employé n\'affiche ni liste de fournisseurs ni leurs contacts', () => {
    const f = bodyOf('openNvCmd');
    assert.match(f, /\(!isAdmin\?'<section class="ui-card"><h2>Notes<\/h2>/);
    assert.equal(f.indexOf("fc-fourn-id") > f.indexOf('(!isAdmin?'), true);
  });
  it('la fiche commande masque le fournisseur à l\'employé', () => {
    assert.match(bodyOf('viewCmd'), /if\(isAdmin\)h\+='<section class="ui-card ui-in" style="--i:'\+\(i\+\+\)\+'"><h2>Fournisseur<\/h2>'/);
  });
  it('le document public d\'une commande ne contient aucun champ fournisseur (document privé réservé à l\'administrateur)', () => {
    const f = bodyOf('saveCmd');
    assert.doesNotMatch(f.slice(f.indexOf('var data={'), f.indexOf('showOv(')), /fournisseur/);
    assert.match(f, /if\(fOpt\)cb\.set\(db\.collection\('commandes_fourn'\)/);
  });
  it('prix fournisseurs (catalogue local) : jamais chargés pour un employé', () => {
    const ctx = sandbox({ isAdmin: false, supplierCatalog: null, localStorage: { getItem: () => JSON.stringify([{ name: 'X', cost: 1 }]) } });
    run(ctx, extractFn('loadLocalCatalog'));
    run(ctx, 'loadLocalCatalog()');
    assert.equal(run(ctx, 'supplierCatalog.length'), 0);
    ctx.isAdmin = true;
    run(ctx, 'loadLocalCatalog()');
    assert.equal(run(ctx, 'supplierCatalog.length'), 1);
  });
});

describe('Équipe : approbation par le patron', () => {
  it('la liste d\'équipe a une section « À approuver » et la fiche propose Approuver / Refuser', () => {
    assert.match(bodyOf('uiTeam'), /À approuver/);
    const m = bodyOf('uiMember');
    assert.match(m, /Approuver le compte/);
    assert.match(m, /Refuser la demande/);
    assert.match(m, /status!=='retire'&&status!=='en_attente'/);
  });
  it('le statut « en_attente » est bloquant partout où les statuts bloqués sont testés', () => {
    assert.match(app, /var UI_BLOCKED=\['en_attente','pause','suspendu','retire'\];/);
    assert.match(app, /var UI_MSTATUS=\{en_attente:/);
  });
  it('la page d\'inscription annonce l\'approbation du patron', () => {
    assert.match(html, /sera activé après l'approbation du patron/);
    assert.doesNotMatch(html, /actif tout de suite/);
  });
});

describe('Service worker', () => {
  it('la version du cache a été incrémentée', () => {
    assert.match(readFileSync(new URL('../sw.js', import.meta.url), 'utf8'), /CACHE_NAME = 'bgm-gestion-v7'/);
  });
});
