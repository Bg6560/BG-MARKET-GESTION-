import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { doc, setDoc } from 'firebase/firestore';
import { launch, openApp, login, waitDashboard, clearAll, authSignUp, loadRules } from './harness.mjs';

let browser, env, uids = {};
before(async () => {
  await clearAll();
  uids.patron = await authSignUp('bgmarket99@gmail.com');
  env = await loadRules(uids.patron);
  browser = await launch();
});
after(async () => { await browser?.close(); await env?.cleanup(); });

describe('Smoke : le patron se connecte', () => {
  it('affiche le tableau de bord', async () => {
    const { page, errors, context } = await openApp(browser);
    await login(page, 'bgmarket99@gmail.com');
    await waitDashboard(page);
    await page.screenshot({ path: new URL('./shots/smoke-patron-desktop.png', import.meta.url).pathname });
    assert.deepEqual(errors, []);
    await context.close();
  });
});
