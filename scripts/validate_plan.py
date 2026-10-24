#!/usr/bin/env python3
"""Lint an edit plan before rendering. Exit code 1 on errors.

    python3 scripts/validate_plan.py <project> [--level quick|medium|advanced]

Checks timing (inside duration, no overlapping cutaways, the quick-mode rhythm limits),
component/scene names, that every file exists, that b-roll clips are long enough (no freeze
frames), leftover TODOs, and overlay text length (long text breaks the safe area).
"""
import argparse
import json
import sys

from common import BACKDROPS, OVERLAYS, SCENES, TONES, TRANSITIONS, ffprobe, load_json, load_theme, project_dir

TEXT_LIMITS = {"HookTitle": ("text", 42), "KeywordPop": ("text", 22), "CTA": ("text", 28), "LowerThird": ("name", 28)}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("project")
    ap.add_argument("--level", choices=["quick", "medium", "advanced"])
    args = ap.parse_args()

    proj = project_dir(args.project)
    plan = load_json(proj / "plan.json")
    info = load_json(proj / "project.json") if (proj / "project.json").exists() else {}
    level = args.level or info.get("level", "quick")
    theme = load_theme()
    errors, warns = [], []
    E, W = errors.append, warns.append

    dur = plan.get("duration")
    fmt = plan.get("format")
    if fmt not in ("short", "long"):
        E(f"format must be short|long, got {fmt!r}")
    if not isinstance(dur, (int, float)) or dur <= 0:
        E("duration missing")
        dur = 1e9
    short = fmt == "short"

    src = proj / plan.get("source", {}).get("src", "")
    if not src.exists():
        E(f"source not found: {src}")
    else:
        sd = ffprobe(src)["duration"] - plan["source"].get("start", 0)
        if dur > sd + 0.05:
            E(f"duration {dur}s exceeds source length after start ({sd:.2f}s)")

    if "TODO" in json.dumps(plan):
        E("plan still contains TODO slots/values — fill or delete them")

    cap = plan.get("captions") or {}
    if cap.get("enabled") and cap.get("file") and not (proj / cap["file"]).exists():
        E(f"captions file missing: {cap['file']}")

    pr = plan.get("postRoll")
    if pr is not None:
        if not isinstance(pr, dict):
            E("postRoll must be an object like {\"duration\": 2.5}")
        else:
            d = pr.get("duration", theme.get("outro", {}).get("duration", 2.5))
            if not isinstance(d, (int, float)) or not 0.5 <= d <= 15:
                E(f"postRoll.duration must be 0.5–15 s, got {d!r}")
            style = pr.get("style") or theme.get("outro", {}).get("style")
            if style == "custom" and not theme.get("outro", {}).get("file"):
                E("postRoll style 'custom' needs outro.file in brand/brand.json (then run apply_brand.py)")
            if (plan.get("layout") or {}).get("outro"):
                W("postRoll on top of a burned-in end card: two end cards in a row (drop one)")

    max_insert = 5.0 if short else 8.0
    cuts = sorted(plan.get("cuts", []), key=lambda c: c["start"])
    prev_end = 0.0
    for i, c in enumerate(cuts):
        tag = f"cut #{i} @{c['start']:.2f}s"
        length = c["end"] - c["start"]
        if c["start"] < 0 or c["end"] > dur + 0.01 or length <= 0:
            E(f"{tag}: bad range {c['start']}–{c['end']} (duration {dur})")
        if c["start"] < prev_end - 0.01:
            E(f"{tag}: overlaps previous cutaway (ends {prev_end:.2f})")
        gap = c["start"] - prev_end
        if short and level == "quick" and gap > 4.6 and i > 0:
            W(f"{tag}: {gap:.1f}s on the face before this cut (quick rhythm ≈3 s)")
        prev_end = c["end"]
        if c.get("type") not in ("broll", "image", "scene"):
            E(f"{tag}: type must be broll|image|scene, got {c.get('type')!r}")
            continue
        if c.get("transition", "cut") not in TRANSITIONS:
            E(f"{tag}: unknown transition {c.get('transition')!r} (use {sorted(TRANSITIONS)})")
        if short and length > max_insert + 0.01:
            E(f"{tag}: {length:.1f}s cutaway — max {max_insert:.0f}s on shorts")
        elif short and c["type"] != "scene" and length > 3.5:
            W(f"{tag}: {length:.1f}s b-roll — ideally ≤ 3 s")
        if c["type"] == "scene":
            if c.get("scene") not in SCENES:
                E(f"{tag}: unknown scene {c.get('scene')!r} (have {sorted(SCENES)})")
            if c.get("bg") is not None and c["bg"] not in BACKDROPS:
                E(f"{tag}: unknown bg {c['bg']!r} (have {sorted(BACKDROPS)})")
            for k, v in (c.get("props") or {}).items():
                if k in ("image",) and isinstance(v, str) and not (proj / v).exists():
                    E(f"{tag}: scene image missing: {v}")
                if k == "tone" and v not in TONES:
                    E(f"{tag}: unknown tone {v!r} (use {sorted(TONES)})")
            continue
        if not c.get("src"):
            E(f"{tag}: {c['type']} without src (run scripts/pexels.py fill, or set src)")
            continue
        f = proj / c["src"]
        if not f.exists():
            E(f"{tag}: file missing: {c['src']}")
            continue
        if c["type"] == "broll":
            clip = ffprobe(f)["duration"]
            needed = c.get("trim", 0) + length * c.get("rate", 1)
            if clip + 0.05 < needed:
                E(f"{tag}: clip is {clip:.1f}s but needs {needed:.1f}s (trim+length) → freeze frame")

    edit_end = (plan.get("layout") or {}).get("outro") or dur
    if short and level == "quick" and cuts and edit_end - prev_end > 4.6:
        W(f"{edit_end - prev_end:.1f}s on the face at the end")

    ovs = sorted(plan.get("overlays", []), key=lambda o: o["start"])
    for i, o in enumerate(ovs):
        tag = f"overlay #{i} {o.get('component')} @{o['start']:.2f}s"
        if o.get("component") not in OVERLAYS:
            E(f"{tag}: unknown overlay (have {sorted(OVERLAYS)})")
        if o["start"] < 0 or o["end"] > dur + 0.01 or o["end"] <= o["start"]:
            E(f"{tag}: bad range {o['start']}–{o['end']}")
        if o["end"] - o["start"] < 0.8 and o.get("component") != "Sticker":
            W(f"{tag}: on screen < 0.8 s — too short to read")
        props = o.get("props") or {}
        if o.get("component") in TEXT_LIMITS:
            key, limit = TEXT_LIMITS[o["component"]]
            if len(str(props.get(key, ""))) > limit:
                W(f"{tag}: {key} has {len(str(props.get(key)))} chars (≤ {limit} keeps it inside the safe area)")
        img = props.get("image")
        if img and not (proj / img).exists():
            E(f"{tag}: image missing: {img}")
        for c in cuts:
            if c.get("type") == "scene" and o["start"] < c["end"] and o["end"] > c["start"]:
                W(f"{tag}: overlaps scene cutaway @{c['start']:.2f}s (overlay covers the animation)")
                break
        for p in ovs[i + 1:]:
            if p["start"] >= o["end"]:
                break
            if o.get("component") not in ("ProgressBar", "Sticker") and p.get("component") not in ("ProgressBar", "Sticker"):
                pos_o = props.get("position", "top")
                pos_p = (p.get("props") or {}).get("position", "top")
                if pos_o == pos_p:
                    W(f"{tag}: overlaps {p.get('component')} @{p['start']:.2f}s in the same position ({pos_o})")

    logo = plan.get("logo")
    if logo and not (proj / logo.get("src", "")).exists():
        E(f"logo file missing: {logo.get('src')}")

    for s in (plan.get("audio") or {}).get("sfx", []):
        if not (proj / s["src"]).exists():
            E(f"sfx missing: {s['src']}")
    music = (plan.get("audio") or {}).get("music")
    if music and not (proj / music["src"]).exists():
        E(f"music missing: {music['src']}")

    layout = plan.get("layout") or {}
    outro = layout.get("outro")
    if outro:
        for c in cuts:
            if c["end"] > outro + 0.05:
                E(f"cut @{c['start']:.2f}s runs into the outro card (starts {outro}s)")
        for o in ovs:
            if o["end"] > outro + 0.05:
                E(f"overlay {o.get('component')} @{o['start']:.2f}s runs into the outro card (starts {outro}s)")
    for r in layout.get("splitScreen", []):
        for o in ovs:
            pr = o.get("props") or {}
            if o["start"] < r["end"] and o["end"] > r["start"] and not (pr.get("free") or pr.get("panel")) and o.get("component") != "ProgressBar":
                W(f"overlay {o.get('component')} @{o['start']:.2f}s is inside the split-screen {r['start']}–{r['end']}s and will NOT be drawn (both people stay visible): move the idea to a full-frame cut, or set props.free on top of a cut")
        for z in plan.get("zooms", []):
            if z["start"] < r["end"] and z["end"] > r["start"] and z["scale"] > 1.0:
                W(f"zoom @{z['start']:.2f}s during split-screen crops the stacked faces")

    # variety across videos: flag scene types that already appeared in 2 of the last 3 other projects
    others = sorted(
        (q for q in proj.parent.glob("*/plan.json") if q.parent != proj and not q.parent.name.startswith("_")),
        key=lambda q: q.stat().st_mtime,
        reverse=True,
    )[:3]
    recent = [{c.get("scene") for c in load_json(q).get("cuts", []) if c.get("type") == "scene"} for q in others]
    mine = [c.get("scene") for c in cuts if c.get("type") == "scene"]
    stale = sorted({n for n in mine if sum(n in r for r in recent) >= 2})
    if stale:
        W(f"repetitive: {', '.join(stale)} already used in 2 of the last 3 videos; prefer a fresh scene (components.md), keep at most one of these")
    dup = sorted({n for n in mine if mine.count(n) > 1 and n not in ("DecisionCard", "ChatMock")})
    if dup:
        W(f"same scene twice in this video: {', '.join(dup)} (use a different one unless it's a deliberate continuation)")

    lay = plan.get("layout") or {}
    if fmt == "short" and ovs and not lay.get("faces"):
        W("no face track: run `.venv/bin/python scripts/analyze_faces.py <project>` so overlays never cover the face")
    if fmt == "short" and lay.get("splitScreen") and not lay.get("speakers"):
        W("split-screen without speaker data: run analyze_faces.py so split-screen graphics cover the listener, not the speaker")
    if plan.get("sceneBg") not in (None, "auto", "classic"):
        E(f"sceneBg must be 'auto' or 'classic', got {plan.get('sceneBg')!r}")
    elif plan.get("sceneBg") != "auto" and sum(1 for c in cuts if c.get("type") == "scene" and not c.get("bg")) >= 3:
        W("all scenes share the classic background: set \"sceneBg\": \"auto\" (or per-cut \"bg\") for variety")
    cover = sum(c["end"] - c["start"] for c in cuts)
    if fmt == "short" and cover / dur > 0.5:
        W(f"busy: cutaways cover {cover / dur:.0%} of the runtime; aim for ≤ 45 % and let the talking heads breathe")
    print(f"{fmt} · {dur:.1f}s · level={level} · {len(cuts)} cutaways ({cover / dur:.0%} of runtime) · {len(ovs)} overlays")
    for w in warns:
        print("  warn :", w)
    for e in errors:
        print("  ERROR:", e)
    print("OK" if not errors else f"{len(errors)} error(s)")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
