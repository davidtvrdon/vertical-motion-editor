#!/usr/bin/env bash
# Make the skills available to your agent from ANY folder (optional: inside this repo they work without it).
#   bash scripts/install_skill.sh                      # → ~/.claude/skills   (Claude Code)
#   bash scripts/install_skill.sh ~/.agents/skills     # any other agent's skills folder
# It copies the skills and records where this engine lives (ENGINE_DIR), because the skill drives the scripts in this repo.
# Re-run after `git pull` to refresh the copy.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="${1:-$HOME/.claude/skills}"
mkdir -p "$TARGET"
for s in vertical-motion-editor learn-motion-references; do
  rm -rf "$TARGET/$s"
  cp -R "$ROOT/.claude/skills/$s" "$TARGET/$s"
  printf '%s\n' "$ROOT" > "$TARGET/$s/ENGINE_DIR"
  echo "installed $TARGET/$s  (engine: $ROOT)"
done
echo
echo "Start your agent in any folder and say: \"set up my brand\" or \"edit this video\"."
echo "The skill reads ENGINE_DIR to find this repo; keep the repo where it is."
