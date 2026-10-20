// Service worker : démarrage hors ligne et notifications, exécutés avec de faux objets du navigateur (sans réseau).
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const src = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

function boot({ online = true, cached = {} } = {}) {
  const handlers = {}, shown = [], opened = [], posts = [], caches = new Map(), cacheStore = { ...cached };
  const mkResp = (body, ok = true) => ({ ok, body, clone() { return this; } });
  const cache = {
    add: async (req) => { if (!online) throw new Error('offline'); cacheStore[typeof req === 'string' ? req : req.url] = mkResp('shell'); },
    put: async (k, v) => { cacheStore[typeof k === 'string' ? k : k.url] = v; },
  };
  const self = {
    addEventListener: (n, f) => { handlers[n] = f; },
    skipWaiting() {}, clients: { claim: async () => {}, matchAll: async () => self._clients || [], openWindow: async (u) => { opened.push(u); } },
    registration: { showNotification: async (t, o) => { shown.push({ t, o }); } },
  };
  const ctx = vm.createContext({
    self, console, Promise, Request: class { constructor(u) { this.url = u; } },
    Response: { error: () => ({ error: true }) },
    caches: { open: async () => cache, keys: async () => ['bgm-gestion-v1'], delete: async (k) => { caches.set(k, 'deleted'); return true; },
      match: async (req) => cacheStore[typeof req === 'string' ? req : req.url] || undefined },
    fetch: async (req) => { if (!online) throw new Error('offline'); return mkResp('réseau:' + (req.url || req)); },
  });
  vm.runInContext(src, ctx);
  const wait = [];
  const fire = (name, ev) => { ev.waitUntil = (p) => wait.push(p); ev.respondWith = (p) => { ev._resp = p; }; handlers[name](ev); return ev; };
  return { handlers, shown, opened, fire, wait, self, cacheStore, posts, caches };
}

describe('Service worker : démarrage hors ligne', () => {
  it('la page est mise en cache à l\'installation', async () => {
    const sw = boot();
    sw.fire('install', {});
    await Promise.all(sw.wait);
    assert.ok(sw.cacheStore['./index.html'], 'page mise en cache');
  });
  it('en ligne : la page vient du réseau et la copie locale est mise à jour', async () => {
    const sw = boot();
    const ev = sw.fire('fetch', { request: { method: 'GET', url: 'https://app.test/', mode: 'navigate' } });
    const r = await ev._resp;
    assert.match(r.body, /réseau/);
    await new Promise((r2) => setTimeout(r2, 10));
    assert.ok(sw.cacheStore['./index.html']);
  });
  it('hors ligne : la page est servie depuis la copie locale', async () => {
    const sw = boot({ online: false, cached: { './index.html': { ok: true, body: 'copie locale' } } });
    const ev = sw.fire('fetch', { request: { method: 'GET', url: 'https://app.test/', mode: 'navigate' } });
    assert.equal((await ev._resp).body, 'copie locale');
  });
  it('hors ligne sans copie : erreur propre (pas de blocage)', async () => {
    const sw = boot({ online: false });
    const ev = sw.fire('fetch', { request: { method: 'GET', url: 'https://app.test/', mode: 'navigate' } });
    assert.equal((await ev._resp).error, true);
  });
  it('les données Firestore, l\'authentification et les écritures ne passent jamais par le cache', () => {
    const sw = boot();
    for (const u of ['https://firestore.googleapis.com/x', 'https://identitytoolkit.googleapis.com/x', 'https://fcmregistrations.googleapis.com/x']) {
      const ev = sw.fire('fetch', { request: { method: 'GET', url: u, mode: 'cors' } });
      assert.equal(ev._resp, undefined, u);
    }
    const ev = sw.fire('fetch', { request: { method: 'POST', url: 'https://app.test/x', mode: 'cors' } });
    assert.equal(ev._resp, undefined);
  });
});

describe('Service worker : notifications push', () => {
  const push = (payload) => ({ data: { json: () => payload, text: () => JSON.stringify(payload) } });
  it('message FCM « data » : notification avec étiquette de dédoublonnage et lien', async () => {
    const sw = boot();
    sw.fire('push', push({ data: { title: 'Nouvelle commande', body: 'CMD-12 par Awa', tag: 'commande.creee:c1', url: './#open=commande:c1', type: 'commande.creee' }, from: '123' }));
    await Promise.all(sw.wait);
    assert.equal(sw.shown.length, 1);
    assert.equal(sw.shown[0].t, 'Nouvelle commande');
    assert.equal(sw.shown[0].o.tag, 'commande.creee:c1');
    assert.equal(sw.shown[0].o.data.url, './#open=commande:c1');
    assert.equal(sw.shown[0].o.renotify, false);
  });
  it('charge utile à plat et charge illisible : jamais d\'erreur', async () => {
    const sw = boot();
    sw.fire('push', push({ title: 'Stock bas', body: 'Phone : 1 restant', tag: 's:p1' }));
    sw.fire('push', { data: { json: () => { throw new Error('x'); }, text: () => 'texte brut' } });
    await Promise.all(sw.wait);
    assert.equal(sw.shown.length, 2);
    assert.equal(sw.shown[1].o.body, 'texte brut');
  });
  it('clic : ouvre l\'application sur la bonne page, ou réutilise la fenêtre ouverte', async () => {
    let sw = boot();
    let closed = false;
    sw.fire('notificationclick', { notification: { close: () => { closed = true; }, data: { url: './#open=facture:f1' } } });
    await Promise.all(sw.wait);
    assert.equal(closed, true);
    assert.deepEqual(sw.opened, ['./#open=facture:f1']);
    sw = boot();
    const msgs = []; let focused = false;
    sw.self._clients = [{ focus: async () => { focused = true; }, postMessage: (m) => msgs.push(m) }];
    sw.fire('notificationclick', { notification: { close() {}, data: { url: './#open=equipe' } } });
    await Promise.all(sw.wait);
    assert.equal(focused, true);
    assert.equal(msgs[0].type, 'bg-open');
    assert.equal(msgs[0].url, './#open=equipe');
    assert.equal(sw.opened.length, 0);
  });
});
