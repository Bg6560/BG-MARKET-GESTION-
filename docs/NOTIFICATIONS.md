# Notifications — état actuel

## En service : notifications internes (gratuit, sans serveur)
Elles fonctionnent avec l'architecture actuelle (GitHub Pages + Firestore), sans forfait payant et sans nouvelle règle Firestore.

| Alerte | Qui la voit | Source (écoute en temps réel) |
|---|---|---|
| Commande à valider | patron + administrateurs | `commandes` où `statut == en_attente` |
| Facture à valider | patron + administrateurs | `factures` où `validation == a_valider` |
| Stock bas / rupture | patron + administrateurs | `produits` où `quantite <= seuil d'alerte` |
| Compte à approuver | patron seul | `users` où `statut == en_attente` |
| Ma commande validée / envoyée / livrée / annulée | l'employé concerné | ses `commandes` (`uid` = lui) |
| Ma facture validée | l'employé concerné | ses `factures` (`uid` = lui) |

- **Confidentialité** : chaque requête est limitée par les règles Firestore (un employé ne peut lire que ses propres documents). Aucun montant n'est affiché.
- **Cloche** (en haut, ordinateur et téléphone) : compteur des notifications non lues ; le panneau montre « À voir » puis l'« Historique » (éléments traités).
- **Clic** : ouvre la commande, la facture, la liste des produits en stock bas ou la fiche du compte.
- **Doublons** : chaque alerte a une clé unique (`cmd:<id>`, `stk:<id>:low|out`, …) : recevoir la même donnée plusieurs fois ne crée rien de plus. Une alerte n'est annoncée (bandeau) que si elle arrive pendant l'utilisation ; au chargement, seule la cloche est mise à jour.
- **Traité** : une commande validée, une facture validée, un stock réapprovisionné ou un compte approuvé passent dans l'historique. Une copie hors ligne n'est jamais utilisée pour classer « traité ».
- **Stockage** : l'état « lu », les préférences et l'historique (30 jours, 150 éléments) sont gardés **sur l'appareil**, par compte. Rien n'est écrit dans Firestore.
- **Réglages › Notifications** : choix des catégories, effacement de l'historique de l'appareil.

### Limites (assumées)
- Rien n'apparaît dans la barre de notifications du téléphone quand l'application est fermée : il faut l'ouvrir.
- « Lu » n'est pas partagé entre deux appareils (le partager demanderait une nouvelle collection et une modification des règles).
- Un produit dont la quantité n'est pas enregistrée comme nombre n'est pas surveillé.
- Précommandes et SAV : pas d'alerte pour l'instant (visibles dans « À traiter » du tableau de bord).

## En pause : notifications push du téléphone (application fermée)
Le code est écrit et testé mais **non déployé**, faute de forfait Blaze (Cloud Functions). Dans l'application, `PUSH_SERVER=false` masque tout bouton d'activation.

| Élément | Fichier | Réutilisé aujourd'hui ? |
|---|---|---|
| Choix des destinataires, contenu | `functions/lib/notify.js` | non (serveur) |
| Envoi, anti-doublon `notifications_log`, jetons périmés | `functions/lib/dispatch.js` | non (serveur) |
| 7 déclencheurs Firestore | `functions/index.js` | non (serveur) |
| Affichage et clic | `sw.js` | prêt, inactif sans message |
| Ouverture par lien `#open=type:id` | `index.html` (`pushOpen`) | **oui**, par la cloche |
| Jeton, appareil, préférences (`appareils`) | `index.html` (`push*`) | non, masqué |

Pour l'activer plus tard (décision du patron) : forfait Blaze, clé web push (VAPID), région, essai à blanc, publication des règles, puis `PUSH_SERVER=true` — voir l'historique de ce fichier pour le détail.
