# 1. Présentation générale

## Nom
**BG-MARKET-GESTION**. Dans l'application, le logo est « BG MARKET » avec la signature **« Technologie pour tous »** et le sous-titre **« Gestion de la boutique »**. Le domaine bgmarket.ci figure sur la page de connexion.

## Concept
Application web de **gestion commerciale** pour une boutique de téléphones et d'accessoires. Elle tient sur un seul site et s'utilise sur ordinateur comme sur téléphone, où elle peut être ajoutée à l'écran d'accueil. Elle rassemble au même endroit :
- les commandes, les factures, les précommandes avec acomptes et le SAV ;
- les clients, les produits et le stock, les fournisseurs et leurs prix ;
- l'équipe et ses droits, l'historique, et un tableau de bord avec graphiques et objectifs.

Elle fonctionne aussi **sans réseau** : les opérations sont gardées sur l'appareil et envoyées au retour de la connexion.

## Objectif
Donner au patron d'une boutique une vue claire et en temps réel de son activité, tout en permettant à ses vendeurs de travailler (commandes, factures, clients) **sans accéder aux informations sensibles** : prix d'achat, bénéfices, totaux de la boutique.

## Problèmes concrets auxquels elle répond

D'après les fonctions présentes dans le code :

| Problème du commerçant | Réponse de l'application |
|---|---|
| Ventes notées sur papier ou dans WhatsApp, difficiles à retrouver | Commandes et factures numérotées, recherche, historique, export CSV |
| Le patron ne sait pas en temps réel ce qui se vend | Tableau de bord du jour, évolution sur 7 jours, 30 jours, 6 mois et 12 mois, meilleurs produits |
| Les vendeurs voient les prix d'achat et les marges | Rôles séparés : l'employé ne voit jamais les coûts ni les bénéfices, et ces données sont protégées côté serveur |
| Une vente faite par un employé doit être contrôlée | Une facture créée par un employé passe « à valider » par le patron ou un administrateur |
| Le stock n'est pas à jour, ruptures découvertes trop tard | Stock déduit à la vente, alertes de stock bas et de rupture, seuil réglable |
| Précommandes et acomptes difficiles à suivre | Précommandes avec acompte, versements successifs, solde restant, reçu |
| Suivi des réparations et retours (SAV) | Dossiers SAV en 4 étapes : déposé, en réparation, prêt, restitué |
| Comparer les prix de plusieurs fournisseurs reçus en listes WhatsApp | Import de la liste collée depuis WhatsApp, lecture automatique des prix, comparaison et marge estimée |
| Connexion internet instable | Fonctionnement hors ligne, sans doublon au retour du réseau |
| Envoyer une facture au client | Facture « Imprimer / PDF », envoi par WhatsApp en texte ou en image |

## Public cible
- **Principal :** le patron d'une boutique de téléphonie, avec un ou plusieurs vendeurs. La boutique de référence est BG-MARKET, à Yopougon, Abidjan.
- **Utilisateurs quotidiens :** les employés (vendeurs) et les administrateurs (gérants de confiance).
- **À confirmer :** l'application est-elle destinée uniquement à BG-MARKET, ou sera-t-elle proposée à d'autres commerçants ? Le code ne gère qu'une seule boutique et un seul patron, désigné dans les règles de sécurité.

## Bénéfices réels et différenciants
1. **Tout au même endroit**, sur téléphone et sur ordinateur, avec la même interface sombre ou claire.
2. **Confidentialité par rôle**, appliquée côté serveur : un employé ne peut techniquement pas lire les coûts ni les bénéfices.
3. **Contrôle des ventes :** validation par le patron, journal des modifications faites par les administrateurs.
4. **Pensé pour le terrain africain :**
   - montants en francs CFA ;
   - WhatsApp au cœur du travail (contacter un client, envoyer une facture, commander à un fournisseur via WhatsApp Business) ;
   - lecture des catalogues fournisseurs reçus par WhatsApp ;
   - fonctionnement hors ligne.
5. **Pilotage :** chiffre d'affaires, bénéfice, objectif mensuel, performance des employés, meilleurs produits.
6. **Alertes dans l'application :** commandes et factures à valider, stock bas, comptes à approuver.

## Proposition de valeur (formulations possibles, à valider)
- « Toute votre boutique dans votre poche : ventes, stock, factures et équipe. »
- « Vos vendeurs vendent, vous gardez le contrôle. »
- « Vos marges restent privées. »
- « Même sans réseau, la boutique continue. »

## Messages à mettre en avant
- **Simplicité :** créer une commande ou une facture en quelques gestes, depuis le bouton « + ».
- **Contrôle :** validation des factures des employés, comptes approuvés par le patron, droits réglables.
- **Visibilité :** tableau de bord du jour et graphiques.
- **Confidentialité :** prix d'achat et bénéfices réservés.
- **Terrain :** WhatsApp, francs CFA, hors ligne.
