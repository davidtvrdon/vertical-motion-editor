#!/usr/bin/env python3
"""Check that everything the editor needs is installed and configured.

    python3 scripts/doctor.py            # human-readable report
    python3 scripts/doctor.py --json     # machine-readable (for agents)
    python3 scripts/doctor.py --online   # also test the Pexels key with one request

Exit code 1 when something REQUIRED is missing. "optional" items only limit features.
Each problem comes with the exact command or link that fixes it.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VENV_PY = ROOT / ".venv" / "bin" / "python"
if not VENV_PY.exists():
    VENV_PY = ROOT / ".venv" / "Scripts" / "python.exe"


def run(cmd: list[str], timeout: int = 20) -> str:
    try:
        return subprocess.run(cmd, capture_output=True, text=True, timeout=timeout).stdout.strip()
    except Exception:
        return ""


def version_of(cmd: list[str]) -> str | None:
    out = run(cmd)
    m = re.search(r"(\d+)\.(\d+)(?:\.(\d+))?", out)
    return m.group(0) if m else None


def env_file_value(key: str) -> str:
    if os.environ.get(key):
        return os.environ[key].strip()
    p = ROOT / ".env"
    if p.exists():
        for line in p.read_text(encoding="utf-8").splitlines():
            if line.strip().startswith(f"{key}="):
                return line.split("=", 1)[1].strip().strip("\"'")
    return ""


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--online", action="store_true", help="test the Pexels key with one request")
    a = ap.parse_args()

    checks: list[dict] = []

    def add(name: str, ok: bool, detail: str, fix: str = "", required: bool = True) -> None:
        checks.append({"name": name, "ok": ok, "required": required, "detail": detail, "fix": fix})

    # ---- system tools
    node = version_of(["node", "--version"])
    add("Node.js ≥ 18", bool(node) and int(node.split(".")[0]) >= 18, node or "not found",
        "Install Node 20+: https://nodejs.org  (macOS: brew install node · Ubuntu: sudo apt install nodejs npm)")
    add("npm", bool(shutil.which("npm")), version_of(["npm", "--version"]) or "not found", "comes with Node.js")
    ff = version_of(["ffmpeg", "-version"])
    add("ffmpeg", bool(ff), ff or "not found", "macOS: brew install ffmpeg · Ubuntu: sudo apt install ffmpeg · Windows: winget install ffmpeg")
    add("ffprobe", bool(shutil.which("ffprobe")), "found" if shutil.which("ffprobe") else "not found", "installed together with ffmpeg")
    py = sys.version_info
    add("Python 3.10–3.13", (3, 10) <= (py.major, py.minor) <= (3, 13), f"{py.major}.{py.minor}.{py.micro}",
        "WhisperX needs Python 3.10–3.13. macOS: brew install python@3.12 · Ubuntu: sudo apt install python3.12 python3.12-venv")

    # ---- project install
    add("npm packages (Remotion)", (ROOT / "node_modules" / "remotion").exists(), "installed" if (ROOT / "node_modules" / "remotion").exists() else "missing", "run: bash scripts/setup.sh  (or: npm install)")
    venv_ok = VENV_PY.exists()
    add("Python venv (.venv)", venv_ok, "found" if venv_ok else "missing", "run: bash scripts/setup.sh")
    if venv_ok:
        for mod, why, req in (("whisperx", "word-level transcription", True), ("numpy", "layout detection, sound effects", True), ("PIL", "logo colours, image sizes (pillow)", False), ("cv2", "face tracking for the no-cover rule (opencv)", False)):
            ok = subprocess.run([str(VENV_PY), "-c", f"import {mod}"], capture_output=True).returncode == 0
            add(f"python: {mod}", ok, why if ok else "not importable", "run: .venv/bin/pip install -r requirements.txt", required=req)

    # ---- Pexels
    key = env_file_value("PEXELS_API_KEY")
    add("Pexels API key", bool(key), "set" if key else "missing",
        "Free key (1 minute): https://www.pexels.com/api/ → sign up → \"Your API Key\". Put it in .env as PEXELS_API_KEY=… or run: python3 scripts/onboard.py", required=False)
    if key and a.online:
        res = subprocess.run([sys.executable, str(ROOT / "scripts" / "pexels.py"), "check"], capture_output=True, text=True, env={**os.environ, "PEXELS_API_KEY": key})
        add("Pexels key works", res.returncode == 0, (res.stdout + res.stderr).strip(), "copy the key again from https://www.pexels.com/api/", required=False)

    # ---- brand
    brand_json = ROOT / "brand" / "brand.json"
    active_p = ROOT / "src" / "theme" / "active.json"
    theme = json.loads(active_p.read_text(encoding="utf-8")) if active_p.exists() else {}
    add("brand set up", brand_json.exists(), "brand/brand.json found" if brand_json.exists() else "using the default style, no logo or name",
        "run the onboarding: ask the agent \"set up my brand\", or: python3 scripts/onboard.py", required=False)
    if theme:
        missing = [f["url"] for f in theme.get("fonts", {}).get("files", []) if not (ROOT / "public" / f["url"]).exists()]
        add("theme fonts present", not missing, f"{theme['fonts']['family']}" if not missing else f"missing: {', '.join(missing)}", "run: python3 scripts/apply_brand.py")
        if theme.get("logo"):
            add("logo file present", (ROOT / "public" / theme["logo"]["file"]).exists(), theme["logo"]["file"], "run: python3 scripts/apply_brand.py")
        o = theme.get("outro", {})
        add("outro", True, f"{o.get('style')} · {o.get('duration')} s" + (f" · CTA “{o.get('cta')}”" if o.get("cta") else ""), required=False)
    add("sound effects", (ROOT / "public" / "brand" / "sfx" / "whoosh.wav").exists(), "whoosh.wav" if (ROOT / "public" / "brand" / "sfx" / "whoosh.wav").exists() else "missing", "run: .venv/bin/python scripts/make_sfx.py", required=False)

    # ---- browser for Remotion
    exe = os.environ.get("REMOTION_BROWSER_EXECUTABLE")
    if exe:
        add("Remotion browser", Path(exe).exists(), exe, "fix REMOTION_BROWSER_EXECUTABLE in .env", required=True)
    else:
        add("Remotion browser", True, "Remotion downloads its own headless Chrome on the first render (needs internet once)", required=False)

    failed = [c for c in checks if not c["ok"] and c["required"]]
    if a.json:
        print(json.dumps({"ok": not failed, "checks": checks, "theme": {"preset": theme.get("preset"), "brand": theme.get("brand"), "language": theme.get("language")}}, indent=2, ensure_ascii=False))
    else:
        for c in checks:
            mark = "✓" if c["ok"] else ("✗" if c["required"] else "·")
            tail = "" if c["ok"] else ("  (optional)" if not c["required"] else "")
            print(f"{mark} {c['name']}: {c['detail']}{tail}")
            if not c["ok"] and c["fix"]:
                print(f"    → {c['fix']}")
        print()
        print("All required checks passed." if not failed else f"{len(failed)} required check(s) failed. Fix them in the order shown, then run this again.")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
