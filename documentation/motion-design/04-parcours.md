# 4. Parcours d'utilisation concrets

Chaque parcours décrit un enchaînement **réel** de l'application. Les captures citées sont dans `captures/`.

## P1. Une vente du vendeur à la validation
1. Le vendeur (rôle Employé) touche **+**, puis **Nouvelle commande** (`tel-sombre-23`, `tel-sombre-26`).
2. Il saisit le client, le ou les téléphones (modèle, stockage, mémoire, état) et le produit en stock.
3. La commande est enregistrée **« En attente »**. Elle apparaît chez le patron et les administrateurs : la cloche compte une nouvelle notification (`pc-sombre-05`), et la bande « À traiter » l'affiche.
4. Un gestionnaire **valide** la commande (fiche `pc-sombre-07`, bouton « Valider la commande »). Statut suivant : Envoyée, puis **Livrée**.
5. À la livraison, **la facture est créée automatiquement** (réglage actif par défaut).
6. Le vendeur reçoit dans sa cloche « Commande validée », puis « Commande livrée ».

## P2. Une facture créée par un employé
1. L'employé crée une facture (`tel-sombre-28`).
2. Elle part **« À valider »** : l'employé la voit « en attente de validation ».
3. Le patron la retrouve dans le bloc **« À valider »** des Factures (`pc-sombre-08`) et dans sa cloche. Il touche **Valider**.
4. L'employé reçoit « Facture validée ».
5. Document de facture : **Imprimer / PDF**, **Texte WhatsApp** ou **Image WhatsApp** (`pc-sombre-09`).

## P3. Une précommande avec acompte
1. **Nouvelle précommande** : client, produit, prix, acompte initial.
2. Statut **Acompte** ; la barre de paiement montre le versé et le reste (`tel-sombre-29`).
3. Versements successifs ajoutés, avec un historique.
4. Une fois payée : **Soldée**, puis **Retirée** quand le client récupère l'appareil. Un reçu et un message WhatsApp au client sont possibles.

## P4. Un dossier SAV
1. **Nouveau SAV** : client, appareil, modèle, IMEI, panne.
2. Étapes : **Déposé → En réparation → Prêt → Restitué** (`tel-sombre-32`).
3. Quand l'appareil est prêt, on peut prévenir le client par WhatsApp.

## P5. Comparer les prix de plusieurs fournisseurs
1. Le patron reçoit une liste de prix sur WhatsApp et la **copie**.
2. Fournisseurs › fiche du fournisseur (`pc-sombre-13`) › **Importer une liste** (`tel-sombre-33`). Il colle le texte, puis touche **Analyser**.
3. L'application lit les prix, les marques et les états. Elle affiche un aperçu (nouveaux, modifiés, à vérifier) avant tout enregistrement.
4. Onglet **Comparaison** : meilleur prix par produit, marge brute estimée par rapport au prix de vente (`pc-sombre-12`).
5. Pour passer la commande au fournisseur, le bouton WhatsApp ouvre **WhatsApp Business** avec le message prêt (Android).

## P6. Piloter la boutique (patron)
1. Accueil : ventes, bénéfice, commandes et nouveaux clients du jour, avec leur évolution (`pc-sombre-03`).
2. Graphique : passer de 7 jours à 12 mois.
3. Meilleurs produits, ventes par marque, objectif du mois, performance des employés (`pc-sombre-02`).
4. Historique › **Mois** : bilan mensuel (`pc-sombre-16`).
5. Export CSV pour Excel (Réglages).

## P7. Gérer l'équipe (patron)
1. Un nouveau vendeur crée son compte : il reste **en attente**. Le patron reçoit l'alerte « Compte à approuver ».
2. Équipe › **Examiner** › Approuver (`pc-sombre-14`).
3. Si besoin, il le nomme **Administrateur** et coche ou décoche ses droits : coûts, suppression, réglages, totaux.
4. Les modifications faites ensuite par les administrateurs apparaissent dans le **journal d'activité** du patron.

## P8. Stock bas
1. À chaque vente, le stock diminue.
2. Sous le seuil d'alerte (2 par défaut, réglable), les alertes **Stock bas** ou **Rupture de stock** apparaissent dans la cloche et sur l'accueil (« État du stock »).
3. **Voir les produits** ouvre la liste filtrée sur le stock bas (`pc-sombre-11`).

## P9. Travailler sans réseau
1. Le réseau coupe : le badge passe à **« Hors ligne »**.
2. Les commandes, factures et clients restent enregistrables. Le badge indique **« En attente (n) »**.
3. Au retour du réseau, tout est envoyé automatiquement, sans doublon. Le badge passe à **« Synchronisé »**.
