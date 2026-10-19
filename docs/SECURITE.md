# Sécurité Firestore : règles cibles

`firestore.rules` contient les règles **cibles**. Elles ne sont **pas publiées** et ne sont pas
compatibles avec la version actuelle de `index.html` (voir l'ordre de mise en production).

## Ce que les règles garantissent (testé sur l'émulateur)

- Aucun accès aux données pour : non connecté, compte sans profil, `en_attente`, `pause`, `suspendu`, `retire`.
  Un profil sans champ `statut` (ancien compte) est traité comme actif pendant la transition.
- Un compte se crée en `en_attente`, jamais administrateur, sans droits, avec son propre email et uid.
  Seul le patron change `statut`, `role` et `perms`.
- Le patron est identifié par son UID (`PATRON_UID_A_REMPLACER` dans `firestore.rules`, à remplacer avant publication).
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

## Ordre de mise en production (rien n'est fait pour l'instant)

1. Remplacer `PATRON_UID_A_REMPLACER` (Firebase Console, Authentication, colonne « UID »).
2. Publier d'abord le nouveau code de l'application avec les anciennes règles : écriture des coûts dans les collections privées,
   création des comptes en `en_attente`, requêtes de clients filtrées par `uid`, formulaire sans fournisseur pour les employés.
3. Faire synchroniser tous les appareils en ligne (file d'écritures vide).
4. Copier les coûts historiques dans les collections privées (copie seulement).
5. Publier ces règles, après les tests ci-dessous. Garder l'ancienne version pour un retour arrière immédiat.
6. Plus tard, avec accord explicite : retirer les anciens champs de coûts des documents publics.

## Ce que fait désormais l'application (Lots 2A et 2B)

- Nouveaux comptes en `en_attente` ; le patron approuve dans l'onglet Équipe.
- L'employé ne charge que ses clients ; fournisseurs et prix fournisseurs : patron et administrateur.
- Coûts : écrits dans `commandes_couts`, `factures_couts`, `produits_prive` (et le fournisseur d'une commande dans
  `commandes_fourn`), dans le même lot d'écritures que le document public. Les documents publics n'ont plus de coût.
- À la lecture, chaque document est « hydraté » (`coutsCmd`, `coutsFac`, `coutsProd`) : sans le droit `couts`, tout coût
  est retiré, même dans un ancien document. L'employé ne voit plus ses propres bénéfices.
- Les anciens documents gardent leurs champs de coût **tant que la migration n'est pas faite** : ils restent lisibles
  par les employés côté serveur jusqu'à ce nettoyage (étape 6 ci-dessus). Ce nettoyage doit aller avec une purge du cache local des appareils.
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

## Lancer les tests

```
npm install
npm run test:app     # code de l'application, sans réseau
npm run test:rules   # règles Firestore + outil de migration, sur l'émulateur (données fictives)
```

Les tests utilisent l'émulateur Firestore (Java requis) avec des comptes et données fictifs, sans toucher à la production.
