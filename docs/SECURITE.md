# Sécurité Firestore : règles cibles

`firestore.rules` contient les règles **finales** (UID du patron inscrit). Elles ne sont **pas publiées** ; elles vont
avec le nouveau code de `index.html` (voir l'ordre de mise en production).

## Ce que les règles garantissent (testé sur l'émulateur)

- Aucun accès aux données pour : non connecté, compte sans profil, `en_attente`, `pause`, `suspendu`, `retire`.
  Un profil sans champ `statut` (ancien compte) est traité comme actif pendant la transition.
- Un compte se crée en `en_attente`, jamais administrateur, sans droits, avec son propre email et uid.
  Seul le patron change `statut`, `role` et `perms`.
- Le patron est identifié par son UID Firebase (inscrit dans `firestore.rules`), plus par son e-mail : un autre compte utilisant la même adresse n'a aucun droit de patron (testé).
- Clients, commandes, factures, précommandes, SAV : l'employé lit et crée seulement les siens (`uid`).
  Le patron et l'administrateur lisent tout. Un employé ne modifie ni ne supprime les clients.
- Fournisseurs : patron et administrateur seulement.
- Factures : un employé ne crée que ses factures, en `a_valider` (tant que la validation est activée dans les réglages),
  et ne modifie que sa facture non validée, sans toucher à la validation ni au propriétaire.
- Suppressions : patron, ou administrateur avec le droit `suppr`.
- Coûts : collections privées `produits_prive`, `commandes_couts`, `factures_couts` (lecture : patron, ou administrateur avec
  le droit `couts`) et `commandes_fourn` (patron et administrateur). L'employé peut y écrire les coûts de ses propres
  documents (même lot d'écritures que le document parent) mais ne peut pas les relire.
- Stock : un employé ne peut que diminuer `produits.quantite`.
- Compteur de factures (`app_config.invNumR`) : uniquement vers le haut. Toute collection non listée est refusée.

## Ce que les règles ne garantissent pas

- Les coûts **imbriqués** (`commandes.produits[].cost`, `factures.products[].cost`) ne sont pas contrôlables par les règles :
  le code de l'application ne doit plus les écrire, et les anciens documents doivent être nettoyés (migration).
- L'unicité des numéros de facture et de commande (nécessite une transaction ou une Cloud Function).
- Le droit `totaux` de l'administrateur (affichage seulement : il lit déjà toutes les factures).
- Le journal d'activité reste alimenté par le client.
- Les clients et documents **sans `uid`** restent invisibles pour les employés ; seuls le patron et l'administrateur les voient,
  et seul le patron peut leur attribuer un propriétaire.

## Ordre de mise en production

Voir `docs/MISE-EN-SERVICE.md` (ordre, sauvegarde, retour arrière, tests). Rien n'est fait pour l'instant.

## Ce que fait désormais l'application (Lots 2A et 2B)

- Nouveaux comptes en `en_attente` ; le patron approuve dans l'onglet Équipe.
- L'employé ne charge que ses clients ; fournisseurs et prix fournisseurs : patron et administrateur.
- Coûts : écrits dans `commandes_couts`, `factures_couts`, `produits_prive` (et le fournisseur d'une commande dans
  `commandes_fourn`), dans le même lot d'écritures que le document public. Les documents publics n'ont plus de coût.
- À la lecture, chaque document est « hydraté » (`coutsCmd`, `coutsFac`, `coutsProd`) : sans le droit `couts`, tout coût
  est retiré, même dans un ancien document. L'employé ne voit plus ses propres bénéfices.
- Les anciens documents gardent leurs champs de coût **tant que la migration n'est pas faite** : ils restent lisibles
  par les employés côté serveur jusqu'à ce nettoyage (étape 9 de `MISE-EN-SERVICE.md`). Ce nettoyage doit aller avec une purge du cache local des appareils.
- Un employé qui modifie sa facture en attente ne modifie pas ses coûts (il ne peut pas les relire).

## Outil de copie des coûts historiques (`tools/migration-couts.mjs`)

Copie les coûts, marges et fournisseurs des anciens documents vers les collections privées. **Il ne modifie ni ne supprime
jamais aucun document public ni aucun champ financier**, et n'écrase jamais un document privé existant.

```
# 1. Simulation (lecture seule) : combien de documents seraient copiés, plus un contrôle des données
GOOGLE_APPLICATION_CREDENTIALS=compte-de-service.json node tools/migration-couts.mjs --project <id> --auth

# 2. Copie réelle (sauvegarde complète obligatoire, projet à confirmer)
GOOGLE_APPLICATION_CREDENTIALS=compte-de-service.json node tools/migration-couts.mjs --project <id> --backup sauvegardes/avant-couts --apply --confirm <id>
```

- Le compte de service (Firebase Console, Paramètres du projet, Comptes de service) donne un accès complet : ne jamais le
  placer dans le dépôt. `sauvegardes/` et `tools/out/` sont ignorés par Git (ils contiennent des données financières).
- Le rapport ne contient que des identifiants et des compteurs (propriétaires manquants, profils sans statut, comptes
  sans profil, champs financiers encore présents dans les documents publics).
- Rejouable sans risque : une seconde exécution ne crée rien.

## Anciens champs financiers encore présents dans les documents publics (liste exacte)

Vus par `legacyFields` de l'outil de migration ; ils restent lisibles par tout compte actif tant que l'étape 9 de
`MISE-EN-SERVICE.md` (retrait + purge du cache) n'est pas faite :

| Collection | Champs |
|---|---|
| `commandes` | `coutCatalogue`, `profit`, `beneficeCmd`, `fournisseurId`, `fournisseurNom`, `fournisseurWa`, `produits[].cost` |
| `factures` | `cost`, `profit`, `products[].cost` |
| `produits` | `prixAchat` |

La simulation de l'outil donne le nombre de documents concernés (`champsFinanciersPublics`). Autres endroits : le cache local des
appareils (mêmes données) et la liste locale `bg_cat` (prix d'achat de l'ancien catalogue, appareils patron/administrateur).

## Collections ajoutées après les Lots 2 et 3

| Collection | Contenu | Accès (règles) |
|---|---|---|
| `mouvements_stock` | une ligne par mouvement de stock (non modifiable) | création : utilisateur actif, à son nom ; lecture : patron/administrateur |
| `catalogue_fournisseurs` | prix d'achat par fournisseur et par modèle | droit « coûts » uniquement (lecture et écriture) |
| `appareils` | jeton de notification d'un appareil | son propriétaire (et le patron en lecture) |
| `notifications_log`, `notifications_envoyees` | doublons / essai à blanc des notifications | **serveur seulement** (aucune règle : refusé aux clients) |

## Lancer les tests

```
npm install
npm run test:app     # code de l'application, compatibilité code/règles, secrets, service worker (sans réseau)
npm run test:rules   # règles Firestore, migration, sauvegarde, notifications, sur l'émulateur (données fictives)
npm run test:e2e     # navigateur réel (Chromium) + émulateurs : rôles, hors ligne, notifications, fournisseurs, recherche
```

Procédure complète de mise en service, sauvegarde et retour arrière : `docs/MISE-EN-SERVICE.md`. Hors ligne : `docs/HORS-LIGNE.md`. Notifications : `docs/NOTIFICATIONS.md`.

Les tests utilisent l'émulateur Firestore (Java requis) avec des comptes et données fictifs, sans toucher à la production.
