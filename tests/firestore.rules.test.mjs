// Tests des règles Firestore sur l'émulateur, avec des comptes et des données FICTIFS.
import { readFileSync } from 'node:fs';
import { describe, it, before, after, beforeEach } from 'node:test';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs, writeBatch, serverTimestamp,
} from 'firebase/firestore';

const PATRON = 'patron-uid';
const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8')
  .replaceAll('SpFDcRyLzCb49xfVC6XHFNZHeLZ2', PATRON);

let env;
before(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-bgmarket', firestore: { rules, host: '127.0.0.1', port: 8080 } });
});
after(async () => { await env.cleanup(); });

const profils = {
  admin1: { role: 'administrateur', statut: 'actif', perms: { couts: true, suppr: false, reglages: true }, email: 'admin1@test.local' },
  admin2: { role: 'administrateur', statut: 'actif', perms: { couts: false, suppr: true, reglages: false }, email: 'admin2@test.local' },
  empA: { role: 'employe', statut: 'actif', email: 'a@test.local' },
  empB: { role: 'employe', statut: 'actif', email: 'b@test.local' },
  ancien: { role: 'employe', email: 'ancien@test.local' }, // ancien profil sans statut
  pause: { role: 'employe', statut: 'pause', email: 'pause@test.local' },
  suspendu: { role: 'employe', statut: 'suspendu', email: 's@test.local' },
  retire: { role: 'employe', statut: 'retire', email: 'r@test.local' },
  attente: { role: 'employe', statut: 'en_attente', email: 'w@test.local' },
  adminSuspendu: { role: 'administrateur', statut: 'suspendu', perms: { couts: true, suppr: true }, email: 'as@test.local' },
};

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    for (const [uid, p] of Object.entries(profils)) await setDoc(doc(db, 'users', uid), { uid, nom: uid, ...p });
    await setDoc(doc(db, 'app_config', 'settings'), { validationFactures: true, invNumR: 5, margeDefaut: 10, bizName: 'Boutique Test' });
    await setDoc(doc(db, 'clients', 'cA'), { nom: 'Client A', tel: '0100000001', uid: 'empA' });
    await setDoc(doc(db, 'clients', 'cB'), { nom: 'Client B', tel: '0100000002', uid: 'empB' });
    await setDoc(doc(db, 'clients', 'cOrphelin'), { nom: 'Client ancien', tel: '0100000003' });
    await setDoc(doc(db, 'fournisseurs', 'f1'), { nom: 'Fournisseur Test', whatsapp: '0100000009' });
    await setDoc(doc(db, 'produits', 'p1'), { modele: 'Phone Test', prixVente: 100000, quantite: 5 });
    await setDoc(doc(db, 'produits_prive', 'p1'), { prixAchat: 80000 });
    await setDoc(doc(db, 'commandes', 'cmdA'), { uid: 'empA', client: 'Client A', statut: 'en_attente', total: 100000 });
    await setDoc(doc(db, 'commandes', 'cmdB'), { uid: 'empB', client: 'Client B', statut: 'en_attente', total: 90000 });
    await setDoc(doc(db, 'commandes_couts', 'cmdA'), { uid: 'empA', coutCatalogue: 80000, profit: 20000 });
    await setDoc(doc(db, 'commandes_fourn', 'cmdA'), { fournisseurNom: 'Fournisseur Test' });
    await setDoc(doc(db, 'factures', 'facAattente'), { uid: 'empA', num: 'FAC-001', total: 100000, validation: 'a_valider', statut: 'en_attente' });
    await setDoc(doc(db, 'factures', 'facAvalidee'), { uid: 'empA', num: 'FAC-002', total: 100000, validation: 'validee', statut: 'en_attente' });
    await setDoc(doc(db, 'factures', 'facBattente'), { uid: 'empB', num: 'FAC-003', total: 50000, validation: 'a_valider', statut: 'en_attente' });
    await setDoc(doc(db, 'factures_couts', 'facAattente'), { uid: 'empA', cost: 80000, profit: 20000 });
    await setDoc(doc(db, 'precommandes', 'pA'), { uid: 'empA', client: 'Client A', prixTotal: 200000, versements: [] });
    await setDoc(doc(db, 'sav', 'sA'), { uid: 'empA', client: 'Client A', statut: 'depose' });
    await setDoc(doc(db, 'journal', 'j1'), { uid: 'empA', nom: 'A', role: 'employe', type: 'suppression', label: 'x', detail: '', vu: false });
  });
});

const as = (uid) => env.authenticatedContext(uid, { email: `${uid}@test.local` }).firestore();
const anon = () => env.unauthenticatedContext().firestore();
const ok = (p) => assertSucceeds(p);
const ko = (p) => assertFails(p);

