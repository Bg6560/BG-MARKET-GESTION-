// Notifications : destinataires, contenu (aucune donnée financière hors patron), doublons, jetons périmés.
// La partie « envoi » utilise l'émulateur Firestore et un faux service FCM : aucun message réel n'est envoyé.
import { createRequire } from 'node:module';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const require = createRequire(import.meta.url);
const n = require('../functions/lib/notify.js');
const { dispatch } = require('../functions/lib/dispatch.js');

const users = [
  { id: 'pat', role: 'admin', statut: 'actif' },
  { id: 'adm1', role: 'administrateur', statut: 'actif' },
  { id: 'adm2', role: 'administrateur' },                       // ancien profil sans statut
  { id: 'admS', role: 'administrateur', statut: 'suspendu' },
  { id: 'empA', role: 'employe', statut: 'actif' },
  { id: 'empP', role: 'employe', statut: 'pause' },
  { id: 'new', role: 'employe', statut: 'en_attente' },
];

describe('Qui reçoit quoi', () => {
  it('nouvelle commande : patron et administrateurs actifs seulement', () => {
    const p = n.planCommandeCreee('c1', { num: 'CMD-1', client: 'Client Test', nbArticles: 2, vendeur: 'Awa', total: 123456, coutCatalogue: 99999, profit: 5000 });
    assert.deepEqual(n.selectRecipients(users, p.audience, 'pat').sort(), ['adm1', 'adm2', 'pat']);
    assert.equal(p.payload.tag, 'commande.creee:c1');
    assert.match(p.payload.body, /2 téléphones/);
    assert.doesNotMatch(JSON.stringify(p.payload), /123456|99999|5000|profit|cout/i, 'aucune donnée financière');
  });
  it('facture à valider : seulement si elle l\'est ; sans montant', () => {
    assert.equal(n.planFactureAValider('f1', { validation: 'validee' }), null);
    const p = n.planFactureAValider('f1', { validation: 'a_valider', num: 'FAC-3', client: 'C', vendeur: 'Awa', total: 777000, profit: 1 });
    assert.doesNotMatch(JSON.stringify(p.payload), /777000|777 000/);
    assert.equal(p.payload.url, './#open=facture:f1');
  });
  it('vente importante : patron seul (le montant n\'est jamais envoyé aux autres)', () => {
    assert.equal(n.planVenteImportante('f', { total: 100, validation: 'validee' }, 500000), null);
    assert.equal(n.planVenteImportante('f', { total: 900000, validation: 'a_valider' }, 500000), null);
    assert.equal(n.planVenteImportante('f', { total: 900000, validation: 'validee' }, 0), null);
    const p = n.planVenteImportante('f', { total: 900000, num: 'FAC-9', client: 'C', validation: 'validee' }, 500000);
    assert.deepEqual(n.selectRecipients(users, p.audience, 'pat'), ['pat']);
    assert.match(p.payload.body, /900 000 F/);
  });
  it('compte en attente : patron seul ; compte approuvé : l\'intéressé seulement', () => {
    const p = n.planCompteEnAttente('new', { statut: 'en_attente', nom: 'Jean Recrue' });
    assert.deepEqual(n.selectRecipients(users, p.audience, 'pat'), ['pat']);
    assert.equal(n.planCompteEnAttente('x', { statut: 'actif' }), null);
    const a = n.planCompteApprouve('empA', { statut: 'en_attente' }, { statut: 'actif' });
    assert.deepEqual(n.selectRecipients(users, a.audience, 'pat'), ['empA']);
    assert.equal(n.planCompteApprouve('empA', { statut: 'actif' }, { statut: 'actif' }), null);
    assert.deepEqual(n.selectRecipients(users, { uids: ['empP', 'admS', 'new'] }, 'pat'), [], 'jamais un compte en pause, suspendu ou en attente');
  });
  it('stock : alerte au franchissement du seuil et à la rupture, pas à chaque variation', () => {
    assert.equal(n.planStockBas('p', { quantite: 5 }, { quantite: 4, modele: 'X' }, 2), null);
    assert.match(n.planStockBas('p', { quantite: 3 }, { quantite: 2, modele: 'Phone Test' }, 2).payload.body, /2 restants/);
    assert.equal(n.planStockBas('p', { quantite: 2 }, { quantite: 1, modele: 'X' }, 2), null, 'déjà sous le seuil');
    assert.equal(n.planStockBas('p', { quantite: 1 }, { quantite: 0, modele: 'X' }, 2).payload.title, 'Rupture de stock');
    assert.equal(n.planStockBas('p', { quantite: 0 }, { quantite: 10, modele: 'X' }, 2), null, 'réapprovisionnement');
  });
  it('statut de commande : au vendeur seulement', () => {
    const p = n.planCommandeStatut('c', { statut: 'en_attente' }, { statut: 'validee', uid: 'empA', num: 'CMD-1', client: 'C', total: 5000 });
    assert.deepEqual(n.selectRecipients(users, p.audience, 'pat'), ['empA']);
    assert.doesNotMatch(JSON.stringify(p.payload), /5000/);
    assert.equal(n.planCommandeStatut('c', { statut: 'validee' }, { statut: 'validee', uid: 'empA' }), null);
  });
  it('appareils : préférences respectées, jeton unique', () => {
    const d = n.selectDevices([{ token: 'a' }, { token: 'a' }, { token: 'b', prefs: { 'stock.bas': false } }, { token: 'c', prefs: { 'stock.bas': true } }, {}], 'stock.bas');
    assert.deepEqual(d.map((x) => x.token), ['a', 'c']);
  });
});

