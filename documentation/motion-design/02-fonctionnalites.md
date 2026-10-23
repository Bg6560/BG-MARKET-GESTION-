# 2. Fonctionnalités réelles (inventaire)

Statuts : **Confirmé** (présent et fonctionnel, la plupart du temps couvert par des tests automatiques) · **Partiel** (présent avec des limites) · **Non disponible**.
« Captures » renvoie aux fichiers de `captures/` (voir [captures/INVENTAIRE.md](captures/INVENTAIRE.md)).

## Accès et navigation
| Fonction | Statut | Détail |
|---|---|---|
| Connexion e-mail et mot de passe, connexion Google, création de compte | Confirmé | Un nouveau compte reste « en attente » jusqu'à son approbation par le patron |
| Navigation sur téléphone | Confirmé | Barre du bas (Accueil, Commandes, bouton +, Factures, Plus) et menu « Plus » |
| Navigation sur ordinateur | Confirmé | Menu latéral rétractable : bouton ☰, superposé au contenu, fermeture par Échap ou clic à côté |
| Bouton « Créer » / « + » | Confirmé | Nouvelle commande, facture, précommande, SAV, client ou produit (selon le rôle) |
| Recherche rapide (ordinateur) | Confirmé | Barre de recherche en haut, raccourci Ctrl + K |
| Thème sombre et clair | Confirmé | Réglages › Apparence ou bouton soleil/lune |
| Langue français et anglais | Partiel | Le choix existe dans Réglages › Langue, mais tous les écrans ne sont pas traduits (le tableau de bord reste en français) |
| Fonctionnement hors ligne | Confirmé | Badge « Synchronisé », « En attente (n) », « Hors ligne » ou « Échec » ; les écritures sont gardées et envoyées au retour du réseau, sans doublon |
| Ajout à l'écran d'accueil (PWA) | Partiel | Mise en cache et manifeste présents ; aucun bouton « Installer » dans l'application, l'installation passe par le menu du navigateur |

## Tableau de bord (Accueil)
| Fonction | Statut | Détail |
|---|---|---|
| Salutation et rôle | Confirmé | « Bonjour, Patron », avec une étiquette indiquant le rôle |
| 4 cartes du jour | Confirmé | Ventes du jour, bénéfice du jour (si droit « coûts » ; sinon factures du jour), commandes du jour, nouveaux clients ; évolution par rapport à la veille ; mini-colonnes sur 7 jours |
| Bande « À traiter » | Confirmé | Commandes à valider ou à livrer, factures à valider, comptes en attente, stock bas (selon le rôle) |
| Graphique du chiffre d'affaires | Confirmé | Périodes 7 jours, 30 jours, 6 mois, 12 mois ; courbe ou colonnes ; bénéfice si autorisé |
| Répartition des ventes et ventes par catégorie (marque) | Confirmé | Anneau et colonnes, évolution par rapport au mois précédent |
| Meilleurs produits (3) | Confirmé | Avec une icône générique selon le type de produit |
| Activités récentes (5) | Confirmé | Lien « Voir tout » vers l'historique |
| Performance des employés | Confirmé | Patron uniquement : commandes, factures validées, ventes, bénéfice par vendeur |
| Objectif du mois | Confirmé | Anneau de progression ; objectif boutique fixé par le patron, objectif employé séparé |
| Comptes en attente, commandes et factures à valider | Confirmé | Boutons « Valider » et « Examiner » directement depuis l'accueil |
| État du stock | Confirmé | Nombre de ruptures et de stocks bas, lien vers les produits filtrés |

## Notifications
| Fonction | Statut | Détail |
|---|---|---|
| Cloche avec compteur de non lues | Confirmé | Sur ordinateur et téléphone |
| Panneau « À voir » et historique « Traité » (30 jours) | Confirmé | « Tout marquer comme lu » ; un clic ouvre la commande, la facture, le produit ou le compte concerné |
| Alertes par rôle | Confirmé | Commandes et factures à valider, stock bas et rupture (gestionnaires), comptes à approuver (patron), suivi de ses commandes et factures (employé) |
| Bandeau quand une alerte arrive en direct | Confirmé | Pendant l'utilisation de l'application |
| Notifications sur le téléphone quand l'application est fermée | **Non disponible** | Le code existe mais il est désactivé : il faudrait un serveur Firebase payant (forfait Blaze), non activé. L'écran Réglages › Notifications le dit clairement |

## Commandes
| Fonction | Statut | Détail |
|---|---|---|
| Liste, recherche, filtres par statut | Confirmé | Toutes, en attente, validées, envoyées, livrées, annulées |
| Présentation | Confirmé | Lignes sur téléphone ; cartes en grille sur ordinateur, avec un menu « Trier par » |
| Création d'une commande | Confirmé | Client, téléphones (modèle, stockage, mémoire, état neuf ou quasi-neuf), produit lié au stock |
| Cycle de statut | Confirmé | En attente → Validée → Envoyée → Livrée, ou Annulée |
| Facture créée automatiquement à la livraison | Confirmé | Réglage actif par défaut |
| Commander au fournisseur par WhatsApp | Confirmé | Message préparé, ouverture de WhatsApp Business de préférence sur Android |
| Appeler ou écrire au client sur WhatsApp depuis la fiche | Confirmé | |

