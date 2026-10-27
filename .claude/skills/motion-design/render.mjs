#!/usr/bin/env node
/* Motion design : création, aperçu et rendu MP4 d'une composition HTML.

   node render.mjs init    <dossier> [--format vertical|square|wide] [--duration 30] [--fps 30]
   node render.mjs preview <index.html> [--at 1,3.5,7]        → une image par scène + planche.png
   node render.mjs render  <index.html> [--out film.mp4] [--scale .5] [--fps 30]
                           [--music musique.mp3] [--music-volume .25]
                           [--voice voix.mp3[@1.5]] [--no-sfx]

   Le rendu met chaque animation en pause et la place à l'instant exact de chaque image
   (window.__mv.seek), puis envoie les captures à ffmpeg. Les bruitages déclarés dans
   <script id="mv-audio"> sont synthétisés par ffmpeg : aucun fichier audio à fournir. */

import { spawn } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const FORMATS = { vertical: [1080, 1920], square: [1080, 1080], wide: [1920, 1080] };

/* Petit lecteur d'arguments : positionnels + --clé valeur (ou --drapeau) */
function parseArgs(argv) {
  const pos = [], opt = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { pos.push(a); continue; }
    const k = a.slice(2);
    if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) opt[k] = argv[++i];
    else opt[k] = true;
  }
  return { pos, opt };
}

function run(cmd, args, input) {
  return new Promise((ok, ko) => {
    const p = spawn(cmd, args, { stdio: [input ? 'pipe' : 'ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => { err = (err + d).slice(-4000); });
    p.on('error', ko);
    p.on('close', (code) => (code === 0 ? ok() : ko(new Error(`${cmd} a échoué (${code})\n${err}`))));
    if (input) input(p.stdin);
  });
}

/* Chromium déjà installé dans l'environnement (même logique que tests/e2e/harness.mjs) */
async function launch() {
  const require = createRequire(import.meta.url);
  let pw;
  for (const name of ['playwright-core', 'playwright']) {
    try { pw = require(name); break; } catch { /* essai suivant */ }
    try { pw = createRequire(join(process.cwd(), 'x.js'))(name); break; } catch { /* essai suivant */ }
  }
  if (!pw) throw new Error('Playwright introuvable : lancer `npm install` à la racine du dépôt.');
  let executablePath = process.env.PW_CHROMIUM;
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  if (!executablePath && existsSync(base)) {
    const d = readdirSync(base).find((x) => /^chromium-\d+$/.test(x));
    if (d && existsSync(`${base}/${d}/chrome-linux/chrome`)) executablePath = `${base}/${d}/chrome-linux/chrome`;
  }
  return pw.chromium.launch({ executablePath, args: ['--no-sandbox', '--font-render-hinting=none'] });
}

/* Ouvre la composition en mode rendu et renvoie la page + ses réglages */
async function openComposition(browser, file, scale = 1) {
  const html = readFileSync(file, 'utf8');
  const attr = (n, d) => Number((html.match(new RegExp(`<body[^>]*data-${n}="([\\d.]+)"`)) || [])[1] || d);
  const width = attr('width', 1080), height = attr('height', 1920);
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: scale });
  await ctx.addInitScript(() => { window.__MV_RENDER = true; });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('requestfailed', (r) => errors.push(`ressource introuvable : ${r.url()}`));
  await page.goto(pathToFileURL(resolve(file)).href, { waitUntil: 'load' });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; }))));
  });
  if (errors.length) console.warn('⚠️  ' + errors.join('\n⚠️  '));
  const mv = await page.evaluate(() => window.__mv && { duration: __mv.duration, fps: __mv.fps });
  if (!mv) throw new Error('window.__mv absent : la composition doit garder le script moteur du modèle.');
  return { page, ...mv };
}

/* ---------- init ---------- */
function init(dir, opt) {
  const [w, h] = FORMATS[opt.format || 'vertical'] || FORMATS.vertical;
  mkdirSync(dir, { recursive: true });
  const target = join(dir, 'index.html');
  if (existsSync(target)) throw new Error(`${target} existe déjà.`);
  const html = readFileSync(join(here, 'template.html'), 'utf8')
    .replace(/data-width="\d+"/, `data-width="${w}"`).replace(/data-height="\d+"/, `data-height="${h}"`)
    .replace(/data-fps="\d+"/, `data-fps="${opt.fps || 30}"`)
    .replace(/data-duration="[\d.]+"/, `data-duration="${opt.duration || 15}"`);
  writeFileSync(target, html);
  copyFileSync(join(here, 'lib.css'), join(dir, 'lib.css'));
  mkdirSync(join(dir, 'assets'), { recursive: true });
  console.log(`Composition créée : ${target} (${w}×${h}). Mettre logo, captures et sons dans ${join(dir, 'assets')}/`);
}

/* ---------- preview ---------- */
async function preview(file, opt) {
  const out = join(dirname(file), 'out', 'apercu');
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  const browser = await launch();
  try {
    const { page } = await openComposition(browser, file, opt.scale ? Number(opt.scale) : 0.5);
    /* Par défaut : un instant par scène, une fois les entrées terminées */
    const times = opt.at ? String(opt.at).split(',').map(Number) : await page.evaluate(() =>
      [...document.querySelectorAll('.scene')].map((s) => {
        const cs = getComputedStyle(s), t0 = parseFloat(cs.getPropertyValue('--t0')), d = parseFloat(cs.getPropertyValue('--dur'));
        return +(t0 + Math.min(d * 0.7, d - 0.6)).toFixed(2);
      }));
    for (const [i, t] of times.entries()) {
      await page.evaluate((x) => __mv.seek(x), t);
      await page.screenshot({ path: join(out, `image-${String(i + 1).padStart(3, '0')}.png`) });
      console.log(`  image ${i + 1} → ${t}s`);
    }
    const cols = Math.min(times.length, 4), rows = Math.ceil(times.length / cols);
    await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', join(out, 'image-%03d.png'),
      '-vf', `scale=360:-2,pad=iw+16:ih+16:8:8:color=white,tile=${cols}x${rows}:color=white`, '-frames:v', '1', join(out, 'planche.png')]);
    console.log(`Aperçu : ${out}/planche.png`);
  } finally { await browser.close(); }
}