describe('Comptes et statuts', () => {
  it('non connecté : aucun accès', async () => {
    await ko(getDoc(doc(anon(), 'clients', 'cA')));
    await ko(getDoc(doc(anon(), 'users', 'empA')));
  });
  for (const u of ['pause', 'suspendu', 'retire', 'attente', 'adminSuspendu', 'sansProfil']) {
    it(`${u} : aucune donnée protégée (lecture et écriture)`, async () => {
      const db = as(u);
      await ko(getDoc(doc(db, 'app_config', 'settings')));
      await ko(getDoc(doc(db, 'produits', 'p1')));
      await ko(getDocs(query(collection(db, 'clients'), where('uid', '==', u))));
      await ko(setDoc(doc(db, 'clients', 'nouveau'), { nom: 'X', uid: u }));
      await ko(getDoc(doc(db, 'fournisseurs', 'f1')));
      await ko(getDoc(doc(db, 'commandes_couts', 'cmdA')));
    });
  }
  it('un compte bloqué lit son propre profil (pour afficher le message)', async () => {
    await ok(getDoc(doc(as('suspendu'), 'users', 'suspendu')));
    await ko(getDoc(doc(as('suspendu'), 'users', 'empA')));
  });
  it('ancien profil sans statut : traité comme actif', async () => {
    await ok(getDoc(doc(as('ancien'), 'produits', 'p1')));
  });
  it('le patron n\'a pas besoin de profil', async () => {
    await ok(getDoc(doc(as(PATRON), 'clients', 'cA')));
  });
  it('un employé ne lit pas les profils des autres', async () => {
    await ko(getDoc(doc(as('empA'), 'users', 'empB')));
    await ok(getDoc(doc(as(PATRON), 'users', 'empB')));
  });
});

describe('Création de compte et protection des rôles', () => {
  const nouveau = { uid: 'nouveau', email: 'nouveau@test.local', nom: 'Nouveau', role: 'employe', statut: 'en_attente' };
  it('un nouveau compte se crée en « en_attente »', async () => {
    await ok(setDoc(doc(as('nouveau'), 'users', 'nouveau'), nouveau));
  });
  it('création refusée en « actif », en administrateur, avec droits, pour un autre uid ou un autre email', async () => {
    const db = as('nouveau');
    await ko(setDoc(doc(db, 'users', 'nouveau'), { ...nouveau, statut: 'actif' }));
    await ko(setDoc(doc(db, 'users', 'nouveau'), { ...nouveau, role: 'administrateur' }));
    await ko(setDoc(doc(db, 'users', 'nouveau'), { ...nouveau, perms: { suppr: true } }));
    await ko(setDoc(doc(db, 'users', 'nouveau'), { ...nouveau, email: 'patron@test.local' }));
    await ko(setDoc(doc(db, 'users', 'autre'), { ...nouveau, uid: 'autre' }));
  });
  it('un employé ne peut pas se promouvoir ni changer son statut, email ou uid', async () => {
    const db = as('empA');
    await ko(updateDoc(doc(db, 'users', 'empA'), { role: 'administrateur' }));
    await ko(updateDoc(doc(db, 'users', 'empA'), { statut: 'actif', perms: { suppr: true } }));
    await ko(updateDoc(doc(db, 'users', 'empA'), { email: 'patron@test.local' }));
    await ko(updateDoc(doc(db, 'users', 'empA'), { uid: 'autre' }));
    await ok(updateDoc(doc(db, 'users', 'empA'), { nom: 'Nouveau nom', isOnline: true }));
  });
  it('un employé ne modifie pas le profil d\'un autre ; le patron gère les rôles et statuts', async () => {
    await ko(updateDoc(doc(as('empA'), 'users', 'empB'), { nom: 'Pirate' }));
    await ok(updateDoc(doc(as(PATRON), 'users', 'attente'), { statut: 'actif' }));
    await ok(updateDoc(doc(as(PATRON), 'users', 'empA'), { role: 'administrateur', perms: { couts: true } }));
  });
  it('un compte suspendu ne peut plus modifier son profil', async () => {
    await ko(updateDoc(doc(as('suspendu'), 'users', 'suspendu'), { nom: 'x' }));
  });
});

describe('Clients', () => {
  it('l\'employé lit uniquement ses clients', async () => {
    await ok(getDoc(doc(as('empA'), 'clients', 'cA')));
    await ko(getDoc(doc(as('empA'), 'clients', 'cB')));
    await ko(getDoc(doc(as('empA'), 'clients', 'cOrphelin')));
    await ok(getDocs(query(collection(as('empA'), 'clients'), where('uid', '==', 'empA'))));
    await ko(getDocs(collection(as('empA'), 'clients')));
  });
  it('le patron et l\'administrateur lisent tous les clients, y compris sans propriétaire', async () => {
    for (const u of [PATRON, 'admin1', 'admin2']) {
      const snap = await assertSucceeds(getDocs(collection(as(u), 'clients')));
      if (snap.size !== 3) throw new Error(`${u} voit ${snap.size} clients au lieu de 3`);
    }
  });
  it('création : seulement à son nom', async () => {
    await ok(setDoc(doc(as('empA'), 'clients', 'n1'), { nom: 'N', uid: 'empA' }));
    await ko(setDoc(doc(as('empA'), 'clients', 'n2'), { nom: 'N', uid: 'empB' }));
    await ko(setDoc(doc(as('empA'), 'clients', 'n3'), { nom: 'N' }));
  });
  it('l\'employé ne modifie ni ne supprime aucun client', async () => {
    await ko(updateDoc(doc(as('empA'), 'clients', 'cA'), { nom: 'X' }));
    await ko(updateDoc(doc(as('empA'), 'clients', 'cB'), { nom: 'X' }));
    await ko(deleteDoc(doc(as('empA'), 'clients', 'cA')));
  });
  it('l\'administrateur modifie mais ne change pas le propriétaire ; le patron peut', async () => {
    await ok(updateDoc(doc(as('admin1'), 'clients', 'cA'), { nom: 'Corrigé' }));
    await ko(updateDoc(doc(as('admin1'), 'clients', 'cOrphelin'), { uid: 'empB' }));
    await ok(updateDoc(doc(as(PATRON), 'clients', 'cOrphelin'), { uid: 'empB' }));
  });
  it('suppression selon le droit « suppr »', async () => {
    await ko(deleteDoc(doc(as('admin1'), 'clients', 'cA')));
    await ok(deleteDoc(doc(as('admin2'), 'clients', 'cA')));
    await ok(deleteDoc(doc(as(PATRON), 'clients', 'cB')));
  });
});

