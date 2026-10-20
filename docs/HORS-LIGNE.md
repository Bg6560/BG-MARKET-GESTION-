# Fonctionnement hors ligne

## Principe
Les données sont gardées sur l'appareil (cache Firestore). Toute écriture faite sans réseau est mise en file, listée dans une
**file locale** (`bg_outbox_v1`) et envoyée au retour du réseau. Les identifiants des documents sont créés **sur l'appareil** :
un renvoi réécrit le même document, il ne crée jamais de doublon. L'état est affiché en haut de l'écran :

| Badge | Sens |
|---|---|
| Synchronisé | tout est confirmé par le serveur |
| En attente (n) | n écritures enregistrées sur l'appareil, pas encore confirmées. L'appli ne dit jamais « envoyé » à ce stade |
| Hors ligne | pas de réseau |
| Échec (n) | le serveur a refusé (règles, conflit) : l'écriture est **conservée**, détaillée dans le panneau (toucher le badge), avec « Réessayer », « Copier » et « Abandonner » |

Les écritures en attente survivent à la fermeture de l'appli et au redémarrage ; au retour, elles sont rapprochées de ce que le serveur a reçu.

## Couverture
| Donnée | Hors ligne | Vérifié de bout en bout (navigateur réel, réseau coupé) |
|---|---|---|
| Clients (création) | oui | oui |
| Commandes (création, produit lié, coûts à part) | oui | oui |
| Factures (création par un employé, validation requise, coûts à part) | oui | oui |
| Stock : diminution à la vente + mouvement de stock, une seule fois | oui | oui |
| Produits (création par le patron, prix d'achat à part) | oui | oui |
| Compte suspendu pendant une écriture en attente | écriture conservée, envoyée une fois après réactivation | oui |
| Modification refusée (facture validée entre-temps) | signalée « Échec », non appliquée, conservée jusqu'à abandon | oui |
| Fournisseurs, import de prix | même mécanisme | **non testé hors ligne** |
| Recherche de produits dans les formulaires | utilise le cache chargé à l'ouverture du formulaire | partiellement (commande hors ligne après chargement en ligne) |
| Notifications push | non (nécessitent le réseau) | — |

## Limites à connaître
- **Numéros** : deux appareils hors ligne en même temps peuvent attribuer le même numéro de facture ou de commande ; le serveur ne l'empêche pas (nécessiterait une fonction serveur). Un panneau de détection des doublons existe.
- **Stock** : chaque vente retire au plus le stock connu de l'appareil. Si deux appareils hors ligne vendent le dernier exemplaire, le serveur accepte la première et **refuse la seconde** (le stock ne peut pas devenir négatif) ; cette seconde vente reste signalée en « Échec » avec son mouvement de stock, et le patron tranche.
- **Cache local** : les anciens champs de coûts encore présents dans d'anciens documents restent dans le cache des appareils tant que la purge de l'étape 9 de `MISE-EN-SERVICE.md` n'a pas eu lieu. Le catalogue fournisseur « ancien outil » (liste locale `bg_cat`) contient des prix d'achat sur l'appareil du patron/administrateur.
- Un appareil resté hors ligne très longtemps, puis réactivé après une suspension du compte, voit ses écritures refusées : elles restent visibles en « Échec ».
