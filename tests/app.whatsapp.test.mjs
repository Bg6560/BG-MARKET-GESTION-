// Contact des fournisseurs : WhatsApp Business de préférence sur Android, WhatsApp classique en secours.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = [...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).pop();
const fn = (name) => { const m = new RegExp(`function ${name}\\([^)]*\\)\\{[\\s\\S]*?\\n\\}`).exec(app); assert.ok(m, name); return m[0]; };
const one = (name) => { const m = new RegExp(`function ${name}\\([^)]*\\)\\{[^\\n]*\\}`).exec(app); assert.ok(m, name); return m[0]; };

function make(ua, pref) {
  const store = pref ? { bg_wa_app: pref } : {}, opened = [], loc = { href: '' };
  const ctx = vm.createContext({ navigator: { userAgent: ua }, localStorage: { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v; } },
    location: loc, window: { open: (u) => opened.push(u) }, encodeURIComponent });
  vm.runInContext([one('waPref'), one('waIsAndroid'), fn('waUrls'), fn('waSupplier')].join('\n'), ctx);
  return { ctx, opened, loc, run: (c) => vm.runInContext(c, ctx) };
}
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; SM-A155F) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36';
const PC = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36';

describe('WhatsApp fournisseurs', () => {
  it('Android, réglage par défaut : WhatsApp Business, numéro et message conservés, secours wa.me', () => {
    const t = make(ANDROID);
    assert.equal(t.run("waSupplier('2250700000001','Bonjour, commande : Galaxy A15 x2')"), 'business');
    const u = t.loc.href;
    assert.match(u, /^intent:\/\/send\/\?phone=2250700000001&text=Bonjour%2C%20commande%20%3A%20Galaxy%20A15%20x2#Intent;/);
    assert.match(u, /package=com\.whatsapp\.w4b;/);
    assert.match(u, /S\.browser_fallback_url=https%3A%2F%2Fwa\.me%2F2250700000001%3Ftext%3DBonjour/);
    assert.deepEqual(t.opened, []);
  });

  it('Android, « WhatsApp classique » choisi : lien wa.me habituel', () => {
    const t = make(ANDROID, 'standard');
    assert.equal(t.run("waSupplier('2250700000001','Salut')"), 'web');
    assert.deepEqual(t.opened, ['https://wa.me/2250700000001?text=Salut']);
    assert.equal(t.loc.href, '');
  });

  it('ordinateur / iPhone : wa.me (le choix de l\'application ne peut pas être imposé)', () => {
    const t = make(PC);
    t.run("waSupplier('2250700000001','')");
    assert.deepEqual(t.opened, ['https://wa.me/2250700000001']);
  });

  it('sans numéro (choisir le contact dans WhatsApp) : message seul', () => {
    const t = make(ANDROID);
    t.run("waSupplier('','Commande')");
    assert.match(t.loc.href, /^intent:\/\/send\/\?text=Commande#Intent;scheme=whatsapp;package=com\.whatsapp\.w4b;S\.browser_fallback_url=https%3A%2F%2Fwa\.me%2F%3Ftext%3DCommande;end$/);
  });

  it('les boutons fournisseurs passent par waSupplier ; ceux des clients ne changent pas', () => {
    for (const f of ['facSupPick', 'facSupOther', 'foWa']) assert.match(fn(f), /waSupplier\(/, f);
    assert.match(fn('viewFourn'), /onclick="waSupplier\(/);
    assert.match(fn('cliWa'), /wa\.me/);
  });
});