## Factures
| Fonction | Statut | Détail |
|---|---|---|
| Liste, recherche, filtres (toutes, impayées, payées) | Confirmé | Bloc « À valider » en tête pour les gestionnaires |
| Création d'une facture | Confirmé | État des téléphones, produits, quantités, prix, TVA, livraison et garantie selon les réglages |
| Validation des factures des employés | Confirmé | Une facture d'employé est « à valider » ; le patron ou un administrateur la valide |
| Document de facture | Confirmé | Mise en page « FACTURE » avec logo, numéro, date, statut payé ou en attente |
| Imprimer / PDF, envoi WhatsApp en texte ou en image | Confirmé | L'image est générée sur l'appareil |
| Bénéfice par facture | Confirmé | Visible uniquement avec le droit « coûts » |

## Précommandes
| Fonction | Statut | Détail |
|---|---|---|
| Précommande avec acompte | Confirmé | Statuts : en cours, acompte, soldée, retirée |
| Versements successifs, historique, reste à payer | Confirmé | Barre de progression du paiement |
| Reçu de précommande et message WhatsApp au client | Confirmé | |

## SAV et retours
| Fonction | Statut | Détail |
|---|---|---|
| Dossier SAV | Confirmé | Client, appareil, modèle, IMEI, panne |
| 4 étapes | Confirmé | Déposé → En réparation → Prêt → Restitué |
| Prévenir le client par WhatsApp | Confirmé | |

## Clients
| Fonction | Statut | Détail |
|---|---|---|
| Liste, recherche, filtres (tous, fidèles, sans commande) | Confirmé | « Fidèle » à partir de 2 commandes |
| Fiche client | Confirmé | Nombre de commandes, total dépensé, dernière commande, coordonnées, historique, nouvelle commande |
| Appeler, WhatsApp | Confirmé | |

## Produits et stock
| Fonction | Statut | Détail |
|---|---|---|
| Liste, recherche, filtre par marque, filtre « Stock bas » | Confirmé | Indicateurs : modèles, unités en stock, valeur du stock |
| Fiche produit | Confirmé | Stock, prix de vente ; prix d'achat et marge si droit « coûts » ; icône générique (téléphone, tablette, montre, audio, accessoire) |
| Stock déduit automatiquement à la vente | Confirmé | Avec mouvement de stock enregistré |
| Alertes de stock bas et de rupture | Confirmé | Seuil réglable |
| Photos de produits | **Non disponible** | Volontairement retiré : des icônes génériques les remplacent |

## Fournisseurs (gestionnaires uniquement)
| Fonction | Statut | Détail |
|---|---|---|
| Fiches fournisseurs (contact WhatsApp, commandes passées) | Confirmé | |
| Import d'une liste de prix collée depuis WhatsApp | Confirmé | Lecture des formats « 50.000 », « 50 000 », « 50k », « F CFA » ; distingue les années et les capacités des prix ; marque et état (neuf, Kazi neuf…) ; aperçu avant enregistrement, sans doublon |
| Historique des imports | Partiel | Sur l'appareil ; sur le serveur seulement une fois les règles Firestore publiées par le patron |
| Onglets Prix et marges, Comparaison | Confirmé | Meilleur prix par produit, marge brute estimée, alertes |
| WhatsApp Business pour contacter le fournisseur | Confirmé | Android : WhatsApp Business en priorité, WhatsApp classique en secours ; réglage dans Réglages › WhatsApp |

## Équipe (patron)
| Fonction | Statut | Détail |
|---|---|---|
| Approuver ou refuser les nouveaux comptes | Confirmé | |
| Passer un membre administrateur, régler ses droits | Confirmé | Droits : coûts, suppression, réglages, totaux |
| Mettre en pause, suspendre | Confirmé | |
| Journal d'activité des administrateurs | Confirmé | Modifications et suppressions faites par les administrateurs, visibles par le patron |

## Historique
| Fonction | Statut | Détail |
|---|---|---|
| Onglets Commandes, Factures, SAV | Confirmé | Pour l'employé : « Mes commandes », etc. |
| Onglet « Mois » (bilan mensuel) | Confirmé | Avec le droit « totaux » : chiffre d'affaires, commandes, factures et bénéfice par mois |

## Réglages
| Section | Statut | Détail |
|---|---|---|
| Mon profil | Confirmé | Photo, nom, mot de passe |
| Apparence, Langue | Confirmé / Partiel | Voir plus haut |
| Notifications | Confirmé | Catégories, historique de l'appareil, explication sur les notifications du téléphone non disponibles |
| WhatsApp | Confirmé | Business ou classique, pour les gestionnaires |
| Informations de la boutique, factures (numérotation, garantie), ventes (marge par défaut, seuil de stock), objectifs | Confirmé | Selon les droits |
| Export des données (CSV pour Excel) | Confirmé | Commandes, factures, clients, produits |

## Défauts visuels connus
- Le défaut d'affichage des boutons de choix et des cases à cocher dans **Réglages › WhatsApp** et **Réglages › Notifications** (grands rectangles vides) est **corrigé** sur la branche de travail. Captures 35 et 36 refaites. Il reste à publier ce correctif pour que la version en ligne en bénéficie.