describe('Fournisseurs', () => {
  it('refusés à l\'employé (lecture, liste, écriture)', async () => {
    await ko(getDoc(doc(as('empA'), 'fournisseurs', 'f1')));
    await ko(getDocs(collection(as('empA'), 'fournisseurs')));
    await ko(setDoc(doc(as('empA'), 'fournisseurs', 'f2'), { nom: 'X' }));
    await ko(updateDoc(doc(as('empA'), 'fournisseurs', 'f1'), { nom: 'X' }));
  });
  it('patron et administrateur : lecture et modification', async () => {
    for (const u of [PATRON, 'admin1', 'admin2']) {
      await ok(getDocs(collection(as(u), 'fournisseurs')));
      await ok(updateDoc(doc(as(u), 'fournisseurs', 'f1'), { ville: 'Abidjan' }));
    }
  });
  it('suppression selon « suppr »', async () => {
    await ko(deleteDoc(doc(as('admin1'), 'fournisseurs', 'f1')));
    await ok(deleteDoc(doc(as('admin2'), 'fournisseurs', 'f1')));
  });
});

describe('Factures', () => {
  const base = (uid) => ({
    uid, num: 'FAC-100', total: 50000, statut: 'en_attente', client: 'Client', products: [{ name: 'Phone', qty: 1, price: 50000 }],
    validation: 'a_valider', auto: false, ts: serverTimestamp(),
  });
  it('lecture : l\'employé voit les siennes seulement', async () => {
    await ok(getDoc(doc(as('empA'), 'factures', 'facAattente')));
    await ko(getDoc(doc(as('empA'), 'factures', 'facBattente')));
    await ko(getDocs(collection(as('empA'), 'factures')));
    await ok(getDocs(query(collection(as('empA'), 'factures'), where('uid', '==', 'empA'))));
    await ok(getDocs(collection(as('admin1'), 'factures')));
  });
  it('création : sa propre facture, en attente de validation', async () => {
    await ok(setDoc(doc(as('empA'), 'factures', 'n1'), base('empA')));
  });
  it('création refusée : facture d\'un autre, validation contournée, auto, validateur, coûts dans le document', async () => {
    const db = as('empA');
    await ko(setDoc(doc(db, 'factures', 'x1'), base('empB')));
    await ko(setDoc(doc(db, 'factures', 'x2'), { ...base('empA'), validation: 'validee' }));
    const { validation, ...sansValidation } = base('empA');
    await ko(setDoc(doc(db, 'factures', 'x3'), sansValidation));
    await ko(setDoc(doc(db, 'factures', 'x4'), { ...base('empA'), auto: true }));
    await ko(setDoc(doc(db, 'factures', 'x5'), { ...base('empA'), validePar: 'Patron' }));
    await ko(setDoc(doc(db, 'factures', 'x6'), { ...base('empA'), profit: 1000 }));
    await ko(setDoc(doc(db, 'factures', 'x7'), { ...base('empA'), cost: 1000 }));
    await ko(setDoc(doc(db, 'factures', 'x8'), { ...base('empA'), ts: new Date('2020-01-01') }));
  });
  it('si la validation est désactivée dans les réglages, l\'employé peut créer une facture validée', async () => {
    await env.withSecurityRulesDisabled(async (c) => updateDoc(doc(c.firestore(), 'app_config', 'settings'), { validationFactures: false }));
    await ok(setDoc(doc(as('empA'), 'factures', 'n2'), { ...base('empA'), validation: 'validee' }));
  });
  it('modification : sa facture non validée seulement', async () => {
    await ok(updateDoc(doc(as('empA'), 'factures', 'facAattente'), { total: 120000, client: 'Corrigé' }));
    await ko(updateDoc(doc(as('empA'), 'factures', 'facAvalidee'), { total: 1 }));
    await ko(updateDoc(doc(as('empA'), 'factures', 'facBattente'), { total: 1 }));
  });
  it('modification refusée : validation, propriétaire, validateur', async () => {
    const d = doc(as('empA'), 'factures', 'facAattente');
    await ko(updateDoc(d, { validation: 'validee' }));
    await ko(updateDoc(d, { uid: 'empB' }));
    await ko(updateDoc(d, { validePar: 'Moi', valideAt: serverTimestamp() }));
    await ko(updateDoc(d, { profit: 99999 }));
  });
  it('l\'administrateur valide et règle ; le patron aussi', async () => {
    await ok(updateDoc(doc(as('admin1'), 'factures', 'facBattente'), { validation: 'validee', validePar: 'Admin' }));
    await ok(updateDoc(doc(as(PATRON), 'factures', 'facAvalidee'), { statut: 'payee' }));
  });
  it('l\'administrateur crée une facture automatique pour un vendeur', async () => {
    await ok(setDoc(doc(as('admin1'), 'factures', 'auto1'), { ...base('empA'), validation: 'validee', auto: true }));
  });
  it('suppression selon « suppr »', async () => {
    await ko(deleteDoc(doc(as('empA'), 'factures', 'facAattente')));
    await ko(deleteDoc(doc(as('admin1'), 'factures', 'facAattente')));
    await ok(deleteDoc(doc(as('admin2'), 'factures', 'facAattente')));
  });
});

