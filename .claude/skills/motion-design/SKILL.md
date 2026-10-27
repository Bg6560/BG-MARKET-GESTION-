---
name: motion-design
description: Crée une vidéo motion design (présentation animée d'un produit, d'une boutique, d'une offre ou d'une app) et la livre en MP4 prêt à publier, avec bruitages et, en option, musique et voix off. Déroulé guidé, avec un entretien puis la validation de l'histoire et d'un aperçu avant le rendu final. À utiliser quand on demande une vidéo animée, une pub, un teaser, une story, un réel, une intro de marque, un film de lancement ou une vidéo pour WhatsApp, Instagram, TikTok, YouTube ou le site.
---

# Motion design — vidéo animée en MP4

La vidéo est une page HTML animée en CSS (la « composition »). `render.mjs` la filme image par image
(chaque animation est placée à l'instant exact de l'image, sans saccade) et ffmpeg l'assemble en MP4.
Les fichiers du skill sont tous à côté de ce SKILL.md :

| Fichier | Rôle |
|---|---|
| `render.mjs` | `init` (nouveau projet), `preview` (images clés + planche), `render` (MP4) |
| `template.html` | Composition de départ : 4 scènes, moteur de temps, compteurs, texte mot à mot, bruitages |
| `lib.css` | Bibliothèque d'animations et de blocs (copiée dans chaque projet) |
| `patterns.md` | Catalogue des effets et recettes de scènes : à lire avant d'écrire la composition |

Les projets vivent dans `motion/<nom-du-projet>/` à la racine du dépôt (`out/` y est ignoré par git).

## Règle d'or

**Rien n'est rendu sans accord.** On pose une question à la fois et on attend la réponse.
L'histoire est validée, puis l'aperçu, et seulement ensuite le film final.
L'utilisateur parle français et n'est pas forcément technicien : rester simple et concret, sans jargon.

## Étape 1 — Entretien (une question par message)

Poser ces questions dans l'ordre, une seule par message, en proposant des choix quand c'est possible.
Ne pas reposer une question dont la réponse est déjà connue (demande initiale, `bg-market-core`, échanges précédents).

1. **Le sujet** : quoi présenter ? (BG Market en général, un produit, une promo, une nouveauté, un service…)
2. **Le message clé** : la phrase unique que le spectateur doit retenir.
3. **Le public** : à qui on parle ? (clients actuels, nouveaux clients, revendeurs…)
4. **La diffusion → le format** :
   - statut WhatsApp, story ou réel Instagram, TikTok → **vertical 9:16** (`--format vertical`)
   - publication Instagram ou Facebook → **carré 1:1** (`--format square`)
   - YouTube, site web, présentation → **horizontal 16:9** (`--format wide`)
5. **La durée** : 15 s (teaser), 30 s (standard) ou 45–60 s (explication). Par défaut : 30 s.
6. **L'appel à l'action** : que doit faire le spectateur à la fin ? (commander sur WhatsApp, visiter, appeler…) Avec le contact exact.

## Étape 2 — Éléments facultatifs

