#!/usr/bin/env python3
"""Build the RHYTHM SKELETON of an edit plan from the word-level transcript.

    python3 scripts/quick_plan.py <project> [--head 3.0] [--insert 2.2] [--max-insert 5] [--start 0 --end 58]

Quick mode rule set (shorts): talking head ~3 s → cutaway (b-roll / image / animated scene)
1.5–3 s, never > 5 s → back to the face with a punch-in → ... The hook (first ~2.5 s) and the
last ~2 s stay on the face. Every boundary snaps to a pause or a word start so cuts land on speech.

Writes projects/<p>/plan.json with:
  cuts[]      one slot per cutaway, type "TODO" + the words spoken during it (`spoken`)
  overlays[]  one "TODO" slot per talking-head stretch + a HookTitle slot
  zooms[]     alternating punch-ins on every return to the face
Claude then replaces every TODO (see SKILL.md → Quick). Slots may be deleted or merged.
Refuses to overwrite an existing plan.json unless --force.
"""
import argparse
import sys

from common import fmt_t, load_json, load_theme, project_dir, save_json

DEFAULTS = {
    #          head  insert max   hook  end-hold
    "short": (3.0, 2.2, 5.0, 2.6, 2.0),
    "long": (18.0, 4.0, 6.0, 8.0, 5.0),
}


def boundary_candidates(words):
    """Good cut points: middle of pauses (weighted) and word starts."""
    pts = []
    for i, w in enumerate(words):
        prev = words[i - 1] if i else None
        gap = w["s"] - prev["e"] if prev else 1.0
        if gap >= 0.12:
            pts.append((prev["e"] + gap / 2 if prev else w["s"], 1.0 + min(gap, 1.0)))
        pts.append((w["s"], 0.4 if prev and prev["w"][-1:] in ",.!?;:" else 0.2))
    return pts


def snap(t, pts, window=0.6, lo=None, hi=None):
    best, best_score = t, -1e9
    for p, weight in pts:
        if lo is not None and p < lo:
            continue
        if hi is not None and p > hi:
            continue
        d = abs(p - t)
        if d > window:
            continue
        score = weight - d * 1.5
        if score > best_score:
            best, best_score = p, score
    return round(best, 2)