/* ---------- bruitages synthétisés ---------- */
const SFX = {
  whoosh: 'anoisesrc=d=0.7:c=pink:a=0.6,highpass=f=300,lowpass=f=4000,afade=t=in:d=0.35:curve=exp,afade=t=out:st=0.35:d=0.35',
  pop: "aevalsrc='0.7*sin(2*PI*(500+900*exp(-35*t))*t)*exp(-28*t)':d=0.18",
  click: "aevalsrc='0.5*sin(2*PI*2400*t)*exp(-140*t)':d=0.05",
  rise: "aevalsrc='0.35*sin(2*PI*(220*t+350*t*t))*min(1\\,t*1.2)':d=1,afade=t=out:st=0.85:d=0.15",
  impact: "aevalsrc='0.95*sin(2*PI*(45+90*exp(-9*t))*t)*exp(-4*t)':d=0.9",
};

async function buildAudio(file, opt, duration, tmp) {
  const inputs = [], filters = [];
  const add = (args, filter) => { inputs.push(...args); filters.push(`[${filters.length}:a]${filter}[a${filters.length}]`); };
  const ms = (t) => Math.max(0, Math.round(t * 1000));

  if (!opt['no-sfx']) {
    const m = readFileSync(file, 'utf8').match(/<script[^>]*id="mv-audio"[^>]*>([\s\S]*?)<\/script>/);
    const cues = m ? JSON.parse(m[1]).sfx || [] : [];
    for (const c of cues) {
      if (!SFX[c.s]) { console.warn(`⚠️  bruitage inconnu : ${c.s} (connus : ${Object.keys(SFX).join(', ')})`); continue; }
      const wav = join(tmp, `${c.s}.wav`);
      if (!existsSync(wav)) await run('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', SFX[c.s], '-ar', '48000', '-ac', '2', wav]);
      add(['-i', wav], `adelay=${ms(c.t)}:all=1,volume=${c.v ?? 0.8}`);
    }
  }
  if (opt.music) {
    const vol = opt['music-volume'] || 0.25;
    add(['-stream_loop', '-1', '-i', resolve(opt.music)],
      `atrim=0:${duration},afade=t=in:d=0.5,afade=t=out:st=${Math.max(0, duration - 1.5)}:d=1.5,volume=${vol}`);
  }
  if (opt.voice) {
    const [path, at = '0'] = String(opt.voice).split('@');
    add(['-i', resolve(path)], `adelay=${ms(Number(at))}:all=1,volume=1`);
  }
  if (!filters.length) return null;

  const wav = join(tmp, 'mix.wav');
  const labels = filters.map((_, i) => `[a${i}]`).join('');
  const graph = `${filters.join(';')};${labels}amix=inputs=${filters.length}:normalize=0:duration=longest,` +
    `apad,atrim=0:${duration},alimiter=limit=0.9[out]`;
  await run('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', graph, '-map', '[out]', '-ar', '48000', '-ac', '2', wav]);
  return wav;
}

/* ---------- render ---------- */
async function render(file, opt) {
  const outFile = resolve(opt.out || join(dirname(file), 'out', `${basename(dirname(resolve(file)))}.mp4`));
  mkdirSync(dirname(outFile), { recursive: true });
  const tmp = mkdtempSync(join(tmpdir(), 'motion-'));
  const browser = await launch();
  try {
    const comp = await openComposition(browser, file, opt.scale ? Number(opt.scale) : 1);
    const fps = Number(opt.fps || comp.fps), duration = comp.duration, total = Math.round(duration * fps);
    const silent = join(tmp, 'video.mp4');
    const started = Date.now();
    await run('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
      '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', silent],
    async (stdin) => {
      for (let f = 0; f < total; f++) {
        await comp.page.evaluate((t) => __mv.seek(t), f / fps);
        const jpg = await comp.page.screenshot({ type: 'jpeg', quality: 95 });
        if (!stdin.write(jpg)) await new Promise((r) => stdin.once('drain', r));
        if (f % fps === 0) process.stdout.write(`\r  ${Math.round((f / total) * 100)} %  (${f}/${total} images)`);
      }
      stdin.end();
      process.stdout.write('\r  100 %                         \n');
    });
    const audio = await buildAudio(file, opt, duration, tmp);
    const mux = audio ? ['-i', silent, '-i', audio, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest']
      : ['-i', silent, '-c:v', 'copy'];
    await run('ffmpeg', ['-y', '-loglevel', 'error', ...mux, '-movflags', '+faststart', outFile]);
    console.log(`Film : ${outFile}  (${duration}s, ${fps} i/s, rendu en ${Math.round((Date.now() - started) / 1000)}s)`);
  } finally {
    await browser.close();
    rmSync(tmp, { recursive: true, force: true });
  }
}

const { pos: [cmd, target], opt } = parseArgs(process.argv.slice(2));
const commands = { init, preview, render };
if (!commands[cmd] || !target) {
  console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 9).join('\n'));
  process.exit(1);
}
Promise.resolve(commands[cmd](target, opt)).catch((e) => { console.error(e.message); process.exit(1); });
