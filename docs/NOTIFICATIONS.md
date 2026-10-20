# Notifications push — état et mise en service

## Ce qui est prêt (code et tests)
| Élément | Fichier | Testé |
|---|---|---|
| Qui reçoit quoi, contenu des messages | `functions/lib/notify.js` | oui (unitaire) |
| Envoi, doublons (`notifications_log`), jetons périmés, essai à blanc | `functions/lib/dispatch.js` | oui (émulateur Firestore + faux FCM) |
| 7 déclencheurs Firestore | `functions/index.js` | chargement seulement |
| Affichage et clic (Service Worker) | `sw.js` | oui (simulation du SW) |
| Activation, jeton, préférences, retrait à la déconnexion, lien | `index.html` (module « Notifications push ») | oui (navigateur réel, jeton FCM remplacé) |
| Règles de la collection `appareils` | `firestore.rules` | oui |

## Ce qui n'est PAS vérifié (impossible sans service distant)
- La livraison d'un vrai message par FCM jusqu'au téléphone/ordinateur, application fermée.
- Le déploiement des fonctions et leur exécution réelle.
Ces deux points ne se vérifient qu'après déploiement (étapes ci-dessous). Aucune notification simulée n'est affichée par l'application.

## Messages envoyés
| Événement | Destinataires | Contenu |
|---|---|---|
| Nouvelle commande | patron + administrateurs actifs | n°, client, nb de téléphones, vendeur — **sans montant** |
| Facture à valider | patron + administrateurs | n°, client, vendeur — **sans montant** |
| Vente importante (≥ seuil) | **patron seul** | n°, client, **montant** |
| Compte en attente | patron seul | nom |
| Compte approuvé | l'intéressé | texte fixe |
| Stock bas / rupture (au franchissement du seuil) | patron + administrateurs | modèle, quantité restante |
| Statut de commande modifié | le vendeur | n°, client, statut — sans montant |

Comptes en attente, en pause ou suspendus : jamais destinataires. Les destinataires sont calculés **côté serveur** depuis `users` (jamais depuis ce que l'appareil déclare). Chaque appareil peut couper chaque type (écran Réglages → Notifications).
Doublons : le serveur refuse de rejouer un événement (`notifications_log`), et l'appareil remplace une notification de même `tag` au lieu d'en empiler une seconde.

## À activer (dans cet ordre, avec ton accord à chaque étape)
1. **Forfait Blaze** du projet Firebase (les Cloud Functions l'exigent ; usage très faible attendu mais la facturation doit être activée — décision du patron).
2. **Clé web push (VAPID)** : console Firebase › Paramètres › Cloud Messaging › Certificats Web Push › générer. La coller dans l'appli : Réglages › Notifications › Configuration (patron). C'est une clé publique, pas un secret.
3. **Région** : vérifier la région de la base Firestore et l'indiquer dans `functions/index.js` (`setGlobalOptions({region})`).
4. **Essai à blanc** : `firebase deploy --only functions` avec `PATRON_UID=<uid du patron>` et `NOTIFY_DRY_RUN=1` : les fonctions écrivent ce qu'elles *auraient* envoyé sans rien envoyer. Vérifier, puis redéployer sans `NOTIFY_DRY_RUN`.
5. **Règles Firestore** : publier `firestore.rules` (voir `docs/MISE-EN-SERVICE.md`) — la collection `appareils` en dépend.
6. **Test réel** sur un téléphone et un ordinateur : activer dans Réglages › Notifications, créer une commande depuis un autre compte, fermer l'appli, vérifier la réception et le clic.

## Limites connues
- iPhone : les notifications web n'existent que si l'appli est ajoutée à l'écran d'accueil (iOS 16.4+).
- Quand l'appli est ouverte au premier plan, la notification système s'affiche quand même (pas de tri premier plan/arrière-plan).
- Le jeton d'un appareil expire parfois : il est renouvelé à chaque connexion, et supprimé côté serveur dès que FCM le déclare invalide.
