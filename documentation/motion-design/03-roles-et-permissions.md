# 3. Rôles et permissions

L'application distingue **trois rôles**. Les restrictions ne sont pas seulement visuelles : elles sont appliquées par les **règles de sécurité Firestore**, côté serveur. Les coûts et bénéfices sont rangés dans des collections privées, illisibles sans le droit correspondant.

## Résumé

| | Employé | Administrateur | Patron |
|---|---|---|---|
| Qui | Vendeur | Gérant de confiance, nommé par le patron | Propriétaire (un seul compte, désigné dans les règles) |
| Commandes, factures, précommandes, SAV, clients | **Les siens uniquement** | Tous | Tous |
| Créer une commande ou une facture | Oui (sa facture part « à valider ») | Oui | Oui |
| Valider les factures et les commandes | Non | Oui | Oui |
| Prix d'achat, bénéfices, marges (droit « coûts ») | **Jamais** | Oui par défaut, retirable par le patron | Oui |
| Totaux de la boutique, bilan mensuel (droit « totaux ») | Non (seulement ses propres ventes) | Non par défaut, accordable | Oui |
| Suppression définitive (droit « suppression ») | Non | Non par défaut, accordable | Oui |
| Réglages de travail : marge par défaut, seuil de stock, garantie (droit « réglages ») | Non | Oui par défaut, retirable | Oui |
| Fournisseurs, import de prix, comparaison | Non | Oui | Oui |
| Équipe : approuver les comptes, nommer, régler les droits, suspendre | Non | Non | **Oui** |
| Journal d'activité des administrateurs | Non | Non | **Oui** |
| Objectif du mois de la boutique | Voit son objectif employé | Voit l'objectif | Le définit |
| Performance des employés | Non | Non | Oui |
| Informations de la boutique, numérotation des factures, objectifs | Non | Non | Oui |
| Export des données (CSV) | Non | Non | **Oui** |
| Créer un produit, modifier les fiches produits | Non (consulte les produits et le stock, sans prix d'achat) | Oui | Oui |
| Notifications internes | Suivi de ses commandes et factures | Commandes et factures à valider, stock | Les mêmes, plus les comptes à approuver |

Valeurs par défaut d'un administrateur, d'après le code (`ROLE_DEF`) : coûts **oui**, réglages **oui**, totaux **non**, suppression **non**. Le patron peut changer chaque droit, membre par membre. Le changement s'applique immédiatement, même si la personne est connectée.

## Différences visibles à l'écran (utiles pour la vidéo)
- **Tableau de bord de l'employé** : « Mes ventes du jour », « Mes factures du jour », « Mes commandes du jour », « Mes nouveaux clients », « Mon objectif ». Ni bénéfice ni performance des collègues. Voir les captures `tel-employe-40`, `pc-employe-42` et `tel-employe-41` (mes commandes).
- **Tableau de bord du patron** : bénéfice du jour, comptes en attente, performance des employés, objectif de la boutique (`pc-sombre-02`, `tel-sombre-20`).
- **Menu** : l'employé n'a ni Fournisseurs ni Équipe ; « Équipe » est réservé au patron.
- **Facture d'un employé** : elle apparaît chez le patron dans « À valider » (`pc-sombre-08`).
- **Nouveau compte** : il reste « en attente » jusqu'à l'approbation du patron (`pc-sombre-14`, Équipe).

## Ce qu'il ne faut pas affirmer
- Qu'il peut y avoir plusieurs patrons ou plusieurs boutiques : un seul patron est prévu.
- Qu'un employé peut voir ou modifier les prix d'achat : c'est impossible.
