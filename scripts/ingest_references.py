#!/usr/bin/env python3
"""Turn a folder of reference videos (e.g. motion-design tutorials) into material Claude can study.

    python3 scripts/ingest_references.py [reference-videos/] [--fps 2] [--no-transcribe] [--language en]

For every video → knowledge/reference-videos/<slug>/
  frames/            tiles at --fps (gitignored)
  sheet-NN.jpg       contact sheets, 4x4 tiles, row-major, 1/fps s per tile (see index.md)
  cuts.json          detected shot changes (scene-change detection) + pacing stats
  transcript.txt     WhisperX transcript with timestamps (if whisperx is installed)
  index.md           what each sheet covers + stats, and the notes template Claude fills in
Already-processed videos are skipped (delete the folder to redo). Progress: knowledge/reference-videos/INDEX.md
"""
import argparse
import json
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

from common import ROOT, ffprobe, fmt_t, need

OUT = ROOT / "knowledge" / "reference-videos"
VIDEO_EXT = {".mp4", ".mov", ".m4v", ".webm", ".mkv"}
COLS, ROWS = 4, 4

NOTES_TEMPLATE = """
## Notes (filled in by Claude)

**Lesson in one sentence:**

**Techniques shown** (timestamp → what happens → why it works):
-

**Rules of thumb** (concrete: durations in frames/seconds, easing, sizes, counts):
-

**How it maps to our engine** (existing component/prop, or a new component to build):
-

**Fits our engine and style?** (yes / adapt / no, and why):
"""


def slugify(name: str) -> str:
    s = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-zA-Z0-9]+", "-", s).strip("-").lower()[:60] or "video"


def scene_cuts(path: Path, threshold: float) -> list[float]:
    proc = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", str(path), "-vf", f"select='gt(scene,{threshold})',showinfo", "-an", "-f", "null", "-"],
        capture_output=True, text=True,
    )
    return [round(float(m), 2) for m in re.findall(r"pts_time:([0-9.]+)", proc.stderr)]


_MODEL = {}


def transcribe(path: Path, language: str | None) -> str | None:
    try:
        import whisperx  # noqa
    except ImportError:
        return None
    if "m" not in _MODEL:  # load once for the whole batch
        _MODEL["m"] = whisperx.load_model("small", "cpu", compute_type="int8", language=language)
    model = _MODEL["m"]
    audio = whisperx.load_audio(str(path))
    res = model.transcribe(audio, batch_size=8, language=language)
    return "\n".join(f"[{fmt_t(s['start'])}] {s['text'].strip()}" for s in res["segments"])