Présenter la liste en un seul message, en disant ce que chaque élément apporte. Pour chacun, l'utilisateur
**le fournit**, **me laisse le chercher** (dans le dépôt, par exemple le logo ou les captures de l'app) ou **me laisse le créer en code**.

- **Logo** : renforce la marque (début et fin du film). Sans logo, on fait un logo texte animé.
- **Couleurs et police** : sans charte, proposer 2 ou 3 palettes adaptées au sujet et laisser choisir.
- **Captures d'écran ou photos produits** : rendent le film concret. Elles s'affichent dans une maquette de téléphone ou en plein écran.
- **Images sur mesure** : écrire les prompts avec le skill `chatgpt-images-2-prompter`. L'utilisateur les génère dans ChatGPT et les dépose dans `assets/`.
- **Voix off** : à générer avec le connecteur ElevenLabs (`creative_generate_speech`, voix française choisie avec `creative_list_voices`). Écrire le texte d'abord et le faire valider. Compter environ 2,5 mots par seconde.
- **Musique** : fournie par l'utilisateur, ou générée avec ElevenLabs (`creative_generate_in_flow`). Elle reste discrète sous la voix (`--music-volume .2`).
- **Bruitages** : toujours inclus, synthétisés au rendu (whoosh, pop, click, rise, impact). Rien à fournir.

Les fichiers reçus vont dans `motion/<projet>/assets/`. La génération ElevenLabs consomme des crédits : prévenir avant.

## Étape 3 — L'histoire (à valider)

Écrire le **scénario scène par scène** dans un tableau, à faire valider avant d'écrire du code :

| # | Temps | À l'écran (texte exact) | Animation | Son |
|---|---|---|---|---|
| 1 | 0–4 s | « BG Market » puis « Votre marché, en ligne » | mot à mot, sortie vers le haut | whoosh |

Règles de narration :
- **Accroche en moins de 2 s** : un chiffre, une question ou un bénéfice fort, jamais un logo seul pendant 3 s.
- **Une idée par scène**, 3 à 7 mots à l'écran au plus. Une scène dure entre 2,5 et 5 s.
- Structure type : accroche → problème ou besoin → solution (produit, app) → preuves (chiffres, avantages) → appel à l'action + logo.
- Le texte doit rester lisible téléphone en main : gros, contrasté, centré, dans la zone de sécurité (marges de 8 %, plus en vertical où l'interface TikTok ou Instagram couvre le bas).
- Si une voix off est prévue, le texte à l'écran la résume, il ne la recopie pas.

## Étape 4 — Fabrication

```bash
S=.claude/skills/motion-design
node $S/render.mjs init motion/<projet> --format vertical --duration 30   # crée index.html + lib.css + assets/
```

Puis lire `patterns.md` et réécrire `motion/<projet>/index.html` :
- adapter `:root` (couleurs, police) dans le `<style>` du projet ;
- une `<section class="scene" style="--t0:… ; --dur:…">` par scène du scénario, dans l'ordre. `--t0` + `--dur` d'une scène = `--t0` de la suivante, et la dernière finit à `data-duration` ;
- les effets via `class="fx <effet>" style="--d:<retard dans la scène>"` ;
- les bruitages dans `<script id="mv-audio">`, calés sur les entrées et les transitions ;
- **garder intact le script moteur** en bas du modèle (`window.__mv`).

Varier les effets d'une scène à l'autre : un film où tout fait `fade-up` paraît amateur.
Échelonner les entrées (0,1 à 0,3 s entre éléments), terminer les entrées avant 60 % de la scène et laisser le temps de lire.

## Étape 5 — Aperçu (à valider)

```bash
node $S/render.mjs preview motion/<projet>/index.html          # une image par scène + planche.png
node $S/render.mjs render  motion/<projet>/index.html --scale .5 --out motion/<projet>/out/brouillon.mp4
```

1. Ouvrir `out/apercu/planche.png` avec Read et **la vérifier soi-même** : texte coupé, débordement, contraste, scène vide, chevauchement. Pour contrôler une transition : `--at 3.9,4.1`. Corriger avant de montrer.
2. Envoyer la planche et le brouillon (demi-résolution, rendu rapide) à l'utilisateur avec SendUserFile, puis demander les retouches.
3. Recommencer jusqu'à son accord explicite.

## Étape 6 — Rendu final

```bash
node $S/render.mjs render motion/<projet>/index.html \
  [--music motion/<projet>/assets/musique.mp3 --music-volume .2] \
  [--voice motion/<projet>/assets/voix.mp3@0.5]
```

Le film arrive dans `motion/<projet>/out/<projet>.mp4` (H.264 + AAC, compatible WhatsApp et les réseaux).
Vérifier la durée et la présence du son avec `ffprobe`, puis l'envoyer avec SendUserFile et donner le chemin.
Comptez environ 1 minute de rendu pour 30 s de vidéo en 1080p. Si le fichier doit passer sur WhatsApp
(16 Mo maximum), le recompresser au besoin : `ffmpeg -i film.mp4 -crf 26 -c:a copy film-wa.mp4`.

Proposer ensuite des déclinaisons : un autre format (refaire `init` dans un nouveau dossier et y copier les scènes en ajustant les tailles) ou une version courte de 15 s.

## Dépannage

- `ressource introuvable` : chemin d'image faux. Les chemins sont relatifs à `index.html`, par exemple `assets/logo.png`.
- Texte trop grand en 16:9 : les tailles sont en `vmin`, réduire la classe ou utiliser `font-size` en ligne.
- Élément qui doit entrer puis sortir : l'entrée sur l'élément (`fx …`), la sortie sur un wrapper (`fx-out out-…`).
- Police : Inter est installée. Une police Google Fonts demande le réseau ; à défaut, rester sur Inter.
