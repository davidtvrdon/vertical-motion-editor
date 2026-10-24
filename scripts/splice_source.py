#!/usr/bin/env python3
"""Assemble a project's source.mp4 from several ranges of a longer window (jump cuts).

    python3 scripts/splice_source.py <project> --keep 44.8-58.1 58.15-69.3 91.8-118.95

Ranges are SOURCE seconds of the project's current source.mp4. The first run keeps the original as
source_window.mp4 (later runs always cut from it, so you can re-run with different ranges). The
result is re-encoded (CFR 30 fps, H.264) with a 40 ms audio fade at every join so the cuts don't
click. With --tighten MIN every silence longer than MIN seconds inside a range is shortened to
2 x 0.15 s (dead air out, speech untouched). project.json gets `duration` and `splice` (the ranges).
Delete transcript.json afterwards and run transcribe.py again: word times belong to the spliced source.
"""
import argparse
import re
import shutil
import subprocess
import sys

from common import ffprobe, load_json, need, project_dir, save_json

FADE = 0.04
KEEP = 0.15  # silence kept on each side of a tightened pause


def parse(r: str) -> tuple[float, float]:
    a, b = r.split("-")
    return float(a), float(b)


def silences(path, noise="-38dB", d=0.3) -> list[tuple[float, float]]:
    out = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", str(path), "-af", f"silencedetect=noise={noise}:d={d}", "-vn", "-f", "null", "-"],
        capture_output=True, text=True,
    ).stderr
    starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", out)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", out)]
    return list(zip(starts, ends))


def tighten(ranges, sil, min_len):
    """Split each range around the middle of every silence longer than min_len."""
    out = []
    for s, e in ranges:
        cur = s
        for a, b in sil:
            if b - a >= min_len and a > cur and b < e:
                out.append((cur, a + KEEP))
                cur = b - KEEP
        out.append((cur, e))
    return out


def assemble(project: str, ranges: list[tuple[float, float]]) -> float:
    """Cut `ranges` (seconds of source_window.mp4) out of the window and join them into source.mp4."""
    need("ffmpeg")
    proj = project_dir(project)
    window = proj / "source_window.mp4"
    src = proj / "source.mp4"
    if not window.exists():
        shutil.move(src, window)
    v, a = [], []
    for i, (s, e) in enumerate(ranges):
        v.append(f"[0:v]trim={s}:{e},setpts=PTS-STARTPTS[v{i}]")
        fade = f",afade=t=in:d={FADE},afade=t=out:st={max(e - s - FADE, 0):.3f}:d={FADE}"
        a.append(f"[0:a]atrim={s}:{e},asetpts=PTS-STARTPTS{fade}[a{i}]")
    n = len(ranges)
    cat = "".join(f"[v{i}][a{i}]" for i in range(n)) + f"concat=n={n}:v=1:a=1[v][a]"
    fc = ";".join(v + a + [cat])
    tmp = proj / "source_splice.mp4"
    subprocess.run(
        ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(window), "-filter_complex", fc,
         "-map", "[v]", "-map", "[a]", "-r", "30", "-c:v", "libx264", "-preset", "fast", "-crf", "16",
         "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", str(tmp)],
        check=True,
    )
    tmp.replace(src)
    meta = ffprobe(src)
    info = load_json(proj / "project.json")
    info["duration"] = meta["duration"]
    info["splice"] = [[s, e] for s, e in ranges]
    save_json(proj / "project.json", info)
    return meta["duration"]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("project")
    ap.add_argument("--keep", nargs="+", required=True, help="ranges a-b in seconds of the window file")
    ap.add_argument("--tighten", type=float, metavar="MIN", help="shorten silences longer than MIN s (e.g. 0.45)")
    args = ap.parse_args()
    need("ffmpeg")
    proj = project_dir(args.project)
    if not (proj / "source_window.mp4").exists():
        shutil.move(proj / "source.mp4", proj / "source_window.mp4")
    ranges = [parse(r) for r in args.keep]
    if args.tighten:
        ranges = tighten(ranges, silences(proj / "source_window.mp4"), args.tighten)
    dur = assemble(args.project, ranges)
    print(f"{args.project}: {len(ranges)} ranges → {dur:.1f}s")


if __name__ == "__main__":
    sys.exit(main())
