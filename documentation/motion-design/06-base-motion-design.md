# 6. Base de travail pour le Motion Design

## Éléments qui méritent d'être montrés à l'écran
| Élément | Pourquoi | Captures |
|---|---|---|
| 4 cartes du jour avec mini-colonnes | Lecture instantanée de la journée | `pc-sombre-03`, `tel-sombre-21` |
| Graphique du chiffre d'affaires, passage de 7 jours à 12 mois | Visuel dynamique, animable | `pc-sombre-02` |
| Anneau « Répartition des ventes » et colonnes par marque | Formes simples à animer | `pc-sombre-02` |
| Cloche avec compteur et panneau | Montre la réactivité | `pc-sombre-05`, `tel-sombre-22` |
| Bouton « + » et menu « Créer » | Simplicité d'usage | `tel-sombre-23` |
| Carte « À valider » avec le bouton Valider | Contrôle du patron | `pc-sombre-08` |
| Document de facture | Professionnalisme | `pc-sombre-09` |
| Import d'une liste WhatsApp, puis comparaison des prix | Fonction différenciante | `tel-sombre-33`, `pc-sombre-12` |
| Étapes SAV et barre de paiement des précommandes | Suivi clair | `tel-sombre-32`, `tel-sombre-29` |
| Tableaux de bord du patron et de l'employé côte à côte | Confidentialité par rôle | `pc-sombre-02` / `tel-employe-40` |
| Basculement entre thème sombre et clair | Finition | `pc-clair-17`, `tel-clair-37` |
| Ordinateur et téléphone côte à côte | Multi-appareil | `pc-*` / `tel-*` |

## Parcours qu'une animation peut représenter fidèlement
- **Vente :** commande en attente, puis notification au patron, validation, livrée, facture automatique (parcours P1 de [04-parcours.md](04-parcours.md)).
- **Facture d'un employé :** passage par « À valider », puis « Validée » (P2).
- **Fournisseurs :** liste collée depuis WhatsApp, analyse, comparaison, puis commande via WhatsApp Business (P5).
- **Stock :** vente, stock qui baisse, alerte « Stock bas » (P8).
- **Hors ligne :** badge « Hors ligne », puis « En attente (2) », puis « Synchronisé » (P9).
- **Équipe :** nouveau compte en attente, approuvé, nommé administrateur avec des droits cochés (P7).

## Interactions et transitions simulables
Toutes existent dans l'application ; l'animation peut les reproduire ou les styliser :
- toucher **+**, ouverture du panneau « Créer » par le bas (téléphone) ;
- ouverture du **menu latéral** depuis la gauche, par-dessus le contenu (ordinateur) ;
- clic sur la **cloche**, ouverture du panneau, pastille rouge qui diminue ;
- changement de période du graphique (7 jours, 30 jours, 6 mois, 12 mois) ;
- statut d'une commande qui change de pastille (« En attente » orange, « Validée » bleu, « Livrée » vert) ;
- **balayage** d'une facture vers la gauche pour faire apparaître Valider, Voir, Supprimer (téléphone) ;
- cartes en grille qui apparaissent sur ordinateur, menu « Trier par » ;
- badge de synchronisation qui passe de « Hors ligne » à « Synchronisé ».

## Mise en scène purement visuelle (à présenter comme telle)
- Accélérations, zooms, téléphones et écrans « flottants », particules, lumière, transitions stylisées entre écrans.
- Compteurs qui défilent jusqu'à leur valeur : dans l'application, les chiffres s'affichent directement.
- Données affichées : utiliser des **données fictives** (comme dans les captures), jamais les vraies ventes de la boutique.
- Notification qui arrive en direct sur un écran : c'est réel **dans l'application ouverte**, pas sur l'écran verrouillé.

## À ne PAS présenter comme des fonctionnalités réelles
| À éviter | Réalité |
|---|---|
| Notification sur l'écran verrouillé ou dans la barre de notifications du téléphone quand l'application est fermée | **Non disponible** (nécessite le forfait payant Firebase Blaze, non activé). Seules les notifications dans l'application existent |
| Photos des produits | Retirées : icônes génériques |
| Paiement en ligne, Mobile Money, terminal de paiement | Inexistant (le mode de paiement est seulement noté sur la facture) |
| Plusieurs boutiques ou plusieurs patrons | Une seule boutique, un seul patron |
| Application téléchargeable sur Play Store ou App Store | Non : c'est un site web, que l'on peut ajouter à l'écran d'accueil depuis le navigateur |
| Intelligence artificielle, prévisions automatiques | Inexistant. La lecture des listes de prix fournisseurs est une analyse de texte par règles, pas de l'IA |
| Envoi automatique de messages WhatsApp | Non : l'application **prépare** le message et ouvre WhatsApp, l'utilisateur appuie sur Envoyer |
| Comptabilité complète, déclarations fiscales | Inexistant (export CSV seulement) |
| Traduction anglaise complète | Partielle |
| Chiffres d'usage (nombre de boutiques, gain de temps, hausse du chiffre d'affaires) | Aucune donnée disponible : ne pas inventer |
