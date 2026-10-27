# Catalogue d'effets et recettes de scènes

Tous les effets viennent de `lib.css`. Dans une scène, le temps est relatif : `--d` = retard depuis le début
de la scène, `--len` = durée de l'effet (0,8 s par défaut).

## Entrées (classe `fx` + une classe d'effet)

| Classe | Rendu | Bon usage |
|---|---|---|
| `fade` | apparition en fondu | sur-titres, mentions |
| `fade-up` / `fade-down` | monte ou descend en apparaissant | sous-titres, listes |
| `slide-left` / `slide-right` | glisse depuis le côté | cartes, captures, comparaisons |
| `pop` | grossit avec un léger rebond | chiffres, pastilles, icônes |
| `zoom-in` | arrive de plus près | visuels plein écran |
| `blur-in` | sort du flou | titres d'appel à l'action, révélations |
| `mask-up` | le texte sort d'une fente invisible | gros titres (effet « pro ») |
| `wipe-right` | dévoilé de gauche à droite | slogans, barres, images |
| `stamp` | tampon incliné qui s'écrase | prix, « -30 % », « Nouveau » |
| `spin-in` | arrive en tournant | logo, icône |
| `draw` | trace un contour SVG (`--path-len` = longueur du tracé) | logos en ligne, flèches, coches |

Sur un mot ou un `<span>` : `class="underline"` trace un soulignement couleur accent après l'entrée.

## Sorties (sur un wrapper `fx-out`)

`out-fade`, `out-up`, `out-zoom`, calées automatiquement sur la fin de la scène.
`--len-out` règle la durée et `--out-early` avance la sortie.

```html
<div class="fx-out out-zoom"><h1 class="title fx mask-up" style="--d:.2">…</h1></div>
```

## Mouvements continus (toute la durée de la scène)

`float` (flotte doucement : téléphone, produit), `ken-burns` (zoom lent : photo de fond), `drift` (glisse lentement : bandeau, motif).
Les poser sur un wrapper si l'élément a déjà une entrée.

## Texte cinétique

```html
<h1 class="title words" data-step=".09" data-fx="mask-up" style="--d:.3">Livré chez vous en 24 h</h1>
```
Chaque mot entre l'un après l'autre (`data-step` = écart en secondes, `data-fx` = effet, `fade-up` par défaut).

## Compteur

```html
<span data-count-to="98" data-at=".4" data-len="1.2" data-decimals="0">0</span> %
```
Le compteur monte de `data-from` (0 par défaut) à `data-count-to`, avec un ralenti en fin de course. `data-at` est relatif à la scène.

## Transitions

`<div class="wipe" style="--at:8"></div>`, placé dans `#stage` hors des scènes : un bandeau accent balaie l'écran
et masque le changement de scène à 8 s. Ajouter un `whoosh` à `--at - 0.4`. À utiliser 2 ou 3 fois par film, pas à chaque scène.
Sinon, enchaîner une sortie `out-*` et une entrée.

## Blocs prêts

`title`, `subtitle`, `kicker` (sur-titre), `big` (chiffre géant), `chip` (pastille), `card`, `row`, `logo`,
`cover` + `shade` (image plein écran assombrie), `phone` (maquette de téléphone autour d'une capture).

## Bruitages (`<script id="mv-audio">`)

| Son | Pour |
|---|---|
| `whoosh` | transitions, gros mouvements (caler 0,3 à 0,4 s avant) |
| `pop` | pastilles, chiffres, icônes qui apparaissent |
| `click` | éléments de liste, boutons, en rafale toutes les 0,2 s |
| `rise` | montée de tension avant une révélation (1 s) |
| `impact` | révélation finale, logo, prix |

`{ "t": 4.5, "s": "pop", "v": 0.6 }` : `v` règle le volume (0,8 par défaut). Ne pas mettre un son sur chaque élément.

## Recettes de scènes

**Accroche chiffre**
```html
<section class="scene" style="--t0:0; --dur:3.5">
  <p class="big fx pop" style="--d:.2"><span data-count-to="500" data-at=".2">0</span>+</p>
  <p class="subtitle words" data-step=".07" style="--d:.8">clients livrés ce mois-ci</p>
</section>
```

**Produit sur photo**
```html
<section class="scene" style="--t0:3.5; --dur:4">
  <div class="cover ken-burns" style="background:url(assets/produit.jpg) center/cover"></div>
  <div class="shade"></div>
  <p class="kicker fx fade" style="--d:.3">Nouveau</p>
  <h2 class="title fx mask-up" style="--d:.5">Riz parfumé 25 kg</h2>
  <p class="chip fx stamp" style="--d:1.3">18 500 F</p>
</section>
```

**Démonstration de l'app**
```html
<section class="scene" style="--t0:7.5; --dur:5">
  <div class="float"><div class="phone fx slide-left" style="--d:.2"><img src="assets/capture.png" alt=""></div></div>
  <p class="subtitle fx fade-up" style="--d:.9">Commandez en 2 clics</p>
</section>
```

**Avantages en liste**
```html
<section class="scene" style="--t0:12.5; --dur:4">
  <h2 class="title fx mask-up" style="--d:.1">Pourquoi BG Market&nbsp;?</h2>
  <div class="card fx slide-right" style="--d:.7">✔ Livraison rapide</div>
  <div class="card fx slide-right" style="--d:.95">✔ Paiement mobile</div>
  <div class="card fx slide-right" style="--d:1.2">✔ Prix grossiste</div>
</section>
```

**Appel à l'action + logo**
```html
<section class="scene" style="--t0:16.5; --dur:3.5">
  <img class="logo fx spin-in" src="assets/logo.png" style="--d:.1" alt="">
  <h2 class="title fx blur-in" style="--d:.6">Commandez sur WhatsApp</h2>
  <p class="chip fx pop" style="--d:1.2">+225 00 00 00 00</p>
</section>
```

## Rythme

- Une scène d'accroche courte (2,5 à 3,5 s), un milieu plus posé, une fin avec impact.
- Le dernier écran (appel à l'action) reste au moins 2 s **après** sa dernière entrée.
- Alterner les directions d'entrée (bas, côté, zoom) d'une scène à l'autre.
- Avec une musique, caler les changements de scène sur les temps forts (à 120 BPM, un temps dure 0,5 s).
