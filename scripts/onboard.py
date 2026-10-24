#!/usr/bin/env python3
"""Set up (or change) your brand: name, colours, font, logo, visual style, outro and your Pexels key.

Interactive (asks questions, Enter keeps the default):
    python3 scripts/onboard.py

Non-interactive (what an AI agent runs after asking you the questions):
    python3 scripts/onboard.py --name "Acme Weekly" --handle @acmeweekly --language en --preset pulse \\
        --primary "#FF5A1F" --secondary "#1B1F3B" --font "Space Grotesk" --logo ~/Brand/logo.png \\
        --outro-style follow-card --outro-cta "Follow for more" --outro-platform instagram=@acmeweekly --outro-platform youtube=@acmeweekly
    printf '%s' "$KEY" | python3 scripts/onboard.py --pexels-key-stdin     # the key never appears in argv / shell history

    python3 scripts/onboard.py --show        # print the current brand
    python3 scripts/onboard.py --suggest-colors ~/Brand/logo.png

Writes brand/brand.json (kept, so you can edit it by hand) and then runs scripts/apply_brand.py. The Pexels key goes
to .env, which is gitignored. Nothing here is sent anywhere except the font download from Google Fonts.
"""
from __future__ import annotations

import argparse
import getpass
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BRAND_JSON = ROOT / "brand" / "brand.json"
PRESETS = json.loads((ROOT / "src" / "theme" / "presets.json").read_text(encoding="utf-8"))
PLATFORMS = ["youtube", "instagram", "tiktok", "x", "linkedin", "facebook", "spotify", "apple", "website"]
OUTROS = {
    "logo-card": "your logo, a call to action, your handle and platform icons",
    "follow-card": "a big call to action with one line per platform handle",
    "minimal": "just a call to action and your handle",
    "custom": "your own image or short video",
    "none": "no outro",
}


def load() -> dict:
    return json.loads(BRAND_JSON.read_text(encoding="utf-8")) if BRAND_JSON.exists() else {}