describe('Coûts, marges et bénéfices (collections privées)', () => {
  it('l\'employé ne lit aucun coût (le sien non plus)', async () => {
    for (const c of ['commandes_couts/cmdA', 'factures_couts/facAattente', 'produits_prive/p1', 'commandes_fourn/cmdA']) {
      const [col, id] = c.split('/');
      await ko(getDoc(doc(as('empA'), col, id)));
    }
  });
  it('lecture : patron et administrateur avec le droit « couts » seulement', async () => {
    await ok(getDoc(doc(as(PATRON), 'produits_prive', 'p1')));
    await ok(getDoc(doc(as('admin1'), 'commandes_couts', 'cmdA')));
    await ko(getDoc(doc(as('admin2'), 'commandes_couts', 'cmdA')));
    await ko(getDoc(doc(as('admin2'), 'factures_couts', 'facAattente')));
    await ko(getDoc(doc(as('admin2'), 'produits_prive', 'p1')));
  });
  it('fournisseur d\'une commande : patron et administrateur', async () => {
    await ok(getDoc(doc(as('admin2'), 'commandes_fourn', 'cmdA')));
    await ko(getDoc(doc(as('empB'), 'commandes_fourn', 'cmdA')));
  });
  it('l\'employé crée les coûts de SA commande dans le même lot', async () => {
    const db = as('empA');
    const b = writeBatch(db);
    b.set(doc(db, 'commandes', 'n1'), { uid: 'empA', statut: 'en_attente', client: 'C', total: 1 });
    b.set(doc(db, 'commandes_couts', 'n1'), { uid: 'empA', coutCatalogue: 500, profit: 100 });
    await ok(b.commit());
  });
  it('coûts refusés : sans commande, commande d\'un autre, uid d\'un autre', async () => {
    const db = as('empA');
    await ko(setDoc(doc(db, 'commandes_couts', 'orphelin'), { uid: 'empA', coutCatalogue: 1 }));
    await ko(setDoc(doc(db, 'commandes_couts', 'cmdB'), { uid: 'empA', coutCatalogue: 1 }));
    const b = writeBatch(db);
    b.set(doc(db, 'commandes', 'n2'), { uid: 'empA', statut: 'en_attente', client: 'C', total: 1 });
    b.set(doc(db, 'commandes_couts', 'n2'), { uid: 'empB', coutCatalogue: 1 });
    await ko(b.commit());
  });
  it('l\'employé ne modifie pas les coûts existants', async () => {
    await ko(updateDoc(doc(as('empA'), 'commandes_couts', 'cmdA'), { profit: 999999 }));
    await ko(deleteDoc(doc(as('empA'), 'commandes_couts', 'cmdA')));
  });
  it('l\'employé corrige les coûts de sa facture non validée seulement (sans pouvoir les relire)', async () => {
    await env.withSecurityRulesDisabled(async (c) => {
      const d = c.firestore();
      await setDoc(doc(d, 'factures_couts', 'facAvalidee'), { uid: 'empA', cost: 1, profit: 1 });
      await setDoc(doc(d, 'factures_couts', 'facBattente'), { uid: 'empB', cost: 1, profit: 1 });
    });
    const db = as('empA');
    await ok(updateDoc(doc(db, 'factures_couts', 'facAattente'), { cost: 70000, profit: 30000 }));
    await ko(updateDoc(doc(db, 'factures_couts', 'facAvalidee'), { cost: 1 }));
    await ko(updateDoc(doc(db, 'factures_couts', 'facBattente'), { cost: 1 }));
    await ko(updateDoc(doc(db, 'factures_couts', 'facAattente'), { uid: 'empB' }));
    await ko(getDoc(doc(db, 'factures_couts', 'facAattente')));
  });
  it('coûts de facture : création en lot par l\'employé, jamais dans la facture elle-même', async () => {
    const db = as('empA');
    const b = writeBatch(db);
    b.set(doc(db, 'factures', 'n3'), { uid: 'empA', num: 'F', total: 1, validation: 'a_valider', auto: false, ts: serverTimestamp() });
    b.set(doc(db, 'factures_couts', 'n3'), { uid: 'empA', cost: 50, profit: 10 });
    await ok(b.commit());
  });
  it('produits : prix d\'achat interdit dans le document public', async () => {
    await ko(setDoc(doc(as('admin1'), 'produits', 'p2'), { modele: 'X', prixVente: 1, prixAchat: 1, quantite: 1 }));
    await ok(setDoc(doc(as('admin1'), 'produits', 'p2'), { modele: 'X', prixVente: 1, quantite: 1 }));
    await ko(updateDoc(doc(as('admin1'), 'produits', 'p1'), { prixAchat: 1 }));
    await ok(setDoc(doc(as('admin1'), 'produits_prive', 'p2'), { prixAchat: 10 }));
    await ko(setDoc(doc(as('admin2'), 'produits_prive', 'p3'), { prixAchat: 10 }));
  });
  it('commandes : coûts et fournisseur interdits dans le document public (retrait des anciens champs permis)', async () => {
    await ko(setDoc(doc(as('empA'), 'commandes', 'x'), { uid: 'empA', statut: 'en_attente', profit: 5 }));
    await ko(setDoc(doc(as('empA'), 'commandes', 'x'), { uid: 'empA', statut: 'en_attente', fournisseurNom: 'F' }));
    await env.withSecurityRulesDisabled(async (c) => updateDoc(doc(c.firestore(), 'commandes', 'cmdA'), { coutCatalogue: 1, profit: 2 }));
    await ok(updateDoc(doc(as(PATRON), 'commandes', 'cmdA'), { statut: 'validee' })); // champs hérités laissés tels quels
    await ko(updateDoc(doc(as(PATRON), 'commandes', 'cmdA'), { profit: 3 }));
    const { deleteField } = await import('firebase/firestore');
    await ok(updateDoc(doc(as(PATRON), 'commandes', 'cmdA'), { profit: deleteField(), coutCatalogue: deleteField() })); // nettoyage
  });
});