def process(video: Path, fps: float, do_transcribe: bool, language: str | None, threshold: float) -> dict:
    slug = slugify(video.stem)
    d = OUT / slug
    if (d / "index.md").exists():
        return {"slug": slug, "skipped": True}
    (d / "frames").mkdir(parents=True, exist_ok=True)
    meta = ffprobe(video)

    subprocess.run(
        ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(video),
         "-vf", f"fps={fps},scale=320:-2", str(d / "frames" / "f-%04d.jpg")],
        check=True,
    )
    per = COLS * ROWS
    frames = sorted((d / "frames").glob("f-*.jpg"))
    sheets = []
    for n in range(0, len(frames), per):
        out = d / f"sheet-{n // per:02d}.jpg"
        subprocess.run(
            ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-start_number", str(n + 1),
             "-i", str(d / "frames" / "f-%04d.jpg"), "-frames:v", "1",
             "-vf", f"tile={COLS}x{ROWS}:padding=4:color=gray", str(out)],
            check=True,
        )
        a = n / fps
        sheets.append((out.name, a, min(meta["duration"], (n + per) / fps)))

    # one overview sheet: 16 frames spread evenly over the whole video (the arc at a glance)
    step = max(0.5, meta["duration"] / 16)
    subprocess.run(
        ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(video),
         "-vf", f"fps=1/{step:.3f},scale=240:-2,tile=8x2:padding=4:color=gray", "-frames:v", "1", str(d / "overview.jpg")],
        check=True,
    )

    cuts = scene_cuts(video, threshold)
    shots = [b - a for a, b in zip([0.0] + cuts, cuts + [meta["duration"]])]
    stats = {
        "duration": round(meta["duration"], 2),
        "size": f"{meta['width']}x{meta['height']}",
        "fps": meta["fps"],
        "shot_changes": len(cuts),
        "avg_shot_s": round(sum(shots) / len(shots), 2) if shots else None,
        "cuts_per_min": round(len(cuts) / meta["duration"] * 60, 1) if meta["duration"] else None,
    }
    (d / "cuts.json").write_text(json.dumps({"cuts": cuts, **stats}, indent=2))

    transcript = transcribe(video, language) if do_transcribe else None
    if transcript:
        (d / "transcript.txt").write_text(transcript, encoding="utf-8")

    lines = [
        f"# {video.stem}",
        "",
        f"- file: `{video.relative_to(ROOT) if video.is_relative_to(ROOT) else video}`",
        f"- {stats['duration']}s · {stats['size']} · {stats['fps']} fps",
        f"- pacing: {stats['shot_changes']} shot changes · avg shot {stats['avg_shot_s']}s · {stats['cuts_per_min']} cuts/min",
        f"- shot changes at: {', '.join(fmt_t(c) for c in cuts[:60])}{' …' if len(cuts) > 60 else ''}",
        f"- transcript: {'transcript.txt' if transcript else 'not available (install whisperx or pass a transcript)'}",
        "",
        f"- overview.jpg: 16 frames, one every {step:.1f}s (row-major, 8x2)",
        "",
        f"## Contact sheets ({COLS}x{ROWS} tiles, row-major, one tile every {1 / fps:.2f}s)",
        "",
    ]
    lines += [f"- `{name}` {fmt_t(a)} → {fmt_t(b)}" for name, a, b in sheets]
    lines.append(NOTES_TEMPLATE)
    (d / "index.md").write_text("\n".join(lines), encoding="utf-8")
    return {"slug": slug, **stats}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("folder", nargs="?", default=str(ROOT / "reference-videos"))
    ap.add_argument("--fps", type=float, default=2.0, help="tiles per second (motion detail vs. sheet count)")
    ap.add_argument("--threshold", type=float, default=0.3, help="scene-change sensitivity (0.2–0.4)")
    ap.add_argument("--no-transcribe", action="store_true")
    ap.add_argument("--language", default=None, help="speech language (default: auto-detect)")
    args = ap.parse_args()
    need("ffmpeg")

    folder = Path(args.folder).expanduser().resolve()
    videos = sorted(p for p in folder.rglob("*") if p.suffix.lower() in VIDEO_EXT)
    if not videos:
        sys.exit(f"no videos in {folder}")
    OUT.mkdir(parents=True, exist_ok=True)
    for i, v in enumerate(videos, 1):
        r = process(v, args.fps, not args.no_transcribe, args.language, args.threshold)
        status = "skipped (done)" if r.get("skipped") else f"{r['duration']}s, {r['cuts_per_min']} cuts/min"
        print(f"[{i}/{len(videos)}] {r['slug']}: {status}")

    # progress index for batch work
    rows = ["# Reference library progress", "", "| video | notes written | shots/min |", "|---|---|---|"]
    for d in sorted(p for p in OUT.iterdir() if p.is_dir()):
        idx = (d / "index.md").read_text(encoding="utf-8") if (d / "index.md").exists() else ""
        done = "**Lesson in one sentence:** " in idx and not re.search(r"\*\*Lesson in one sentence:\*\*\s*\n", idx)
        cpm = json.loads((d / "cuts.json").read_text()).get("cuts_per_min") if (d / "cuts.json").exists() else "?"
        rows.append(f"| [{d.name}]({d.name}/index.md) | {'✅' if done else '—'} | {cpm} |")
    (OUT / "INDEX.md").write_text("\n".join(rows) + "\n", encoding="utf-8")
    print(f"→ {OUT / 'INDEX.md'}")


if __name__ == "__main__":
    main()