def save(b: dict) -> None:
    BRAND_JSON.parent.mkdir(parents=True, exist_ok=True)
    BRAND_JSON.write_text(json.dumps(b, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def stash(path: str) -> str:
    """Copy a user file into brand/assets/ and return the portable relative path (brand.json stays valid on any machine)."""
    if not path:
        return path
    src = Path(path).expanduser()
    if not src.is_file():
        sys.exit(f"error: file not found: {path}")
    dest_dir = BRAND_JSON.parent / "assets"
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / src.name
    if src.resolve() != dest.resolve():
        shutil.copy2(src, dest)
    return f"assets/{src.name}"


def set_env(key: str, value: str) -> None:
    p = ROOT / ".env"
    lines = p.read_text(encoding="utf-8").splitlines() if p.exists() else []
    out, done = [], False
    for ln in lines:
        if ln.strip().startswith(f"{key}="):
            out.append(f"{key}={value}")
            done = True
        else:
            out.append(ln)
    if not done:
        out.append(f"{key}={value}")
    p.write_text("\n".join(out) + "\n", encoding="utf-8")
    try:
        p.chmod(0o600)
    except OSError:
        pass


def ask(question: str, default: str = "", choices: list[str] | None = None) -> str:
    hint = f" [{default}]" if default else ""
    while True:
        ans = input(f"{question}{hint}: ").strip()
        ans = ans or default
        if choices and ans and ans not in choices:
            print(f"  choose one of: {', '.join(choices)}")
            continue
        return ans


def hexcheck(v: str) -> str:
    v = v.strip()
    if v and not re.fullmatch(r"#?[0-9a-fA-F]{6}", v):
        sys.exit(f"error: '{v}' is not a #RRGGBB colour")
    return ("#" + v.lstrip("#")).upper() if v else ""


def parse_platform(s: str) -> dict:
    kind, _, handle = s.partition("=")
    kind = kind.strip().lower()
    if kind not in PLATFORMS:
        sys.exit(f"error: platform '{kind}' unknown. Use one of: {', '.join(PLATFORMS)}")
    return {"kind": kind, "handle": handle.strip()}


def interactive(b: dict) -> dict:
    print("Let's set up your brand. Press Enter to keep the value in [brackets].\n")
    b["brandName"] = ask("Brand / channel name", b.get("brandName", ""))
    b["handle"] = ask("Main handle (e.g. @yourname)", b.get("handle", ""))
    b["tagline"] = ask("Tagline (optional)", b.get("tagline", ""))
    b["language"] = ask("Language of your videos (ISO code: en, de, sk, …)", b.get("language", "en"))

    print("\nVisual style:")
    for k, v in PRESETS["presets"].items():
        print(f"  {k:<10} {v['description']}")
    print("  (render previews of all four: node scripts/preview_styles.mjs → out/style-previews/)")
    b["preset"] = ask("Pick a style", b.get("preset", PRESETS["default"]), list(PRESETS["presets"]))

    print("\nColours: leave empty to keep the style's own palette.")
    c = b.setdefault("colors", {})
    for k, label in (("primary", "Primary / accent colour"), ("secondary", "Secondary / deep colour")):
        v = hexcheck(ask(f"{label} (#RRGGBB)", c.get(k, "")))
        if v:
            c[k] = v
        else:
            c.pop(k, None)
    if not c:
        b.pop("colors")

    logo = ask("Path to your logo (PNG with transparent background or SVG; Enter to skip)", b.get("logo", ""))
    if logo:
        b["logo"] = stash(logo)
        if ask("Show the logo as a small watermark on every video? (y/n)", "n", ["y", "n"]) == "y":
            b["watermark"] = {"corner": ask("Corner", "top-left", ["top-left", "top-right", "bottom-left", "bottom-right"]), "size": 190}
        else:
            b.pop("watermark", None)
    else:
        b.pop("logo", None)

    font = ask("Font: a Google Fonts name, a path to a font file, or Enter for the style's font", b.get("font", ""))
    if font:
        b["font"] = stash(font) if Path(font).expanduser().is_file() else font
    else:
        b.pop("font", None)

    print("\nOutro (the end card appended to each short):")
    for k, v in OUTROS.items():
        print(f"  {k:<12} {v}")
    o = b.setdefault("outro", {})
    o["style"] = ask("Outro style", o.get("style", "logo-card" if b.get("logo") else "follow-card"), list(OUTROS))
    if o["style"] != "none":
        o["cta"] = ask("Call to action text", o.get("cta", "Follow for more"))
        o["duration"] = float(ask("Duration in seconds", str(o.get("duration", 2.5))))
        if o["style"] == "custom":
            o["file"] = stash(ask("Path to your outro image or video", o.get("file", "")))
        else:
            plats = []
            print(f"Platforms to show ({', '.join(PLATFORMS)}). Empty line to finish.")
            while True:
                s = input("  platform[=@handle]: ").strip()
                if not s:
                    break
                plats.append(parse_platform(s))
            o["platforms"] = plats or o.get("platforms", [])
        snd = ask("Outro sound file (optional, e.g. a short jingle .wav/.mp3)", o.get("sound", ""))
        if snd:
            o["sound"] = stash(snd)
    return b


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--show", action="store_true")
    ap.add_argument("--suggest-colors", metavar="LOGO")
    ap.add_argument("--name")
    ap.add_argument("--handle")
    ap.add_argument("--website")
    ap.add_argument("--tagline")
    ap.add_argument("--language")
    ap.add_argument("--preset", choices=list(PRESETS["presets"]))
    ap.add_argument("--primary")
    ap.add_argument("--secondary")
    ap.add_argument("--dark")
    ap.add_argument("--paper")
    ap.add_argument("--font")
    ap.add_argument("--logo")
    ap.add_argument("--watermark", choices=["top-left", "top-right", "bottom-left", "bottom-right", "off"])
    ap.add_argument("--outro-style", choices=list(OUTROS))
    ap.add_argument("--outro-cta")
    ap.add_argument("--outro-duration", type=float)
    ap.add_argument("--outro-platform", action="append", metavar="KIND[=HANDLE]", help="repeatable; replaces the saved list")
    ap.add_argument("--outro-file")
    ap.add_argument("--outro-sound")
    ap.add_argument("--pexels-key-stdin", action="store_true", help="read the Pexels API key from stdin and save it to .env")
    ap.add_argument("--no-apply", action="store_true", help="only write brand.json, don't run apply_brand.py")
    a = ap.parse_args()

    py = str(ROOT / ".venv" / "bin" / "python") if (ROOT / ".venv" / "bin" / "python").exists() else sys.executable

    if a.suggest_colors:
        subprocess.run([py, str(ROOT / "scripts" / "apply_brand.py"), "--suggest-colors", a.suggest_colors], check=True)
        return
    if a.show:
        print(json.dumps(load(), indent=2, ensure_ascii=False) if BRAND_JSON.exists() else "no brand yet (default style). Run: python3 scripts/onboard.py")
        return

    if a.pexels_key_stdin:
        key = sys.stdin.read().strip()
        if not key:
            sys.exit("error: nothing on stdin")
        set_env("PEXELS_API_KEY", key)
        print("saved PEXELS_API_KEY to .env (gitignored)")
        subprocess.run([sys.executable, str(ROOT / "scripts" / "pexels.py"), "check"])

    flags = [a.name, a.handle, a.website, a.tagline, a.language, a.preset, a.primary, a.secondary, a.dark, a.paper, a.font, a.logo,
             a.watermark, a.outro_style, a.outro_cta, a.outro_duration, a.outro_platform, a.outro_file, a.outro_sound]
    b = load()
    if all(f is None for f in flags):
        if a.pexels_key_stdin:
            return
        if not sys.stdin.isatty():
            sys.exit("no options given and no terminal to ask in. See --help.")
        b = interactive(b)
        if not (ROOT / ".env").exists() or "PEXELS_API_KEY=" not in (ROOT / ".env").read_text(encoding="utf-8") or re.search(r"^PEXELS_API_KEY=\s*$", (ROOT / ".env").read_text(encoding="utf-8"), re.M):
            print("\nPexels gives you free stock footage. Get a key at https://www.pexels.com/api/ (sign up → \"Your API Key\").")
            key = getpass.getpass("Paste your Pexels API key (hidden, Enter to skip): ").strip()
            if key:
                set_env("PEXELS_API_KEY", key)
                subprocess.run([sys.executable, str(ROOT / "scripts" / "pexels.py"), "check"])
    else:
        if a.name is not None: b["brandName"] = a.name
        if a.handle is not None: b["handle"] = a.handle
        if a.website is not None: b["website"] = a.website
        if a.tagline is not None: b["tagline"] = a.tagline
        if a.language is not None: b["language"] = a.language.lower()
        if a.preset is not None: b["preset"] = a.preset
        for k in ("primary", "secondary", "dark", "paper"):
            v = getattr(a, k)
            if v is not None:
                b.setdefault("colors", {})[k] = hexcheck(v)
        if a.font is not None: b["font"] = stash(a.font) if Path(a.font).expanduser().is_file() else a.font
        if a.logo is not None: b["logo"] = stash(a.logo)
        if a.watermark is not None:
            if a.watermark == "off":
                b.pop("watermark", None)
            else:
                b["watermark"] = {"corner": a.watermark, "size": 190}
        o = b.setdefault("outro", {})
        if a.outro_style is not None: o["style"] = a.outro_style
        if a.outro_cta is not None: o["cta"] = a.outro_cta
        if a.outro_duration is not None: o["duration"] = a.outro_duration
        if a.outro_platform is not None: o["platforms"] = [parse_platform(p) for p in a.outro_platform]
        if a.outro_file is not None: o["file"] = stash(a.outro_file)
        if a.outro_sound is not None: o["sound"] = stash(a.outro_sound)

    save(b)
    print(f"saved {BRAND_JSON.relative_to(ROOT)}")
    if not a.no_apply:
        subprocess.run([py, str(ROOT / "scripts" / "apply_brand.py")], check=True)


if __name__ == "__main__":
    main()