describe('Commandes, précommandes, SAV', () => {
  it('lecture : propriétaire ou administrateur', async () => {
    await ok(getDoc(doc(as('empA'), 'commandes', 'cmdA')));
    await ko(getDoc(doc(as('empA'), 'commandes', 'cmdB')));
    await ko(getDocs(collection(as('empA'), 'commandes')));
    await ok(getDocs(collection(as('admin1'), 'commandes')));
    await ok(getDocs(collection(as(PATRON), 'commandes')));
  });
  it('création : à son nom et « en_attente »', async () => {
    await ok(setDoc(doc(as('empA'), 'commandes', 'n1'), { uid: 'empA', statut: 'en_attente', client: 'C', total: 1 }));
    await ko(setDoc(doc(as('empA'), 'commandes', 'n2'), { uid: 'empB', statut: 'en_attente' }));
    await ko(setDoc(doc(as('empA'), 'commandes', 'n3'), { uid: 'empA', statut: 'livree' }));
  });
  it('l\'employé ne modifie pas les commandes ; l\'administrateur change le statut', async () => {
    await ko(updateDoc(doc(as('empA'), 'commandes', 'cmdA'), { statut: 'livree' }));
    await ko(updateDoc(doc(as('empA'), 'commandes', 'cmdB'), { statut: 'annulee' }));
    await ok(updateDoc(doc(as('admin1'), 'commandes', 'cmdB'), { statut: 'validee' }));
    await ko(updateDoc(doc(as('admin1'), 'commandes', 'cmdB'), { uid: 'empA' }));
  });
  it('suppression selon « suppr »', async () => {
    await ko(deleteDoc(doc(as('empA'), 'commandes', 'cmdA')));
    await ko(deleteDoc(doc(as('admin1'), 'commandes', 'cmdA')));
    await ok(deleteDoc(doc(as('admin2'), 'commandes', 'cmdA')));
  });
  it('précommandes : l\'employé gère les siennes (versement) sans changer le propriétaire', async () => {
    await ok(updateDoc(doc(as('empA'), 'precommandes', 'pA'), { versements: [{ montant: 1000 }] }));
    await ko(updateDoc(doc(as('empA'), 'precommandes', 'pA'), { uid: 'empB' }));
    await ko(updateDoc(doc(as('empB'), 'precommandes', 'pA'), { versements: [] }));
    await ko(getDoc(doc(as('empB'), 'precommandes', 'pA')));
    await ok(getDoc(doc(as('admin1'), 'precommandes', 'pA')));
    await ok(setDoc(doc(as('empB'), 'precommandes', 'n'), { uid: 'empB', client: 'C' }));
    await ko(setDoc(doc(as('empB'), 'precommandes', 'm'), { uid: 'empA', client: 'C' }));
  });
  it('SAV : mêmes règles', async () => {
    await ok(updateDoc(doc(as('empA'), 'sav', 'sA'), { statut: 'en_reparation' }));
    await ko(updateDoc(doc(as('empB'), 'sav', 'sA'), { statut: 'pret' }));
    await ko(getDoc(doc(as('empB'), 'sav', 'sA')));
    await ok(updateDoc(doc(as('admin1'), 'sav', 'sA'), { statut: 'pret' }));
  });
});

describe('Produits et stock', () => {
  it('lecture pour tous les comptes actifs', async () => {
    await ok(getDocs(collection(as('empA'), 'produits')));
  });
  it('l\'employé peut seulement diminuer le stock', async () => {
    const d = doc(as('empA'), 'produits', 'p1');
    await ok(updateDoc(d, { quantite: 4 }));
    await ko(updateDoc(d, { quantite: 50 }));
    await ko(updateDoc(d, { quantite: -1 }));
    await ko(updateDoc(d, { quantite: 3.5 }));
    await ko(updateDoc(d, { prixVente: 1 }));
    await ko(updateDoc(d, { quantite: 2, prixVente: 1 }));
    await ko(setDoc(doc(as('empA'), 'produits', 'nouveau'), { modele: 'X', quantite: 1 }));
  });
  it('l\'administrateur gère le stock et les produits ; suppression selon « suppr »', async () => {
    await ok(updateDoc(doc(as('admin1'), 'produits', 'p1'), { quantite: 20 }));
    await ko(deleteDoc(doc(as('admin1'), 'produits', 'p1')));
    await ok(deleteDoc(doc(as('admin2'), 'produits', 'p1')));
  });
});

