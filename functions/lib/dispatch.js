'use strict';
const { selectRecipients, selectDevices } = require('./notify');

const INVALID = ['messaging/registration-token-not-registered', 'messaging/invalid-registration-token', 'messaging/invalid-argument'];

/* Envoie une notification planifiée. Idempotent : un événement n'est traité qu'une fois (les déclencheurs Firestore peuvent être rejoués).
   db : Firestore (admin) ; messaging : { sendEachForMulticast } ; FieldValue : admin.firestore.FieldValue */
async function dispatch({ db, messaging, FieldValue, patronUid, plan, eventId, dryRun = false }) {
  if (!plan) return { skipped: 'rien à envoyer' };
  const key = (plan.type + ':' + eventId).replace(/\//g, '_');
  try {
    await db.collection('notifications_log').doc(key).create({ type: plan.type, tag: plan.payload.tag, at: FieldValue.serverTimestamp() });
  } catch (e) {
    if (e && (e.code === 6 || /already exists/i.test(e.message || ''))) return { skipped: 'doublon' };
    throw e;
  }
  const users = (await db.collection('users').get()).docs.map((d) => ({ id: d.id, ...d.data() }));
  const uids = selectRecipients(users, plan.audience, patronUid);
  if (!uids.length) return { sent: 0, destinataires: 0 };
  const docs = [];
  for (let i = 0; i < uids.length; i += 30) {
    const snap = await db.collection('appareils').where('uid', 'in', uids.slice(i, i + 30)).get();
    snap.docs.forEach((d) => docs.push({ ref: d.ref, ...d.data() }));
  }
  const devices = selectDevices(docs, plan.type);
  if (!devices.length) return { sent: 0, destinataires: uids.length };
  const data = {};
  Object.keys(plan.payload).forEach((k) => { data[k] = String(plan.payload[k]); });
  if (dryRun) {
    await db.collection('notifications_envoyees').doc(key).set({ ...data, uids, appareils: devices.length, at: FieldValue.serverTimestamp() });
    return { sent: devices.length, destinataires: uids.length, dryRun: true };
  }
  const res = await messaging.sendEachForMulticast({
    tokens: devices.map((d) => d.token), data,
    webpush: { headers: { Urgency: 'high', TTL: '86400' } },
  });
  let sent = 0;
  await Promise.all(res.responses.map(async (r, i) => {
    if (r.success) { sent++; return; }
    if (r.error && INVALID.includes(r.error.code)) await devices[i].ref.delete(); // jeton périmé : on le retire
  }));
  return { sent, failed: res.responses.length - sent, destinataires: uids.length };
}

module.exports = { dispatch };
