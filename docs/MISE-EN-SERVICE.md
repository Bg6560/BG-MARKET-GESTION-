# Mise en service : ordre, sauvegarde, retour arrière, tests

**Rien de ce document n'a été exécuté.** Aucune publication Firebase, migration, suppression ni facturation n'a été faite.
Chaque étape marquée ✋ demande l'accord explicite du patron.

## 0. Avant toute chose (lecture seule, sans risque)
1. **Sauvegarde complète** des données :
   `GOOGLE_APPLICATION_CREDENTIALS=compte-de-service.json node tools/sauvegarde.mjs --project <id> --dir sauvegardes/avant-lancement`
   Un fichier JSON par collection + `manifeste.json` (dates et nombres de documents). Lecture seule. Contient des données financières :
   dossier ignoré par Git, à ranger hors du dépôt. Contrôler que les nombres du manifeste correspondent à la console.
2. **Comptes** : `firebase auth:export comptes.json --project <id>` (liste des utilisateurs ; à ranger avec la sauvegarde).
3. **Règles actuelles** : console Firebase › Firestore › Règles : copier le texte dans un fichier daté. La console garde aussi l'historique des versions publiées.
4. **Code actuel** : noter le commit (ou créer une étiquette Git) de la version en ligne.
5. Compte de service : jamais dans le dépôt (vérifié par `tests/app.compat.test.mjs`).

## 1. Ordre de mise en production
| # | Étape | Accord |
|---|---|---|
| 1 | ✅ Fait : `firestore.rules` contient l'UID du patron (`SpFDcRyLzCb49xfVC6XHFNZHeLZ2`) ; le fichier du dépôt est le fichier à publier. | |
| 2 | ✅ Vérifié sur les règles actuellement publiées : leur règle générale (« toutes les autres données ») accepte les nouvelles collections, donc le nouveau code fonctionne avec elles. **Une exception** : l'inscription d'un nouveau compte échoue tant que les anciennes règles sont en place (elles exigent un compte « actif », le nouveau code le crée « en attente »). Ne pas inscrire de nouvel employé entre les étapes 3 et 7. | |
| 3 | Publier le **nouveau code** sur GitHub Pages : fusion de la branche de travail dans `main` (`index.html` + `sw.js` ensemble ; le numéro de cache de `sw.js` a changé, ce qui force la mise à jour des appareils). | ✋ |
| 4 | Laisser les appareils se synchroniser : badge **Synchronisé** partout (aucune écriture en attente ni en échec). | |
| 5 | Nouvelle sauvegarde (étape 0.1), puis **simulation** de la migration des coûts : `node tools/migration-couts.mjs --project <id> --auth`. Lire le rapport (propriétaires manquants, comptes sans profil, champs financiers publics restants). | |
| 6 | **Copie** des coûts historiques : `... --backup sauvegardes/avant-couts --apply --confirm <id>`. Copie seulement : rien n'est modifié ni supprimé. | ✋ |
| 7 | Publier les **règles** : console Firebase › Firestore › Règles › remplacer tout le texte par le contenu de `firestore.rules` › Publier. À faire le jour même de l'étape 6 : avec les anciennes règles, tout compte connecté peut encore lire les coûts. | ✋ |
| 8 | Vérification de la section 4 (5 minutes, un compte par rôle). | |
| 9 | Plus tard, quelques jours sans incident : retrait des anciens champs financiers des documents publics **et** purge du cache local des appareils (voir `SECURITE.md`). Outil non écrit : il se prépare à part, avec nouvel accord. | ✋ |
| 10 | Notifications push (facultatif, plus tard) : `docs/NOTIFICATIONS.md` (forfait Blaze). | ✋ |

**Variante** si l'étape 2 échoue : choisir une plage horaire calme, sauvegarde faite, publier code (3) et règles (7) à quelques minutes d'intervalle, puis vérifier (8). Les écritures en attente sur les appareils partent après la publication.

## 2. Retour arrière
**Ordre impératif : les règles d'abord, le code ensuite.** L'ancien code écrit les coûts dans les documents publics, ce que les nouvelles règles refusent : remettre l'ancien code avec les nouvelles règles bloquerait les ventes.
- **Règles** : console › Règles › historique (ou coller le fichier de l'étape 0.3) › Publier. Effet immédiat.
- **Code** : republier l'ancienne version de `index.html` et `sw.js` (étape 0.4 ; sur `main` le cache est `bgm-gestion-v4`). Tout changement du fichier `sw.js` suffit à faire reprendre l'ancienne version aux appareils ; la nouvelle (v7) charge la page réseau d'abord, donc le retour est pris au prochain chargement en ligne. Les écritures en attente restent dans le cache Firestore de l'appareil et partent quand même ; seul le panneau « En attente » disparaît avec l'ancien code.
- **Données** : la migration n'a rien modifié ni supprimé ; les collections privées ajoutées peuvent rester. Une restauration depuis la sauvegarde n'est à envisager que si des données publiques ont été abîmées (aucune étape ci-dessus n'en écrit, sauf l'étape 9, qui n'est pas préparée).
- Écritures hors ligne en attente : elles restent dans l'appareil (badge « En attente / Échec », panneau de reprise) ; ne pas vider le cache d'un appareil tant que son badge n'indique pas **Synchronisé**.

**Quota de lectures** : avec le forfait gratuit (Spark), Firestore autorise 50 000 lectures par jour. La sauvegarde et la simulation lisent chacune tous les documents : sur une grosse base, les faire sur deux jours différents ou vérifier le nombre de documents avant. Une sauvegarde interrompue par le quota est incomplète : comparer `manifeste.json` à la console.

## 3. Tests avant publication
Automatiques (émulateurs locaux, données fictives, rien d'envoyé à Firebase) :
```
npm install
npm run test:app     # logique de l'application, compatibilité code/règles, absence de secrets, service worker, fournisseurs, recherche
npm run test:rules   # règles Firestore, migration, sauvegarde, notifications (planification + envoi simulé)
npm run test:e2e     # navigateur réel : 3 rôles, bureau/mobile, hors ligne, notifications (jeton FCM remplacé), fournisseurs, recherche
```
Java est nécessaire pour les émulateurs. Dernier résultat connu : voir la fin de ce document.

À faire à la main sur le vrai projet (non automatisable ici) après l'étape 3 puis l'étape 7 :
1. Connexion patron, administrateur (avec et sans droit « coûts »), employé, nouveau compte (doit rester « en attente »).
2. Employé : créer un client, une commande (produit choisi dans la liste), une facture : bénéfices et coûts **absents** partout ; ne voit que ses clients ; pas de menu Fournisseurs.
3. Administrateur sans « coûts » : aucun coût ni bénéfice ; catalogue fournisseur : message « réservé ».
4. Patron : les chiffres, la validation d'une facture, le stock diminué une seule fois, l'import d'une liste fournisseur.
5. Hors ligne (mode avion) : créer un client puis une commande ; badge « En attente » ; réseau rétabli : badge « Synchronisé », une seule fois.
6. Mettre un compte en pause : il est refusé ; le réactiver.

## 4. Après la publication des règles : contrôle rapide
Aucune erreur « permission-denied » à l'écran pour un usage normal ; le badge reste « Synchronisé » ; un employé ouvrant une commande d'un collègue (lien direct) n'obtient rien.

## Dernier résultat des tests automatiques
`test:app` 79/79, `test:rules` 95/95, `test:e2e` 34/34 (émulateurs locaux, Chromium, données fictives).
Non couvert par ces tests : tout ce qui exige les vrais services Firebase (publication des règles, Cloud Functions, livraison FCM réelle, connexion Google, hébergement).
