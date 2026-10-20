#!/usr/bin/env node
// Sauvegarde complète en lecture seule : un fichier JSON par collection dans le dossier indiqué.
//   GOOGLE_APPLICATION_CREDENTIALS=compte-de-service.json node tools/sauvegarde.mjs --project <id> --dir sauvegardes/avant-lancement
// N'écrit rien dans Firestore. Le dossier contient des données financières : il est ignoré par Git, à garder hors du dépôt.
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { backupAll } from './lib/migration.mjs';

const args = process.argv.slice(2);
const opt = (n) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : undefined; };
const project = opt('project') || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
const dir = opt('dir');
if (!project || !dir) { console.error('Usage : node tools/sauvegarde.mjs --project <id> --dir <dossier>'); process.exit(2); }
initializeApp({ projectId: project });
const counts = await backupAll({ db: getFirestore(), dir, log: (m) => console.error('·', m) });
console.log(JSON.stringify({ projet: project, dossier: dir, collections: counts }, null, 2));
