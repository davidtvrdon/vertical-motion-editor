#!/usr/bin/env bash
# Render a project's plan to MP4.
#   bash scripts/render.sh <project> [preview|final|audio]
# preview = half resolution, fast (for checking timing); final = full quality.
# audio   = re-render only the soundtrack and swap it into the existing final
#           (for SFX/music/volume changes: no video re-encode, keeps picture quality).
# Output: projects/<p>/out/<p>-<mode>.mp4
set -euo pipefail
cd "$(dirname "$0")/.."
P="${1:?usage: render.sh <project> [preview|final]}"
MODE="${2:-final}"
DIR="projects/$P"
[ -d "$P" ] && DIR="$P"
NAME="$(basename "$DIR")"
mkdir -p "$DIR/out"
python3 scripts/validate_plan.py "$DIR" || { echo "fix plan errors first"; exit 1; }
EXTRA=()
[ -n "${REMOTION_BROWSER_EXECUTABLE:-}" ] && EXTRA+=(--browser-executable "$REMOTION_BROWSER_EXECUTABLE")
if [ "$MODE" = "preview" ]; then
  EXTRA+=(--scale 0.5 --crf 28)
else
  EXTRA+=(--crf 18)
fi
if [ "$MODE" = "audio" ]; then
  [ -f "$DIR/out/$NAME-final.mp4" ] || { echo "no final render to swap audio into"; exit 1; }
  AEXTRA=()
  [ -n "${REMOTION_BROWSER_EXECUTABLE:-}" ] && AEXTRA+=(--browser-executable "$REMOTION_BROWSER_EXECUTABLE")
  npx remotion render src/index.ts Edit "$DIR/out/$NAME-audio.wav" --codec=wav \
    --props="$DIR/plan.json" --public-dir="$DIR" "${AEXTRA[@]}"
  ffmpeg -y -hide_banner -loglevel error -i "$DIR/out/$NAME-final.mp4" -i "$DIR/out/$NAME-audio.wav" \
    -map 0:v -map 1:a -c:v copy -c:a aac -b:a 320k -movflags +faststart "$DIR/out/$NAME-final.tmp.mp4"
  mv "$DIR/out/$NAME-final.tmp.mp4" "$DIR/out/$NAME-final.mp4" && rm "$DIR/out/$NAME-audio.wav"
  echo "→ $DIR/out/$NAME-final.mp4 (new audio)"
  exit 0
fi
npx remotion render src/index.ts Edit "$DIR/out/$NAME-$MODE.mp4" \
  --props="$DIR/plan.json" --public-dir="$DIR" "${EXTRA[@]}"
echo "→ $DIR/out/$NAME-$MODE.mp4"
