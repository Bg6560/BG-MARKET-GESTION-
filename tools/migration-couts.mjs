#!/usr/bin/env node
// Copie des coûts historiques vers les collections privées. SIMULATION par défaut.
//   node tools/migration-couts.mjs --project <id>                                   (simulation, lecture seule)
//   node tools/migration-couts.mjs --project <id> --backup <dossier> --apply --confirm <id>   (copie réelle)
// Identifiants : GOOGLE_APPLICATION_CREDENTIALS (compte de service) ou émulateur (FIRESTORE_EMULATOR_HOST).
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { writeFileSync, mkdirSync } from 'node:fs';
import { run } from './lib/migration.mjs';

const args = process.argv.slice(2);
const opt = (n) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : undefined; };
const has = (n) => args.includes('--' + n);
const project = opt('project') || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
if (!project) { console.error('Indiquer --project <id du projet Firebase>.'); process.exit(2); }
const apply = has('apply');
const emulator = !!process.env.FIRESTORE_EMULATOR_HOST;
if (apply && !emulator && opt('confirm') !== project) {
  console.error(`Copie réelle refusée : ajouter --confirm ${project} pour confirmer le projet.`); process.exit(2);
}
if (apply && !opt('backup')) { console.error('Copie réelle refusée : ajouter --backup <dossier> (sauvegarde obligatoire).'); process.exit(2); }

initializeApp({ projectId: project });
const db = getFirestore();
const listAuthUids = has('auth') ? async () => {
  const uids = []; let token;
  do { const r = await getAuth().listUsers(1000, token); r.users.forEach((u) => uids.push(u.uid)); token = r.pageToken; } while (token);
  return uids;
} : null;

const report = await run({ db, FieldValue, apply, backupDir: opt('backup') || null, listAuthUids, log: (m) => console.error('·', m) });
mkdirSync('tools/out', { recursive: true });
const file = `tools/out/rapport-${apply ? 'apply' : 'simulation'}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
writeFileSync(file, JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify({ ...report, audit: { ...report.audit, clientsSansProprietaire: report.audit.clientsSansProprietaire.length, clientsProprietaireInconnu: report.audit.clientsProprietaireInconnu.length, profilsSansStatut: report.audit.profilsSansStatut.length } }, null, 2));
console.error(`Rapport détaillé (identifiants seulement) : ${file}`);
process.exit(report.erreurs.length ? 1 : 0);
