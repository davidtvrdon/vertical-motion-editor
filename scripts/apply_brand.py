#!/usr/bin/env python3
"""Turn brand/brand.json (+ a style preset) into the theme the renderer reads.

    python3 scripts/apply_brand.py                       # use brand/brand.json (or the default preset)
    python3 scripts/apply_brand.py --preset block        # switch the visual style, keep the rest of the brand
    python3 scripts/apply_brand.py --list                # show the presets
    python3 scripts/apply_brand.py --suggest-colors logo.png   # dominant colours of a logo (needs Pillow)

What it does:
  1. merges src/theme/presets.json[preset] with the overrides in brand/brand.json
  2. derives the missing colours (dark variants, readable text colour on the primary/secondary)
  3. downloads the font from Google Fonts (woff2, latin + the subsets your language needs) into public/brand/fonts,
     or copies a font file you supply. Inter is bundled and needs no download.
  4. copies the logo / outro media into public/brand and measures the logo
  5. writes src/theme/active.json (what Remotion imports) and refreshes the brand folder of existing projects

Stdlib only (Pillow is optional, for --suggest-colors).
"""
from __future__ import annotations

import argparse
import colorsys
import json
import re
import shutil
import struct
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PRESETS = ROOT / "src" / "theme" / "presets.json"
ACTIVE = ROOT / "src" / "theme" / "active.json"
BRAND_JSON = ROOT / "brand" / "brand.json"
PUBLIC_BRAND = ROOT / "public" / "brand"
FONT_DIR = PUBLIC_BRAND / "fonts"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"

LOCALES = {
    "en": "en-US", "sk": "sk-SK", "cs": "cs-CZ", "de": "de-DE", "fr": "fr-FR", "es": "es-ES", "it": "it-IT",
    "pt": "pt-PT", "pl": "pl-PL", "nl": "nl-NL", "hu": "hu-HU", "ro": "ro-RO", "sv": "sv-SE", "da": "da-DK",
    "fi": "fi-FI", "no": "nb-NO", "tr": "tr-TR", "uk": "uk-UA", "ru": "ru-RU", "bg": "bg-BG", "el": "el-GR",
    "hr": "hr-HR", "sl": "sl-SI", "sr": "sr-RS", "lt": "lt-LT", "lv": "lv-LV", "et": "et-EE", "vi": "vi-VN",
    "id": "id-ID", "ja": "ja-JP", "ko": "ko-KR", "zh": "zh-CN", "hi": "hi-IN", "ar": "ar-SA", "he": "he-IL",
}
EXTRA_SUBSETS = {
    "cyrillic": {"ru", "uk", "bg", "sr"},
    "greek": {"el"},
    "vietnamese": {"vi"},
}
PLATFORMS = {"youtube", "instagram", "tiktok", "x", "linkedin", "facebook", "spotify", "apple", "website"}
OUTRO_STYLES = {"logo-card", "follow-card", "minimal", "custom", "none"}


# ---------------------------------------------------------------- helpers
def deep_merge(base: dict, over: dict) -> dict:
    out = dict(base)
    for k, v in (over or {}).items():
        out[k] = deep_merge(out[k], v) if isinstance(v, dict) and isinstance(out.get(k), dict) else v
    return out


def hex_to_rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    if not re.fullmatch(r"[0-9a-fA-F]{6}", h):
        sys.exit(f"error: '{h}' is not a hex colour (use #RRGGBB)")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def rgb_to_hex(r: float, g: float, b: float) -> str:
    return "#{:02X}{:02X}{:02X}".format(*(max(0, min(255, round(x))) for x in (r, g, b)))


def norm_hex(h: str) -> str:
    return rgb_to_hex(*hex_to_rgb(h))


def shade(h: str, lightness_factor: float) -> str:
    r, g, b = (x / 255 for x in hex_to_rgb(h))
    hh, ll, ss = colorsys.rgb_to_hls(r, g, b)
    r, g, b = colorsys.hls_to_rgb(hh, max(0, min(1, ll * lightness_factor)), ss)
    return rgb_to_hex(r * 255, g * 255, b * 255)


def luminance(h: str) -> float:
    def lin(c: float) -> float:
        c /= 255
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4

    r, g, b = hex_to_rgb(h)
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)


