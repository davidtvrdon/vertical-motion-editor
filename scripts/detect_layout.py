#!/usr/bin/env python3
"""Detect split-screen stretches (two people stacked) and, optionally, an end card burned into a vertical source.

    python3 scripts/detect_layout.py <project> [--outro-color RRGGBB]

Writes project.json → "layout": {"splitScreen": [{"start","end"}], "outro": <sec|null>}.
Use it for clips from tools that stack two speakers (OpusClip and similar) or that append their own end card.
quick_plan.py then keeps cutaways/overlays off the end card, drops punch-in zooms during split-screen and moves the
captions to the seam (plan.layout.splitScreen).

--outro-color: dominant hex colour of a burned-in end card (e.g. a solid brand-coloured card). Without it no end card
is looked for. Samples 4 frames/s at 108x192, so boundaries are ±0.25 s.
"""
import argparse
import subprocess

import numpy as np

from common import load_json, need, project_dir, save_json

W, H, FPS = 108, 192, 4


def ranges(flags, min_len):
    out, start = [], None
    for i, f in enumerate(list(flags) + [False]):
        if f and start is None:
            start = i
        elif not f and start is not None:
            if (i - start) / FPS >= min_len:
                out.append({"start": round(start / FPS, 2), "end": round(i / FPS, 2)})
            start = None
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("project")
    ap.add_argument("--outro-color", default=None, help="dominant hex colour of a burned-in end card (optional)")
    args = ap.parse_args()
    need("ffmpeg")

    proj = project_dir(args.project)
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(proj / "source.mp4"), "-vf", f"fps={FPS},scale={W}:{H}",
         "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
        capture_output=True, check=True,
    ).stdout
    frames = np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3).astype(int)

    # split-screen: a hard horizontal seam near the vertical middle
    mid = H // 2
    split = [np.abs(f[mid + 1] - f[mid - 2]).mean() > 40 for f in frames]

    outro = None
    if args.outro_color:
        c = args.outro_color.lstrip("#")
        target = np.array([int(c[i:i + 2], 16) for i in (0, 2, 4)])
        # end card: most of the frame close to that colour
        card = [(np.abs(f - target).sum(axis=2) < 90).mean() > 0.5 for f in frames]
        for i in range(len(card) - 1, -1, -1):
            if not card[i]:
                if i < len(card) - 1:
                    outro = round((i + 1) / FPS, 2)
                break
        if outro is not None:
            split = split[: int(outro * FPS)]

    layout = {"splitScreen": ranges(split, 0.75), "outro": outro}
    info = load_json(proj / "project.json")
    info["layout"] = layout
    save_json(proj / "project.json", info)
    print(f"split-screen: {layout['splitScreen'] or 'none'} · end card at: {outro if outro is not None else 'none'}")


if __name__ == "__main__":
    main()