describe('Réglages et journal', () => {
  it('lecture des réglages pour les comptes actifs', async () => {
    await ok(getDoc(doc(as('empA'), 'app_config', 'settings')));
  });
  it('l\'employé ne modifie aucun réglage sauf le compteur de factures, vers le haut', async () => {
    const d = doc(as('empA'), 'app_config', 'settings');
    await ko(updateDoc(d, { bizName: 'Pirate' }));
    await ko(updateDoc(d, { validationFactures: false }));
    await ok(updateDoc(d, { invNumR: 6 }));
    await ko(updateDoc(d, { invNumR: 1 }));
    await ko(updateDoc(d, { invNumR: 6, bizName: 'x' }));
  });
  it('l\'administrateur : 3 réglages de travail, selon son droit', async () => {
    await ok(updateDoc(doc(as('admin1'), 'app_config', 'settings'), { margeDefaut: 15, stockAlerte: 3 }));
    await ko(updateDoc(doc(as('admin1'), 'app_config', 'settings'), { bizName: 'x' }));
    await ko(updateDoc(doc(as('admin2'), 'app_config', 'settings'), { margeDefaut: 15 }));
  });
  it('le patron modifie tout', async () => {
    await ok(updateDoc(doc(as(PATRON), 'app_config', 'settings'), { bizName: 'Nouveau nom', invNumR: 1 }));
  });
  it('journal : lecture réservée au patron ; création à son nom ; pas de suppression', async () => {
    const entree = { ts: serverTimestamp(), uid: 'empA', nom: 'A', role: 'employe', type: 'suppression', label: 'x', detail: '', vu: false };
    await ok(setDoc(doc(as('empA'), 'journal', 'n1'), entree));
    await ko(setDoc(doc(as('empA'), 'journal', 'n2'), { ...entree, uid: 'empB' }));
    await ko(setDoc(doc(as('empA'), 'journal', 'n3'), { ...entree, vu: true }));
    await ko(setDoc(doc(as('empA'), 'journal', 'n4'), { ...entree, extra: 'x' }));
    await ko(getDoc(doc(as('empA'), 'journal', 'j1')));
    await ko(getDoc(doc(as('admin1'), 'journal', 'j1')));
    await ko(updateDoc(doc(as('empA'), 'journal', 'j1'), { vu: true }));
    await ko(deleteDoc(doc(as('empA'), 'journal', 'j1')));
    await ok(getDoc(doc(as(PATRON), 'journal', 'j1')));
    await ok(updateDoc(doc(as(PATRON), 'journal', 'j1'), { vu: true }));
  });
});

describe('Collections inconnues', () => {
  it('refusées à tous, patron compris', async () => {
    for (const u of ['empA', 'admin1', PATRON]) {
      await ko(setDoc(doc(as(u), 'inconnue', 'x'), { a: 1 }));
      await ko(getDoc(doc(as(u), 'inconnue', 'x')));
    }
  });
});

describe('Écritures exactement telles que le code de l\'application les envoie (Lot 2B)', () => {
  const factureEmp = (uid) => ({
    num: 'FAC-010', date: '2026-10-19', statut: 'en_attente', client: 'Client', tel: '0100000001', addr: '', products: [{ name: 'Phone', qty: 1, price: 50000 }],
    sub: 50000, tvaR: 0, tva: 0, livraison: 0, total: 50000, notes: '', garantie: '', paiement: 'Cash', etatTel: 'neuf', biz: { name: 'Boutique' },
    vendeur: uid, vendeurEmail: `${uid}@test.local`, uid, validation: 'a_valider', auto: false, ts: serverTimestamp(),
  });
  it('employé : création d\'une facture + coûts dans le même lot', async () => {
    const db = as('empA');
    const b = writeBatch(db);
    b.set(doc(db, 'factures', 'F10'), factureEmp('empA'));
    b.set(doc(db, 'factures_couts', 'F10'), { uid: 'empA', ts: serverTimestamp(), cost: 40000, profit: 10000, costs: [40000] });
    await ok(b.commit());
  });
  it('employé : modification de sa facture en attente, sans toucher aux coûts', async () => {
    const db = as('empA');
    const b = writeBatch(db);
    const { uid, vendeur, vendeurEmail, ts, validation, auto, ...modifiable } = factureEmp('empA');
    b.update(doc(db, 'factures', 'facAattente'), { ...modifiable, total: 60000 });
    await ok(b.commit());
  });
  it('administrateur avec « couts » : modification de facture + coûts (document privé créé s\'il n\'existe pas)', async () => {
    const db = as('admin1');
    const b = writeBatch(db);
    b.update(doc(db, 'factures', 'facAvalidee'), { total: 70000, client: 'Corrigé' });
    b.set(doc(db, 'factures_couts', 'facAvalidee'), { uid: 'empA', ts: serverTimestamp(), cost: 1, profit: 2, costs: [1] }, { merge: true });
    await ok(b.commit());
  });
  it('administrateur sans « couts » : modification de facture sans document de coûts', async () => {
    await ok(updateDoc(doc(as('admin2'), 'factures', 'facAvalidee'), { total: 70000 }));
    await ko(setDoc(doc(as('admin2'), 'factures_couts', 'facAattente'), { uid: 'empA', cost: 1 }, { merge: true })); // coûts existants : modification réservée au droit « couts »
  });
  it('administrateur : facture automatique d\'une commande livrée (uid du vendeur) + coûts', async () => {
    const db = as('admin2');
    const b = writeBatch(db);
    b.set(doc(db, 'factures', 'AUTO'), { ...factureEmp('empA'), vendeur: 'A', validation: 'validee', auto: true, statut: 'payee', cmdId: 'cmdA', cmdNum: 'CMD-1' });
    b.set(doc(db, 'factures_couts', 'AUTO'), { uid: 'empA', ts: serverTimestamp(), cost: 0, profit: null, costs: [0] });
    await ok(b.commit());
  });
  it('administrateur : produit sans prix d\'achat + prix d\'achat à part', async () => {
    const db = as('admin1');
    const b = writeBatch(db);
    b.update(doc(db, 'produits', 'p1'), { marque: 'M', modele: 'Phone Test', stockage: '128 GB', ram: '', prixVente: 120000, quantite: 5, description: '' });
    b.set(doc(db, 'produits_prive', 'p1'), { prixAchat: 90000 }, { merge: true });
    await ok(b.commit());
  });
  it('administrateur : choix du fournisseur d\'une commande + changement de statut', async () => {
    const db = as('admin2');
    const b = writeBatch(db);
    b.set(doc(db, 'commandes_fourn', 'cmdB'), { uid: 'empB', ts: serverTimestamp(), fournisseurId: 'f1', fournisseurNom: 'Fournisseur Test', fournisseurWa: '0100' }, { merge: true });
    b.update(doc(db, 'commandes', 'cmdB'), { statut: 'envoyee' });
    await ok(b.commit());
  });
  it('suppression d\'une commande et de ses documents privés : droit « suppr » requis', async () => {
    const lot = (u) => { const db = as(u); const b = writeBatch(db); b.delete(doc(db, 'commandes', 'cmdA')); b.delete(doc(db, 'commandes_couts', 'cmdA')); b.delete(doc(db, 'commandes_fourn', 'cmdA')); return b.commit(); };
    await ko(lot('admin1'));
    await ko(lot('empA'));
    await ok(lot('admin2'));
  });
  it('employé : commande sans coût ni fournisseur dans le document public', async () => {
    const db = as('empA');
    const b = writeBatch(db);
    b.set(doc(db, 'commandes', 'N1'), { client: 'C', tel: '01', produit: 'Phone', produits: [{ name: 'Phone', qty: 1, prix: 1000 }], nbArticles: 1, prix: 1000, livraison: 0, total: 1000, etat: 'neuf', statut: 'en_attente', vendeur: 'A', vendeurEmail: 'a@test.local', uid: 'empA', num: 'CMD-1', ts: serverTimestamp() });
    b.set(doc(db, 'commandes_couts', 'N1'), { uid: 'empA', ts: serverTimestamp(), coutCatalogue: 0, profit: 0, costs: [0] });
    await ok(b.commit());
  });
});