def contrast(a: str, b: str) -> float:
    la, lb = sorted((luminance(a), luminance(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def readable_on(bg: str, dark: str, light: str) -> str:
    return dark if contrast(bg, dark) >= contrast(bg, light) else light


def slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


# ---------------------------------------------------------------- fonts
def fetch(url: str, binary: bool = False, timeout: int = 30):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        data = r.read()
    return data if binary else data.decode("utf-8")


def google_font_css(family: str) -> tuple[str, str] | None:
    fam = urllib.parse.quote_plus(family)
    for wght in ("200..900", "300..900", "300..800", "400..900", "400..800", "400..700", "400;700;900", "400;700", "400"):
        url = f"https://fonts.googleapis.com/css2?family={fam}:wght@{wght}&display=swap"
        try:
            return fetch(url), wght
        except urllib.error.HTTPError:
            continue
        except urllib.error.URLError as e:
            sys.exit(f"error: cannot reach Google Fonts ({e.reason}). Check your connection, or supply a font file instead.")
    return None


def subsets_for(language: str) -> set[str]:
    s = {"latin", "latin-ext"}
    for name, langs in EXTRA_SUBSETS.items():
        if language in langs:
            s.add(name)
            if name == "cyrillic":
                s.add("cyrillic-ext")
    return s


def font_files_google(family: str, language: str) -> list[dict]:
    got = google_font_css(family)
    if not got:
        sys.exit(f"error: '{family}' not found on Google Fonts. Check the spelling (fonts.google.com), or give a font file.")
    css, _ = got
    wanted = subsets_for(language)
    files = []
    FONT_DIR.mkdir(parents=True, exist_ok=True)
    for m in re.finditer(r"/\*\s*([\w-]+)\s*\*/\s*@font-face\s*\{(.*?)\}", css, re.S):
        subset, body = m.group(1), m.group(2)
        if subset not in wanted:
            continue
        url = re.search(r"url\((https://[^)]+\.woff2)\)", body)
        weight = re.search(r"font-weight:\s*([^;]+);", body)
        urange = re.search(r"unicode-range:\s*([^;]+);", body)
        if not (url and weight):
            continue
        w = weight.group(1).strip()
        name = f"{slug(family)}-{subset}-{slug(w)}.woff2"
        dest = FONT_DIR / name
        if not dest.exists():
            dest.write_bytes(fetch(url.group(1), binary=True, timeout=60))
        files.append({"url": f"brand/fonts/{name}", "weight": w, "unicodeRange": urange.group(1).strip() if urange else None})
    if not files:
        sys.exit(f"error: no usable font files for '{family}'")
    return files


INTER = [
    {"url": "brand/fonts/inter-latin.woff2", "weight": "400 900",
     "unicodeRange": "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD"},
    {"url": "brand/fonts/inter-latin-ext.woff2", "weight": "400 900",
     "unicodeRange": "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF"},
]


def resolve_font(spec: str, language: str, brand_dir: Path) -> dict:
    """spec = a Google Fonts family name, or a path to a .woff2/.woff/.ttf/.otf file."""
    p = Path(spec).expanduser()
    if not p.exists() and (brand_dir / spec).exists():
        p = brand_dir / spec
    if p.exists() and p.is_file():
        FONT_DIR.mkdir(parents=True, exist_ok=True)
        name = f"custom-{slug(p.stem)}{p.suffix.lower()}"
        shutil.copy2(p, FONT_DIR / name)
        family = p.stem.replace("-", " ").replace("_", " ")
        fmt = {".woff2": "woff2", ".woff": "woff", ".ttf": "truetype", ".otf": "opentype"}.get(p.suffix.lower())
        if not fmt:
            sys.exit("error: font file must be .woff2, .woff, .ttf or .otf")
        return {"family": family, "weight": "400 900", "format": fmt,
                "files": [{"url": f"brand/fonts/{name}", "weight": "400 900", "unicodeRange": None}],
                "custom": True}
    if spec.strip().lower() == "inter":
        return {"family": "Inter", "weight": "400 900", "format": "woff2", "files": INTER}
    return {"family": spec.strip(), "weight": "400 900", "format": "woff2", "files": font_files_google(spec.strip(), language)}


# ---------------------------------------------------------------- images
def image_size(path: Path) -> tuple[int, int] | None:
    ext = path.suffix.lower()
    try:
        if ext == ".png":
            with open(path, "rb") as f:
                head = f.read(24)
            return struct.unpack(">II", head[16:24])
        if ext == ".svg":
            txt = path.read_text(encoding="utf-8", errors="ignore")
            vb = re.search(r'viewBox="([\d.\s,-]+)"', txt)
            if vb:
                n = [float(x) for x in re.split(r"[\s,]+", vb.group(1).strip())]
                return int(n[2]), int(n[3])
            w = re.search(r'width="([\d.]+)', txt)
            h = re.search(r'height="([\d.]+)', txt)
            if w and h:
                return int(float(w.group(1))), int(float(h.group(1)))
            return None
        out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", str(path)],
                             capture_output=True, text=True, check=True).stdout.strip().split(",")
        return int(out[0]), int(out[1])
    except Exception:
        return None


def media_duration(path: Path) -> float | None:
    try:
        out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                             capture_output=True, text=True, check=True).stdout.strip()
        return float(out)
    except Exception:
        return None


def find_asset(spec: str, brand_dir: Path) -> Path:
    for p in (Path(spec).expanduser(), brand_dir / spec, ROOT / spec):
        if p.exists() and p.is_file():
            return p.resolve()
    sys.exit(f"error: file not found: {spec} (give an absolute path, or a path relative to brand/)")


def suggest_colors(path: Path, n: int = 5) -> list[str]:
    try:
        from PIL import Image
    except ImportError:
        sys.exit("error: Pillow missing. Run: .venv/bin/pip install pillow  (setup.sh installs it)")
    im = Image.open(path).convert("RGBA")
    im.thumbnail((200, 200))
    px = [p[:3] for p in im.getdata() if p[3] > 200]
    if not px:
        return []
    q = Image.new("RGB", (len(px), 1))
    q.putdata(px)
    pal = q.quantize(colors=8, method=Image.MEDIANCUT)
    counts = sorted(pal.getcolors(), reverse=True)
    raw = pal.getpalette()
    out = []
    for cnt, idx in counts:
        r, g, b = raw[idx * 3: idx * 3 + 3]
        h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
        if s < 0.18 or l < 0.08 or l > 0.93:  # skip greys / near black / near white
            continue
        out.append(rgb_to_hex(r, g, b))
        if len(out) >= n:
            break
    return out


# ---------------------------------------------------------------- main build
def build(preset_override: str | None) -> dict:
    presets = json.loads(PRESETS.read_text(encoding="utf-8"))
    brand = json.loads(BRAND_JSON.read_text(encoding="utf-8")) if BRAND_JSON.exists() else {}
    brand_dir = BRAND_JSON.parent

    name = preset_override or brand.get("preset") or presets["default"]
    if name not in presets["presets"]:
        sys.exit(f"error: unknown preset '{name}'. Choose one of: {', '.join(presets['presets'])}")
    base = presets["presets"][name]

    language = (brand.get("language") or "en").lower()
    theme = deep_merge(base, {k: brand[k] for k in ("box", "captions", "background", "look") if k in brand})

    # ---- colours
    col = dict(base["colors"])
    for k, v in (brand.get("colors") or {}).items():
        col[k] = norm_hex(v)
    user_c = brand.get("colors") or {}
    if "primary" in user_c and "primaryDark" not in user_c:
        col["primaryDark"] = shade(col["primary"], 0.82)
    if "secondary" in user_c and "secondaryDark" not in user_c:
        col["secondaryDark"] = shade(col["secondary"], 0.55)
    if "dark" not in user_c and "secondary" in user_c and luminance(col["secondary"]) < 0.06:
        col["dark"] = shade(col["secondary"], 0.6)
    if "line" not in user_c and "dark" in user_c:
        col["line"] = col["dark"]
    if "accent" not in user_c:
        # a version of the primary colour that stays readable as text / thin strokes on paper and white
        acc = col["primary"]
        for _ in range(40):
            if contrast(acc, col["paper"]) >= 3.2 and contrast(acc, col["white"]) >= 3.2:
                break
            acc = shade(acc, 0.93)
        col["accent"] = acc
    col["onPrimary"] = readable_on(col["primary"], col["line"], col["white"])
    col["onSecondary"] = readable_on(col["secondary"], col["line"], col["white"])
    theme["colors"] = col

    # ---- font
    font_spec = brand.get("font") or base["font"]
    theme["fonts"] = resolve_font(font_spec, language, brand_dir)

    # ---- brand identity
    theme["preset"] = name
    theme["label"] = base["label"]
    theme["brand"] = {
        "name": brand.get("brandName") or "",
        "handle": brand.get("handle") or "",
        "website": brand.get("website") or "",
        "tagline": brand.get("tagline") or "",
    }
    theme["language"] = language
    theme["locale"] = brand.get("locale") or LOCALES.get(language, "en-US")
    theme.pop("font", None)
    theme.pop("description", None)

    # ---- logo
    theme["logo"] = None
    if brand.get("logo"):
        src = find_asset(brand["logo"], brand_dir)
        PUBLIC_BRAND.mkdir(parents=True, exist_ok=True)
        for old in PUBLIC_BRAND.glob("logo.*"):
            old.unlink()
        dest = PUBLIC_BRAND / f"logo{src.suffix.lower()}"
        shutil.copy2(src, dest)
        size = image_size(dest) or (1000, 1000)
        theme["logo"] = {"file": f"brand/{dest.name}", "w": size[0], "h": size[1],
                         "watermark": brand.get("watermark") or None}

    # ---- outro
    o = brand.get("outro") or {}
    style = o.get("style") or ("logo-card" if theme["logo"] else "follow-card")
    if style not in OUTRO_STYLES:
        sys.exit(f"error: outro.style must be one of {sorted(OUTRO_STYLES)}")
    outro = {
        "style": style,
        "duration": float(o.get("duration") or 2.5),
        "cta": o.get("cta") or ("Follow for more" if language == "en" else ""),
        "tone": o.get("tone") or "secondary",
        "platforms": [],
        "file": None,
        "fileKind": None,
        "sound": None,
    }
    for p in o.get("platforms") or []:
        kind = (p.get("kind") if isinstance(p, dict) else p).lower()
        if kind not in PLATFORMS:
            sys.exit(f"error: unknown outro platform '{kind}'. Use: {sorted(PLATFORMS)}")
        outro["platforms"].append({"kind": kind, "handle": (p.get("handle") if isinstance(p, dict) else "") or ""})
    out_dir = PUBLIC_BRAND / "outro"
    if out_dir.exists():
        shutil.rmtree(out_dir)
    if o.get("file"):
        src = find_asset(o["file"], brand_dir)
        out_dir.mkdir(parents=True, exist_ok=True)
        dest = out_dir / f"outro{src.suffix.lower()}"
        shutil.copy2(src, dest)
        outro["file"] = f"brand/outro/{dest.name}"
        outro["fileKind"] = "video" if src.suffix.lower() in {".mp4", ".mov", ".webm", ".m4v"} else "image"
        if outro["fileKind"] == "video" and not o.get("duration"):
            outro["duration"] = round(media_duration(dest) or outro["duration"], 2)
    if o.get("sound"):
        src = find_asset(o["sound"], brand_dir)
        out_dir.mkdir(parents=True, exist_ok=True)
        dest = out_dir / f"sound{src.suffix.lower()}"
        shutil.copy2(src, dest)
        outro["sound"] = f"brand/outro/{dest.name}"
    if style == "custom" and not outro["file"]:
        sys.exit("error: outro.style 'custom' needs outro.file (an image or a short video)")
    theme["outro"] = outro
    return theme


def refresh_projects() -> None:
    proj = ROOT / "projects"
    if not proj.exists():
        return
    for d in proj.iterdir():
        b = d / "brand"
        if d.is_dir() and b.exists() and not b.is_symlink() and b.is_dir():
            shutil.rmtree(b)
            shutil.copytree(PUBLIC_BRAND, b)
            print(f"  refreshed copy of brand/ in {d.name}")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--preset", help="override the preset for this run (and remember it in brand/brand.json when that exists)")
    ap.add_argument("--no-remember", action="store_true", help="do not write the preset back to brand/brand.json")
    ap.add_argument("--list", action="store_true", help="list the style presets")
    ap.add_argument("--suggest-colors", metavar="LOGO", help="print dominant colours of an image")
    a = ap.parse_args()

    presets = json.loads(PRESETS.read_text(encoding="utf-8"))
    if a.list:
        for k, v in presets["presets"].items():
            star = " (default)" if k == presets["default"] else ""
            print(f"{k}{star}: {v['description']}")
        return
    if a.suggest_colors:
        print(" ".join(suggest_colors(Path(a.suggest_colors).expanduser())))
        return

    theme = build(a.preset)
    ACTIVE.write_text(json.dumps(theme, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if a.preset and not a.no_remember and BRAND_JSON.exists():
        b = json.loads(BRAND_JSON.read_text(encoding="utf-8"))
        b["preset"] = a.preset
        BRAND_JSON.write_text(json.dumps(b, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    refresh_projects()
    c = theme["colors"]
    print(f"theme '{theme['preset']}' → {ACTIVE.relative_to(ROOT)}")
    print(f"  colours  primary {c['primary']} · secondary {c['secondary']} · dark {c['dark']} · paper {c['paper']}")
    print(f"  font     {theme['fonts']['family']}" + (" (your file)" if theme["fonts"].get("custom") else ""))
    print(f"  logo     {theme['logo']['file'] if theme['logo'] else 'none (the brand name is typeset instead)'}")
    print(f"  outro    {theme['outro']['style']} · {theme['outro']['duration']} s")
    print("  preview: npm run studio  → GalleryShort")


if __name__ == "__main__":
    main()
