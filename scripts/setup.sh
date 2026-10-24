#!/usr/bin/env bash
# One-time setup: Node packages (Remotion), Python venv (WhisperX), sound effects, theme, health check.
#   bash scripts/setup.sh
# Options (environment variables):
#   SKIP_WHISPERX=1   skip the Python/WhisperX install (you can add it later; you need it for transcription)
set -euo pipefail
cd "$(dirname "$0")/.."

MISSING=0
need() { command -v "$1" >/dev/null 2>&1 || { echo "✗ $1 is missing: $2"; MISSING=1; }; }
need node "install Node 20+  (macOS: brew install node · Ubuntu: sudo apt install nodejs npm · https://nodejs.org)"
need npm "comes with Node.js"
need ffmpeg "macOS: brew install ffmpeg · Ubuntu: sudo apt install ffmpeg · Windows: use WSL, then sudo apt install ffmpeg"
need ffprobe "installed together with ffmpeg"
need python3 "install Python 3.10–3.13  (macOS: brew install python@3.12 · Ubuntu: sudo apt install python3.12 python3.12-venv)"
[ "$MISSING" = 1 ] && { echo; echo "Install the missing tools above, then run this script again."; exit 1; }

echo "→ npm install (Remotion)"
npm install --no-fund --no-audit

if [ "${SKIP_WHISPERX:-0}" != "1" ]; then
  PY=python3
  for v in python3.12 python3.11 python3.13 python3.10; do command -v $v >/dev/null && { PY=$v; break; }; done
  if [ ! -d .venv ]; then
    echo "→ creating .venv with $($PY --version)"
    "$PY" -m venv .venv
  fi
  echo "→ pip install -r requirements.txt  (WhisperX pulls PyTorch: several GB, a few minutes)"
  .venv/bin/pip install --upgrade pip >/dev/null
  .venv/bin/pip install -r requirements.txt

  echo "→ NLTK sentence tokenizer (used by WhisperX alignment)"
  .venv/bin/python -m nltk.downloader -q punkt_tab || echo "  (retry later: .venv/bin/python -m nltk.downloader punkt_tab)"

  echo "→ face detector model (YuNet, for analyze_faces.py)"
  .venv/bin/python -c "import sys; sys.path.insert(0, 'scripts'); from analyze_faces import ensure_model; ensure_model()" || echo "  (it downloads on first use instead)"
  PYRUN=.venv/bin/python
else
  echo "→ skipping Python/WhisperX (SKIP_WHISPERX=1)"
  PYRUN=python3
fi

[ -f .env ] || { cp .env.example .env; chmod 600 .env 2>/dev/null || true; echo "→ created .env (gitignored) for your keys"; }
[ -f public/brand/sfx/whoosh.wav ] || { [ "${SKIP_WHISPERX:-0}" = "1" ] || .venv/bin/python scripts/make_sfx.py; }

echo "→ applying the brand/theme"
$PYRUN scripts/apply_brand.py || python3 scripts/apply_brand.py

echo
$PYRUN scripts/doctor.py || true
echo
echo "Next: let your AI agent run the onboarding (say \"set up my brand\"), or run:  python3 scripts/onboard.py"
echo "      Preview the styles:               node scripts/preview_styles.mjs   → out/style-previews/*.jpg"
echo "      Browse every component:           npm run studio   (GalleryShort)"
