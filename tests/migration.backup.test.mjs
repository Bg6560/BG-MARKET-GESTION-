// Sauvegarde complète : lecture seule, toutes les collections, données FICTIVES, émulateur.
import { mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { backupAll, BACKUP_ALL } from '../tools/lib/migration.mjs';

assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'à lancer par npm run test:rules');
const db = getFirestore(initializeApp({ projectId: 'demo-bgmarket' }, 'backup-test'));

describe('Sauvegarde complète', () => {
  it('écrit toutes les collections, conserve les dates, ne modifie rien', async () => {
    await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/demo-bgmarket/databases/(default)/documents`, { method: 'DELETE' });
    const t = Timestamp.fromDate(new Date('2026-09-01T10:00:00Z'));
    await db.collection('fournisseurs').doc('F1').set({ nom: 'Fournisseur Test' });
    await db.collection('catalogue_fournisseurs').doc('F1_x').set({ fournisseurId: 'F1', prixAchat: 1000, majAt: t });
    await db.collection('factures').doc('f1').set({ num: 'FAC-1', ts: t, total: 10 });
    await db.collection('factures_couts').doc('f1').set({ cost: 5, profit: 5 });
    await db.collection('app_config').doc('settings').set({ invNumR: 7 });
    await db.collection('appareils').doc('u_d').set({ token: 'jeton-secret' });
    const before = (await db.collection('factures').get()).size;
    const dir = mkdtempSync(join(tmpdir(), 'sauvegarde-'));
    const counts = await backupAll({ db, dir });
    assert.deepEqual(Object.keys(counts).sort(), [...BACKUP_ALL].sort());
    assert.equal(counts.fournisseurs, 1);
    assert.equal(counts.catalogue_fournisseurs, 1);
    const files = readdirSync(dir);
    for (const c of BACKUP_ALL) assert.ok(files.includes(`${c}.json`), c);
    assert.ok(files.includes('manifeste.json'));
    assert.equal(files.includes('appareils.json'), false, 'les jetons d\'appareils ne sont pas sauvegardés');
    const f = JSON.parse(readFileSync(join(dir, 'factures.json'), 'utf8'));
    assert.equal(f[0].data.ts.__timestamp, '2026-09-01T10:00:00.000Z');
    assert.equal((await db.collection('factures').get()).size, before, 'aucune écriture');
    assert.equal(JSON.parse(readFileSync(join(dir, 'manifeste.json'), 'utf8')).collections.factures, 1);
  });
  it('refuse de tourner sans dossier', async () => {
    await assert.rejects(backupAll({ db, dir: '' }));
  });
});
