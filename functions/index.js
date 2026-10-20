'use strict';
// Notifications push de BG-MARKET Gestion (Firebase Cloud Functions, 2e génération).
// Ne se déploie qu'avec le forfait Blaze et sur décision du patron : voir docs/NOTIFICATIONS.md.
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { defineString } = require('firebase-functions/params');
const { setGlobalOptions } = require('firebase-functions/v2');
const admin = require('firebase-admin');
const n = require('./lib/notify');
const { dispatch } = require('./lib/dispatch');

admin.initializeApp();
// À adapter : la région des fonctions doit être proche de la base Firestore (voir la console Firebase).
setGlobalOptions({ region: 'europe-west1', maxInstances: 5 });
const PATRON_UID = defineString('PATRON_UID');          // UID Firebase du patron (même valeur que dans firestore.rules)
const DRY_RUN = defineString('NOTIFY_DRY_RUN', { default: '' }); // « 1 » : n'envoie rien, écrit dans notifications_envoyees (essais)

const db = () => admin.firestore();
async function settings() { const s = await db().doc('app_config/settings').get(); return s.exists ? s.data() : {}; }
const send = (plan, event) => dispatch({ db: db(), messaging: admin.messaging(), FieldValue: admin.firestore.FieldValue, patronUid: PATRON_UID.value(), plan, eventId: event.id, dryRun: DRY_RUN.value() === '1' });

exports.notifCommandeCreee = onDocumentCreated('commandes/{id}', (e) => send(n.planCommandeCreee(e.params.id, e.data && e.data.data()), e));
exports.notifFactureCreee = onDocumentCreated('factures/{id}', async (e) => {
  const f = e.data && e.data.data();
  await send(n.planFactureAValider(e.params.id, f), e);
  await send(n.planVenteImportante(e.params.id, f, +(await settings()).seuilVenteImportante || 0), { id: 'v-' + e.id });
});
exports.notifFactureValidee = onDocumentUpdated('factures/{id}', async (e) => {
  const b = e.data.before.data(), a = e.data.after.data();
  if (b.validation === 'a_valider' && a.validation !== 'a_valider') await send(n.planVenteImportante(e.params.id, a, +(await settings()).seuilVenteImportante || 0), e);
});
exports.notifCompteCree = onDocumentCreated('users/{uid}', (e) => send(n.planCompteEnAttente(e.params.uid, e.data && e.data.data()), e));
exports.notifCompteMaj = onDocumentUpdated('users/{uid}', (e) => send(n.planCompteApprouve(e.params.uid, e.data.before.data(), e.data.after.data()), e));
exports.notifStock = onDocumentUpdated('produits/{id}', async (e) => send(n.planStockBas(e.params.id, e.data.before.data(), e.data.after.data(), (await settings()).stockAlerte), e));
exports.notifCommandeStatut = onDocumentUpdated('commandes/{id}', (e) => send(n.planCommandeStatut(e.params.id, e.data.before.data(), e.data.after.data()), e));
