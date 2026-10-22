#!/bin/bash
# BG-MARKET-STUDIO : prépare l'environnement Cinetic au démarrage d'une session cloud.
# Idempotent, non interactif, sans secret. Ne lance aucun rendu.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$HOOK_DIR/../.." && pwd)}"
VENV="${STUDIO_VENV:-$HOME/.venvs/cinetic}"
CHROMIUM="${STUDIO_CHROMIUM:-/opt/pw-browsers/chromium-1194/chrome-linux/chrome}"
REQS="$HOOK_DIR/requirements-cinetic.txt"
IMPORTS="import scipy, soundfile, pyloudnorm, cv2, librosa, fontTools, brotli, uharfbuzz, PIL, numpy"

log() { echo "[studio] $*" >&2; }

deps_ok() { [ -x "$VENV/bin/python" ] && "$VENV/bin/python" -I -c "$IMPORTS" >/dev/null 2>&1; }

# 1. Venv Python : (re)création si absent ou cassé
if [ ! -x "$VENV/bin/python" ] || ! "$VENV/bin/python" -I -c "pass" >/dev/null 2>&1; then
  log "création du venv $VENV"
  rm -rf "$VENV"
  python3 -m venv "$VENV"
fi

# 2. Dépendances : installation seulement si un import échoue
if deps_ok; then
  log "dépendances Python déjà conformes"
else
  log "installation des dépendances manquantes (PyPI, versions épinglées, wheels uniquement)"
  "$VENV/bin/python" -m pip install --quiet --disable-pip-version-check \
    --only-binary=:all: -r "$REQS"
  deps_ok || { log "ERREUR : imports toujours en échec après installation"; exit 1; }
fi

# 3. Chromium local
if [ -x "$CHROMIUM" ]; then
  log "Chromium local : $CHROMIUM"
else
  log "AVERTISSEMENT : Chromium introuvable à $CHROMIUM (CHROMIUM_PATH non défini)"
  CHROMIUM=""
fi

# 4. Skill Cinetic (versionné dans le dépôt, jamais réinstallé à distance)
if [ ! -f "$PROJECT_DIR/.claude/skills/cinetic/SKILL.md" ]; then
  log "AVERTISSEMENT : skill cinetic absent de $PROJECT_DIR/.claude/skills (récupérer depuis git)"
fi

# 5. Variables d'environnement de la session (dédupliquées)
if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  add_env() { grep -qxF "$1" "$CLAUDE_ENV_FILE" 2>/dev/null || echo "$1" >> "$CLAUDE_ENV_FILE"; }
  add_env "export PATH=\"$VENV/bin:\$PATH\""
  if [ -n "$CHROMIUM" ]; then
    add_env "export CHROMIUM_PATH=\"$CHROMIUM\""
    add_env "export REMOTION_BROWSER=\"$CHROMIUM\""
  fi
fi
log "prêt"