describe('Mouvements de stock, catalogue fournisseurs, appareils (notifications)', () => {
  const mv = (uid, delta) => ({ produitId: 'p1', produit: 'Phone Test', delta, demande: Math.abs(delta), insuffisant: false, motif: 'vente', factureId: 'F1', uid, vendeurUid: uid, ts: serverTimestamp() });
  it('mouvements : l\'employé n\'enregistre que ses sorties, lecture admin, jamais de modification', async () => {
    await ok(setDoc(doc(as('empA'), 'mouvements_stock', 'm1'), mv('empA', -1)));
    await ko(setDoc(doc(as('empA'), 'mouvements_stock', 'm2'), mv('empA', 5)));
    await ko(setDoc(doc(as('empA'), 'mouvements_stock', 'm3'), mv('empB', -1)));
    await ko(setDoc(doc(as('empA'), 'mouvements_stock', 'm4'), { ...mv('empA', -1), extra: 1 }));
    await ko(getDoc(doc(as('empA'), 'mouvements_stock', 'm1')));
    await ok(getDoc(doc(as('admin1'), 'mouvements_stock', 'm1')));
    await ok(setDoc(doc(as('admin1'), 'mouvements_stock', 'm5'), { produitId: 'p1', delta: 4, motif: 'ajustement', uid: 'admin1', ts: serverTimestamp() }));
    await ko(updateDoc(doc(as(PATRON), 'mouvements_stock', 'm1'), { delta: 0 }));
    await ko(deleteDoc(doc(as(PATRON), 'mouvements_stock', 'm1')));
  });
  it('stock : lot « diminution du stock + mouvement » tel qu\'envoyé par l\'application (employé)', async () => {
    const db = as('empA');
    const { increment } = await import('firebase/firestore');
    const b = writeBatch(db);
    b.update(doc(db, 'produits', 'p1'), { quantite: increment(-2) });
    b.set(doc(db, 'mouvements_stock', 'm9'), mv('empA', -2));
    await ok(b.commit());
    const b2 = writeBatch(db);
    b2.update(doc(db, 'produits', 'p1'), { quantite: increment(-50) }); // sous zéro : refusé, sans bloquer les ventes (lot séparé)
    await ko(b2.commit());
  });
  it('catalogue fournisseurs : droit « couts » seulement', async () => {
    const e = { fournisseurId: 'f1', modele: 'Phone Test', prixAchat: 80000, majAt: serverTimestamp() };
    await ok(setDoc(doc(as('admin1'), 'catalogue_fournisseurs', 'c1'), e));
    await ok(getDoc(doc(as(PATRON), 'catalogue_fournisseurs', 'c1')));
    await ko(getDoc(doc(as('admin2'), 'catalogue_fournisseurs', 'c1')));
    await ko(setDoc(doc(as('admin2'), 'catalogue_fournisseurs', 'c2'), e));
    await ko(getDoc(doc(as('empA'), 'catalogue_fournisseurs', 'c1')));
    await ko(setDoc(doc(as('empA'), 'catalogue_fournisseurs', 'c3'), e));
    await ko(setDoc(doc(as('admin1'), 'catalogue_fournisseurs', 'c4'), { ...e, prixAchat: -5 }));
    await ko(setDoc(doc(as('admin1'), 'catalogue_fournisseurs', 'c5'), { ...e, fournisseurId: '' }));
  });
  it('appareils : un jeton par appareil, à son nom, visible de lui seul', async () => {
    const d = (uid) => ({ uid, token: 'jeton-fictif-123', plateforme: 'web', creeAt: serverTimestamp(), majAt: serverTimestamp() });
    await ok(setDoc(doc(as('empA'), 'appareils', 'empA_tel1'), d('empA')));
    await ok(updateDoc(doc(as('empA'), 'appareils', 'empA_tel1'), { token: 'jeton-renouvele', majAt: serverTimestamp() }));
    await ko(setDoc(doc(as('empA'), 'appareils', 'empB_tel1'), d('empA')));
    await ko(setDoc(doc(as('empA'), 'appareils', 'empA_tel2'), d('empB')));
    await ko(setDoc(doc(as('empA'), 'appareils', 'empA_tel3'), { ...d('empA'), role: 'patron' }));
    await ko(getDoc(doc(as('empB'), 'appareils', 'empA_tel1')));
    await ok(getDoc(doc(as('empA'), 'appareils', 'empA_tel1')));
    await ko(setDoc(doc(as('suspendu'), 'appareils', 'suspendu_t'), d('suspendu')));
    await ko(updateDoc(doc(as('empB'), 'appareils', 'empA_tel1'), { token: 'vol' }));
    await ok(deleteDoc(doc(as('empA'), 'appareils', 'empA_tel1')));
  });
});

