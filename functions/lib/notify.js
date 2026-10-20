'use strict';
// Notifications : qui reçoit quoi. Fonctions pures (testées sans Firebase).
// Règle de confidentialité : aucun montant, coût ni bénéfice dans les messages destinés aux administrateurs ou aux employés.
// Seul le message « vente importante » (destiné au patron seul) contient un montant.

const ACTIF = (u) => !u || !u.statut || u.statut === 'actif';
const nom = (s, d) => String(s || d || '').trim().slice(0, 60);
const plur = (n, w) => n + ' ' + w + (n > 1 ? 's' : '');

function mk(type, docId, audience, title, body, url) {
  return { type, audience, payload: { title, body, url: url || './', tag: type + ':' + docId, type } };
}

function planCommandeCreee(id, c) {
  if (!c) return null;
  const n = c.nbArticles || (Array.isArray(c.produits) ? c.produits.reduce((a, p) => a + (p.qty || 1), 0) : 1);
  return mk('commande.creee', id, { patron: true, admins: true }, 'Nouvelle commande',
    [nom(c.num, 'Commande'), nom(c.client, 'Client'), plur(n, 'téléphone'), c.vendeur ? 'par ' + nom(c.vendeur) : ''].filter(Boolean).join(' · '), './#open=commande:' + id);
}
function planFactureAValider(id, f) {
  if (!f || f.validation !== 'a_valider') return null;
  return mk('facture.a_valider', id, { patron: true, admins: true }, 'Facture à valider',
    [nom(f.num, 'Facture'), nom(f.client, 'Client'), f.vendeur ? 'par ' + nom(f.vendeur) : ''].filter(Boolean).join(' · '), './#open=facture:' + id);
}
function planVenteImportante(id, f, seuil) {
  if (!f || !(seuil > 0) || !(f.total >= seuil) || f.validation === 'a_valider') return null;
  return mk('vente.importante', id, { patron: true }, 'Vente importante',
    [nom(f.num, 'Facture'), nom(f.client, 'Client'), Math.round(f.total).toLocaleString('fr-FR').replace(/[  ]/g, ' ') + ' F'].join(' · '), './#open=facture:' + id);
}
function planCompteEnAttente(uid, u) {
  if (!u || u.statut !== 'en_attente') return null;
  return mk('compte.en_attente', uid, { patron: true }, 'Nouveau compte à approuver', nom(u.nom || u.email, 'Nouveau membre') + ' demande un accès', './#open=equipe');
}
function planCompteApprouve(uid, before, after) {
  if (!before || !after || before.statut !== 'en_attente' || after.statut !== 'actif') return null;
  return mk('compte.approuve', uid, { uids: [uid] }, 'Compte approuvé', 'Tu peux maintenant te connecter à BG-MARKET Gestion.', './');
}
function planStockBas(id, before, after, seuil) {
  if (!before || !after) return null;
  const b = before.quantite || 0, a = after.quantite || 0, s = seuil == null ? 2 : seuil;
  const cross = (a <= s && b > s) || (a <= 0 && b > 0);
  if (!cross) return null;
  const n = nom(after.nom || after.modele || ((after.marque || '') + ' ' + (after.modele || '')), 'Produit');
  return mk('stock.bas', id, { patron: true, admins: true }, a <= 0 ? 'Rupture de stock' : 'Stock bas', n + (a <= 0 ? ' : plus aucun en stock' : ' : ' + plur(a, 'restant')), './#open=produit:' + id);
}
const STATUTS = { validee: 'validée', envoyee: 'envoyée au fournisseur', livree: 'livrée', annulee: 'annulée' };
function planCommandeStatut(id, before, after) {
  if (!before || !after || before.statut === after.statut || !STATUTS[after.statut] || !after.uid) return null;
  return mk('commande.statut', id, { uids: [after.uid] }, 'Commande ' + STATUTS[after.statut], nom(after.num, 'Commande') + ' · ' + nom(after.client, 'Client'), './#open=commande:' + id);
}

/* Destinataires : patron (UID), administrateurs actifs, utilisateurs nommés actifs. Jamais un compte suspendu, en pause, retiré ou en attente. */
function selectRecipients(users, audience, patronUid) {
  const out = new Set();
  const byId = {};
  (users || []).forEach((u) => { byId[u.id] = u; });
  if (audience.patron && patronUid) out.add(patronUid);
  if (audience.admins) (users || []).forEach((u) => { if (u.role === 'administrateur' && ACTIF(u)) out.add(u.id); });
  (audience.uids || []).forEach((id) => { if (byId[id] ? ACTIF(byId[id]) : false) out.add(id); });
  return [...out];
}
/* Appareils : un jeton une seule fois, et seulement si le type n'est pas désactivé dans les préférences */
function selectDevices(devices, type) {
  const seen = new Set(), res = [];
  (devices || []).forEach((d) => {
    if (!d || !d.token || seen.has(d.token)) return;
    if (d.prefs && d.prefs[type] === false) return;
    seen.add(d.token); res.push(d);
  });
  return res;
}

module.exports = { planCommandeCreee, planFactureAValider, planVenteImportante, planCompteEnAttente, planCompteApprouve, planStockBas, planCommandeStatut, selectRecipients, selectDevices };
