#!/usr/bin/env python3
"""Create a project folder for one video.

    python3 scripts/new_project.py <name> <path/to/video.mp4> [--format short|long] [--level quick|medium|advanced]

Creates projects/<name>/ with:
  source.mp4      the talking head (hard link/copy, or a CFR H.264 transcode when needed)
  brand/          symlink to public/brand (logo, fonts, sfx, outro media)
  assets/         b-roll, images, product shots (yours or downloaded)
  project.json    probed metadata + chosen format/level
  brief.md        (medium/advanced) brief template to fill in
The folder is used as Remotion's --public-dir, so plan paths are relative to it.
"""
import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path

from common import BRAND, ROOT, ffprobe, need, project_dir, save_json

TEMPLATES = ROOT / ".claude" / "skills" / "vertical-motion-editor" / "templates"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("name")
    ap.add_argument("video")
    ap.add_argument("--format", choices=["short", "long"], default="short", help="short = vertical 9:16 (default); long = 16:9 (see references/other-formats.md)")
    ap.add_argument("--level", choices=["quick", "medium", "advanced"], default="quick")
    ap.add_argument("--transcode", action="store_true", help="always transcode to CFR 30 fps H.264")
    args = ap.parse_args()

    src = Path(args.video).expanduser().resolve()
    if not src.exists():
        sys.exit(f"error: {src} not found")
    proj = project_dir(args.name)
    (proj / "assets").mkdir(parents=True, exist_ok=True)

    meta = ffprobe(src)
    fmt = args.format
    if fmt == "short":
        if meta["width"] and meta["height"] and meta["width"] > meta["height"]:
            print(f"note: the source is landscape ({meta['width']}x{meta['height']}). The short format is 9:16: the renderer crops the frame "
                  "around the speaker (plan.source.focusX). For a wide source with two people, see references/other-formats.md.")

    target = proj / "source.mp4"
    if target.exists() or target.is_symlink():
        target.unlink()
    risky = meta["variable_fps"] or meta["vcodec"] not in ("h264", "hevc") or args.transcode
    if risky:
        need("ffmpeg")
        print(f"transcoding to CFR 30fps H.264 (vfr={meta['variable_fps']}, codec={meta['vcodec']}) ...")
        subprocess.run(
            ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(src),
             "-r", "30", "-c:v", "libx264", "-preset", "fast", "-crf", "16", "-pix_fmt", "yuv420p",
             "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", str(target)],
            check=True,
        )
    else:
        # Hard link (no extra disk) or copy. NOT a symlink: Remotion's file server 404s on
        # symlinked files (symlinked folders like brand/ are fine).
        try:
            os.link(src, target)
        except OSError:
            print("copying source (different volume) ...")
            shutil.copy2(src, target)

    brand = proj / "brand"
    if not brand.exists():
        try:
            os.symlink(os.path.relpath(BRAND, proj), brand)
        except OSError:
            shutil.copytree(BRAND, brand)

    info = {
        "name": proj.name,
        "original": str(src),
        "format": fmt,
        "level": args.level,
        **ffprobe(target),
    }
    save_json(proj / "project.json", info)

    if args.level != "quick":
        tpl = TEMPLATES / f"brief-{args.level}.md"
        brief = proj / "brief.md"
        if tpl.exists() and not brief.exists():
            shutil.copy(tpl, brief)
            print(f"brief template: {brief}")

    print(f"project ready: {proj}")
    print(f"  {fmt} · {info['width']}x{info['height']} · {info['duration']:.1f}s · level={args.level}")
    print(f"next: python3 scripts/transcribe.py {proj.name}")


if __name__ == "__main__":
    main()
