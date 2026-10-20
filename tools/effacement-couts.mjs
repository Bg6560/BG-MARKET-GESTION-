#!/usr/bin/env node
// Retire les anciens champs financiers des documents publics (commandes, factures, produits). SIMULATION par défaut.
//   node tools/effacement-couts.mjs --project <id>                                                (simulation, lecture seule)
//   node tools/effacement-couts.mjs --project <id> --backup sauvegardes/avant-effacement --apply --confirm <id>
// À lancer seulement APRÈS la copie des coûts (tools/migration-couts.mjs --apply) : un document dont la copie privée
// manque n'est jamais touché. Une sauvegarde complète est faite automatiquement juste avant l'effacement.
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { mkdirSync, writeFileSync } from 'node:fs';
import { effacer } from './lib/migration.mjs';

const args = process.argv.slice(2);
const opt = (n) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : undefined; };
const has = (n) => args.includes('--' + n);
const project = opt('project') || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
if (!project) { console.error('Indiquer --project <id du projet Firebase>.'); process.exit(2); }
const apply = has('apply');
const emulator = !!process.env.FIRESTORE_EMULATOR_HOST;
if (apply && !emulator && opt('confirm') !== project) { console.error(`Effacement refusé : ajouter --confirm ${project}.`); process.exit(2); }
if (apply && !opt('backup')) { console.error('Effacement refusé : ajouter --backup <dossier> (sauvegarde obligatoire).'); process.exit(2); }
initializeApp({ projectId: project });
const r = await effacer({ db: getFirestore(), FieldValue, apply, backupDir: opt('backup') || null, log: (m) => console.error('·', m) });
mkdirSync('tools/out', { recursive: true });
const file = `tools/out/effacement-${apply ? 'apply' : 'simulation'}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
writeFileSync(file, JSON.stringify(r, null, 2), { mode: 0o600 });
console.log(JSON.stringify({ ...r, copierDabord: Object.fromEntries(Object.entries(r.copierDabord).map(([k, v]) => [k, v.length])) }, null, 2));
const reste = Object.values(r.copierDabord).reduce((a, v) => a + v.length, 0);
if (reste) console.error(`${reste} document(s) ignoré(s) : lancer d'abord la copie des coûts (détail : ${file}).`);