describe('Identification du patron par UID (règles finales)', () => {
  it('un compte qui utilise l\'e-mail du patron mais un autre UID n\'a aucun droit de patron', async () => {
    const faux = env.authenticatedContext('imposteur', { email: 'bgmarket99@gmail.com', email_verified: true }).firestore();
    await ko(getDoc(doc(faux, 'users', 'empA')));
    await ko(getDocs(collection(faux, 'factures_couts')));
    await ko(updateDoc(doc(faux, 'users', 'empA'), { statut: 'suspendu' }));
    await ko(updateDoc(doc(faux, 'app_config', 'settings'), { bizName: 'Piraté' }));
  });
  it('le vrai UID du patron garde tous ses droits, même sans profil', async () => {
    const p = as(PATRON);
    await ok(getDoc(doc(p, 'users', 'empA')));
    await ok(getDocs(collection(p, 'factures_couts')));
    await ok(updateDoc(doc(p, 'app_config', 'settings'), { bizName: 'BG-MARKET' }));
  });
});

describe('Historique des analyses de catalogues (imports_fournisseurs)', () => {
  const d = (uid, extra = {}) => ({ fournisseurId: 'F1', fournisseurNom: 'F', uid, auteur: uid, at: 1, creeAt: serverTimestamp(), texte: 'A14 128gb….50.000', resume: '1 nouveau', enregistre: false, ...extra });
  it('administrateur avec « coûts » : crée et relit les siennes ; marque « enregistrée » ; rien d\'autre', async () => {
    const a = as('admin1');
    await ok(setDoc(doc(a, 'imports_fournisseurs', 'admin1_1'), d('admin1')));
    await ok(getDoc(doc(a, 'imports_fournisseurs', 'admin1_1')));
    await ok(getDocs(query(collection(a, 'imports_fournisseurs'), where('fournisseurId', '==', 'F1'), where('uid', '==', 'admin1'))));
    await ok(updateDoc(doc(a, 'imports_fournisseurs', 'admin1_1'), { enregistre: true }));
    await ko(updateDoc(doc(a, 'imports_fournisseurs', 'admin1_1'), { texte: 'modifié' }));
    await ko(deleteDoc(doc(a, 'imports_fournisseurs', 'admin1_1')));
    await ko(setDoc(doc(a, 'imports_fournisseurs', 'empA_2'), d('admin1')), 'identifiant au nom d\'un autre');
    await ko(setDoc(doc(a, 'imports_fournisseurs', 'admin1_3'), d('admin1', { enregistre: true })));
    await ko(setDoc(doc(a, 'imports_fournisseurs', 'admin1_4'), d('admin1', { texte: 'x'.repeat(60001) })));
    await ko(setDoc(doc(a, 'imports_fournisseurs', 'admin1_5'), d('admin1', { autre: 1 })));
  });
  it('le patron voit et peut supprimer toutes les analyses ; personne d\'autre ne lit celles d\'autrui', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => { await setDoc(doc(ctx.firestore(), 'imports_fournisseurs', 'admin1_9'), { ...d('admin1'), creeAt: 1 }); });
    await ok(getDocs(query(collection(as(PATRON), 'imports_fournisseurs'), where('fournisseurId', '==', 'F1'))));
    await ko(getDoc(doc(as('admin2'), 'imports_fournisseurs', 'admin1_9')), 'administrateur sans « coûts »');
    await ko(getDoc(doc(as('empA'), 'imports_fournisseurs', 'admin1_9')));
    await ko(setDoc(doc(as('empA'), 'imports_fournisseurs', 'empA_1'), d('empA')), 'employé : pas d\'accès aux prix d\'achat');
    await ko(setDoc(doc(as('admin2'), 'imports_fournisseurs', 'admin2_1'), d('admin2')));
    await ok(deleteDoc(doc(as(PATRON), 'imports_fournisseurs', 'admin1_9')));
  });
});
