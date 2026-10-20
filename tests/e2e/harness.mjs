// Banc d'essai de bout en bout : la vraie page index.html dans Chromium, branchée sur les émulateurs
// Firestore + Auth (règles de firestore.rules chargées), avec des comptes et données FICTIFS.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';

export const PROJECT = 'demo-bgmarket';
export const ORIGIN = 'http://localhost:5173';
const root = new URL('../../', import.meta.url);
const sdk = (f) => readFileSync(new URL(`node_modules/firebase/${f}`, root), 'utf8');
export const PASSWORD = 'MotDePasse-Test-1';

export async function authSignUp(email) {
  const r = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD, returnSecureToken: true }),
  });
  const j = await r.json();
  if (!j.localId) throw new Error('création du compte de test impossible : ' + JSON.stringify(j));
  return j.localId;
}
export async function clearAll() {
  await fetch(`http://127.0.0.1:9099/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
  await fetch(`http://127.0.0.1:8080/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
}

/* Charge les règles du dépôt (UID du patron injecté) et renvoie l'environnement de test (écritures sans règles pour le semis) */
export async function loadRules(patronUid) {
  const rules = readFileSync(new URL('firestore.rules', root), 'utf8').replaceAll('PATRON_UID_A_REMPLACER', patronUid);
  return initializeTestEnvironment({ projectId: PROJECT, firestore: { rules, host: '127.0.0.1', port: 8080 } });
}

export async function launch() {
  /* Chromium déjà installé dans l'environnement (sinon celui de Playwright) */
  let executablePath = process.env.PW_CHROMIUM;
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  if (!executablePath && existsSync(base)) {
    const d = readdirSync(base).find((x) => /^chromium-\d+$/.test(x));
    if (d && existsSync(`${base}/${d}/chrome-linux/chrome`)) executablePath = `${base}/${d}/chrome-linux/chrome`;
  }
  const browser = await chromium.launch({ executablePath, args: ['--no-sandbox', '--no-proxy-server', '--disable-features=LocalNetworkAccessChecks,PrivateNetworkAccessSendPreflights,PrivateNetworkAccessRespectPreflightResults,BlockInsecurePrivateNetworkRequests,LocalNetworkAccessChecksWebSockets'] });
  return browser;
}

/* Ouvre l'application. opts : viewport, offline control via context */
export async function openApp(browser, { width = 1440, height = 900, log = null } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, serviceWorkers: 'block', reducedMotion: 'reduce', locale: 'fr-FR' });
  let html = readFileSync(new URL('index.html', root), 'utf8');
  html = html.replace('const auth=firebase.auth(),db=firebase.firestore(),ADMIN=',
    "const auth=firebase.auth(),db=firebase.firestore();auth.useEmulator('http://127.0.0.1:9099',{disableWarnings:true});db.useEmulator('127.0.0.1',8080);const ADMIN=");
  /* la reprise de connexion par redirection (Google) charge des iframes externes : inutile et bloquée en essai */
  html = html.replace('auth.getRedirectResult().catch(', 'Promise.resolve().catch(');
  html = html.replace('projectId:"bg-market-gestion"', `projectId:"${PROJECT}"`); // mêmes règles chargées que celles du banc d'essai
  if (!html.includes('useEmulator')) throw new Error('point d\'injection des émulateurs introuvable');
  const files = {
    'firebase-app-compat.js': sdk('firebase-app-compat.js'),
    'firebase-auth-compat.js': sdk('firebase-auth-compat.js'),
    'firebase-firestore-compat.js': sdk('firebase-firestore-compat.js'),
  };
  /* les émulateurs (127.0.0.1) ne passent pas par l'interception ; tout le reste d'Internet est coupé */
  await context.route((url) => !/^(http:\/\/127\.0\.0\.1|data:|blob:)/.test(url.href), async (route) => {
    const u = route.request().url();
    if (u.startsWith(ORIGIN)) {
      const path = new URL(u).pathname;
      if (path === '/' || path === '/index.html') return route.fulfill({ contentType: 'text/html; charset=utf-8', body: html });
      if (path === '/sw.js') return route.fulfill({ contentType: 'text/javascript', body: readFileSync(new URL('sw.js', root), 'utf8') });
      return route.fulfill({ status: 404, body: '' });
    }
    const m = /firebase-(app|auth|firestore)-compat\.js/.exec(u);
    if (m && u.includes('gstatic')) return route.fulfill({ contentType: 'text/javascript', body: files[`firebase-${m[1]}-compat.js`] });
    if (/html2canvas/.test(u)) return route.fulfill({ contentType: 'text/javascript', body: '' });
    if (u.startsWith('http://127.0.0.1') || u.startsWith('http://localhost') || u.startsWith('data:') || u.startsWith('blob:')) return route.continue();
    return route.abort(); // polices et tout autre service externe
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  if (log) {
    page.on('console', (m) => log('CONSOLE ' + m.type() + ' ' + m.text().slice(0, 300)));
    page.on('requestfailed', (r) => log('REQFAIL ' + r.url().slice(0, 140) + ' ' + (r.failure() && r.failure().errorText)));
    page.on('response', (r) => { if (!r.url().startsWith('data:') && !r.url().startsWith(ORIGIN)) log('RESP ' + r.status() + ' ' + r.url().slice(0, 120)); });
  }
  await page.goto(ORIGIN + '/index.html');
  return { context, page, errors };
}

export async function login(page, email) {
  await page.waitForSelector('#l-email', { state: 'visible', timeout: 15000 });
  await page.fill('#l-email', email);
  await page.fill('#l-pwd', PASSWORD);
  await page.click('#btn-login');
}
export async function waitDashboard(page) {
  await page.waitForSelector('#app-page', { state: 'visible', timeout: 20000 });
  await page.waitForSelector('.h-hello, .dash-hello, #main-content h1', { timeout: 20000 });
}