describe('Envoi (émulateur Firestore, faux FCM)', () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'à lancer par npm run test:rules');
  const db = getFirestore(initializeApp({ projectId: 'demo-bgmarket' }, 'notify-test'));
  const calls = [];
  const messaging = { sendEachForMulticast: async (m) => { calls.push(m); return { responses: m.tokens.map((t) => (t === 'perime' ? { success: false, error: { code: 'messaging/registration-token-not-registered' } } : { success: true })) }; } };
  beforeEach(async () => {
    calls.length = 0;
    await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/demo-bgmarket/databases/(default)/documents`, { method: 'DELETE' });
    for (const u of users) { const { id, ...d } = u; await db.collection('users').doc(id).set(d); }
    const dev = (id, uid, token, extra = {}) => db.collection('appareils').doc(id).set({ uid, token, plateforme: 'web', ...extra });
    await dev('pat_t1', 'pat', 'tok-pat'); await dev('adm1_t1', 'adm1', 'tok-adm1'); await dev('adm1_t2', 'adm1', 'perime');
    await dev('empA_t1', 'empA', 'tok-empA'); await dev('admS_t1', 'admS', 'tok-admS'); await dev('adm2_t1', 'adm2', 'tok-adm2', { prefs: { 'commande.creee': false } });
  });
  const send = (plan, eventId) => dispatch({ db, messaging, FieldValue, patronUid: 'pat', plan, eventId });

  it('envoie aux bons appareils uniquement, en message « data », et retire les jetons périmés', async () => {
    const r = await send(n.planCommandeCreee('c1', { num: 'CMD-1', client: 'C', nbArticles: 1 }), 'evt1');
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0].tokens.sort(), ['perime', 'tok-adm1', 'tok-pat']);
    assert.equal(calls[0].notification, undefined, 'message de type data : le service worker affiche la notification');
    assert.equal(calls[0].data.tag, 'commande.creee:c1');
    assert.equal(r.sent, 2);
    assert.equal((await db.collection('appareils').doc('adm1_t2').get()).exists, false, 'jeton périmé supprimé');
    assert.equal((await db.collection('appareils').doc('adm1_t1').get()).exists, true);
  });
  it('un même événement rejoué n\'envoie jamais deux fois', async () => {
    const plan = n.planCommandeCreee('c1', { num: 'CMD-1', client: 'C', nbArticles: 1 });
    await send(plan, 'evt-doublon');
    const r2 = await send(plan, 'evt-doublon');
    assert.equal(r2.skipped, 'doublon');
    assert.equal(calls.length, 1);
    await send(plan, 'evt-autre');
    assert.equal(calls.length, 2);
  });
  it('compte en attente : seul l\'appareil du patron reçoit', async () => {
    await send(n.planCompteEnAttente('new', { statut: 'en_attente', nom: 'Jean' }), 'evt3');
    assert.deepEqual(calls[0].tokens, ['tok-pat']);
  });
  it('aucun appareil enregistré ou aucun destinataire : rien n\'est envoyé, sans erreur', async () => {
    await db.collection('appareils').doc('pat_t1').delete();
    const r = await send(n.planCompteEnAttente('new', { statut: 'en_attente', nom: 'Jean' }), 'evt4');
    assert.equal(r.sent, 0);
    assert.equal(calls.length, 0);
    assert.deepEqual(await send(null, 'evt5'), { skipped: 'rien à envoyer' });
  });
});