def spoken(words, a, b):
    return " ".join(w["w"] for w in words if w["s"] < b and w["e"] > a)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("project")
    ap.add_argument("--format", choices=["short", "long"])
    ap.add_argument("--head", type=float, help="target talking-head stretch (s)")
    ap.add_argument("--insert", type=float, help="target cutaway length (s)")
    ap.add_argument("--max-insert", type=float, help="hard cap for a cutaway (s)")
    ap.add_argument("--hook", type=float, help="seconds on the face at the start")
    ap.add_argument("--end-hold", type=float, help="seconds on the face at the end")
    ap.add_argument("--start", type=float, default=0.0, help="source in-point (s)")
    ap.add_argument("--end", type=float, help="source out-point (s)")
    ap.add_argument("--platform", default="all", choices=["all", "tiktok", "reels", "shorts", "youtube"])
    ap.add_argument("--no-post-roll", action="store_true", help="don't append the outro (brand/brand.json → outro)")
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()

    proj = project_dir(args.project)
    info = load_json(proj / "project.json")
    fmt = args.format or info["format"]
    head, insert, max_insert, hook, end_hold = DEFAULTS[fmt]
    head = args.head or head
    insert = args.insert or insert
    max_insert = args.max_insert or max_insert
    hook = args.hook if args.hook is not None else hook
    end_hold = args.end_hold if args.end_hold is not None else end_hold

    plan_path = proj / "plan.json"
    if plan_path.exists() and not args.force:
        sys.exit(f"error: {plan_path} exists (use --force to overwrite)")

    tr = load_json(proj / "transcript.json")
    src_end = args.end or info["duration"]
    # words on the OUTPUT timeline
    words = [
        {**w, "s": round(w["s"] - args.start, 3), "e": round(w["e"] - args.start, 3)}
        for w in tr["words"]
        if w["s"] >= args.start - 0.05 and w["e"] <= src_end + 0.05
    ]
    if not words:
        sys.exit("error: no words in range")
    duration = round(src_end - args.start, 2)
    if fmt == "short" and duration > 62:
        print(f"warning: {duration:.1f}s is long for a short (target 30–60 s). Use --start/--end to pick the best part.")

    # layout from scripts/detect_layout.py (output-timeline seconds)
    layout = info.get("layout") or {}
    splits = [
        {"start": round(r["start"] - args.start, 2), "end": round(r["end"] - args.start, 2)}
        for r in layout.get("splitScreen", []) if r["end"] > args.start and r["start"] < src_end
    ]
    outro = layout.get("outro")
    # edit only up to a branded end card; the card itself plays untouched
    edit_end = round(outro - args.start, 2) if outro and args.start < outro < src_end else duration
    in_split = lambda a, b: any(a < r["end"] and b > r["start"] for r in splits)

    # brand watermark: a fixed logo in a corner of the frame for the whole video (brand.json → watermark)
    theme = load_theme()
    watermark = None
    logo = theme.get("logo")
    if fmt == "short" and logo and logo.get("watermark"):
        wm = logo["watermark"] if isinstance(logo["watermark"], dict) else {}
        w = int(wm.get("size", 190))
        h = round(w * logo["h"] / logo["w"])
        corner = wm.get("corner", "top-left")
        x = 60 if "left" in corner else 1080 - 60 - w
        y = 150 if "top" in corner else 1920 - 520 - h
        watermark = {"src": logo["file"], "x": x, "y": y, "w": w, "h": h}

    pts = boundary_candidates(words)
    cuts, overlays, zooms = [], [], []
    t = snap(hook, pts, window=0.8)
    head_start = 0.0
    k = 0
    while t < edit_end - end_hold - 1.2:
        a = t
        b = snap(a + insert, pts, window=0.7, lo=a + 1.2, hi=a + max_insert)
        b = min(b, a + max_insert, edit_end - end_hold)
        if b - a < 1.0:
            break
        cuts.append({
            "start": a, "end": round(b, 2), "type": "TODO",
            "transition": ["cut", "whip", "cut", "zoom"][k % 4] if fmt == "short" else "cut",
            "spoken": spoken(words, a, b),
        })
        if a - head_start >= (1.8 if fmt == "short" else 4):
            slot = {
                "start": round(head_start + 0.25, 2), "end": round(a - 0.1, 2), "component": "TODO",
                "spoken": spoken(words, head_start, a),
            }
            if in_split(slot["start"], slot["end"]):
                slot["note"] = "split-screen: use position seam (box sits on the seam, captions go below it)"
            overlays.append(slot)
        # every return to the face gets a different framing (jump-cut energy)
        zooms.append({"start": round(b, 2), "end": 0, "scale": [1.12, 1.0, 1.18, 1.06][k % 4], "ease": "snap"})
        head_start = b
        # vary head stretches a little so the rhythm doesn't feel mechanical
        jitter = [0.0, 0.4, -0.3, 0.2][k % 4] if fmt == "short" else [0, 4, -3, 2][k % 4]
        t = snap(b + head + jitter, pts, window=0.8)
        k += 1

    for i, z in enumerate(zooms):
        z["end"] = cuts[i + 1]["start"] if i + 1 < len(cuts) else edit_end
    # slow push-in during the hook
    zooms.insert(0, {"start": 0, "end": cuts[0]["start"] if cuts else edit_end, "scale": 1.08, "ease": "smooth"})
    # punch-ins would crop the stacked faces of a split-screen
    zooms = [z for z in zooms if z["scale"] != 1.0 and not in_split(z["start"], z["end"])]

    if edit_end - head_start >= 1.5:
        overlays.append({
            "start": round(head_start + 0.25, 2), "end": round(edit_end - 0.1, 2), "component": "TODO",
            "spoken": spoken(words, head_start, edit_end),
            "note": "last stretch: payoff" + (" (the outro card follows, no CTA needed)" if edit_end < duration else " or CTA"),
        })
    if fmt == "short":
        overlays.insert(0, {
            "start": 0.1, "end": round(cuts[0]["start"] - 0.1, 2) if cuts else 2.5, "component": "HookTitle",
            "props": {"text": "TODO"}, "spoken": spoken(words, 0, cuts[0]["start"] if cuts else 3),
        })
        # the first head overlay slot overlaps the hook; drop it
        overlays = [overlays[0]] + [o for o in overlays[1:] if o["start"] >= overlays[0]["end"]]

    plan = {
        "format": fmt,
        "platform": args.platform if fmt == "short" else "youtube",
        "fps": int(round(info["fps"])) if info.get("fps") and round(info["fps"]) in (24, 25, 30, 50, 60) else 30,
        "duration": duration,
        "source": {"src": "source.mp4", "start": args.start, "focusX": 0.5, "focusY": 0.4},
        "captions": {"enabled": fmt == "short", "file": "transcript.json", "emphasis": []},
        "zooms": zooms,
        "cuts": cuts,
        "overlays": overlays,
        "layout": {"splitScreen": splits, "outro": edit_end if edit_end < duration else None},
        **({"logo": watermark} if watermark else {}),
        "audio": {"autoSfx": True, "sfxVolume": 0.3},
        "sceneBg": "auto",
    }
    # Outro from the brand (brand/brand.json → outro: style, call to action, platforms, duration).
    # Shorts only, and not when the source already carries its own end card.
    if fmt == "short" and not args.no_post_roll and not plan["layout"]["outro"] and theme.get("outro", {}).get("style", "none") != "none":
        plan["postRoll"] = {"duration": theme["outro"]["duration"]}
    save_json(plan_path, plan)

    cover = sum(c["end"] - c["start"] for c in cuts)
    print(f"{fmt} · {duration:.1f}s · {len(cuts)} cutaways ({cover:.1f}s, {cover / duration:.0%} of runtime) · {len(overlays)} overlay slots")
    print("\nCUTAWAY SLOTS (fill type/query/scene):")
    for i, c in enumerate(cuts):
        print(f"  #{i:02d} {fmt_t(c['start'])}–{fmt_t(c['end'])} ({c['end'] - c['start']:.1f}s) “{c['spoken']}”")
    print("\nOVERLAY SLOTS (on the face):")
    for i, o in enumerate(overlays):
        print(f"  #{i:02d} {fmt_t(o['start'])}–{fmt_t(o['end'])} {o['component']:<9} “{o['spoken']}”")
    if splits or edit_end < duration:
        print(f"\nlayout: split-screen {[(r['start'], r['end']) for r in splits]} · outro from {edit_end if edit_end < duration else '—'}s (left untouched)")
    print(f"\n→ {plan_path}")


if __name__ == "__main__":
    main()
