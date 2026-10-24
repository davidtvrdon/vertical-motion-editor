#!/usr/bin/env python3
"""Cut a short out of a longer window word by word: every gap between words (pauses, "ehm", "ah", breaths) is removed.

    python3 scripts/cut_by_words.py <project> --spans 44.8-58.1 91.8-118.9 [--gap 0.22] [--pad 0.07] [--dry]

Needs projects/<p>/window_transcript.json (transcribe.py --input source_window.mp4, then rename transcript.json).
Spans are seconds of source_window.mp4. Inside a span the speech is cut into runs of words; a new run starts wherever
two words are more than --gap seconds apart, and each run is padded by --pad on both sides (never into a neighbouring
word). The runs are joined with 40 ms audio fades (splice_source.assemble).

Gaps that hold VOICED sound (not silence) are printed: they are usually fillers, but may be words Whisper missed,
so read that list before trusting the cut. Re-transcribe afterwards (word times belong to the new source).
"""
import argparse
import sys

from common import load_json, project_dir
from splice_source import assemble, silences


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("project")
    ap.add_argument("--spans", nargs="+", required=True)
    ap.add_argument("--gap", type=float, default=0.22)
    ap.add_argument("--pad", type=float, default=0.07)
    ap.add_argument("--drop", default="", help="comma separated start times of words to drop (fillers Whisper wrote down)")
    ap.add_argument("--dry", action="store_true")
    args = ap.parse_args()
    proj = project_dir(args.project)
    words = load_json(proj / "window_transcript.json")["words"]
    sil = silences(proj / "source_window.mp4", d=0.08)
    drop = {round(float(x), 1) for x in args.drop.split(",") if x}

    def voiced(a: float, b: float) -> float:
        quiet = sum(max(0.0, min(b, e) - max(a, s)) for s, e in sil)
        return (b - a) - quiet

    ranges, report = [], []
    for sp in args.spans:
        a, b = (float(x) for x in sp.split("-"))
        ws = [w for w in words if w["s"] >= a - 0.02 and w["e"] <= b + 0.3 and round(w["s"], 1) not in drop]
        if not ws:
            continue
        runs = [[ws[0]]]
        for prev, w in zip(ws, ws[1:]):
            gap = w["s"] - prev["e"]
            if gap > args.gap:
                v = voiced(prev["e"], w["s"])
                report.append((prev["e"], gap, v, prev["w"], w["w"]))
                runs.append([w])
            else:
                runs[-1].append(w)
        for i, run in enumerate(runs):
            s0 = run[0]["s"] - args.pad
            e0 = run[-1]["e"] + args.pad
            if i + 1 < len(runs):
                e0 = min(e0, (run[-1]["e"] + runs[i + 1][0]["s"]) / 2)
            if i:
                s0 = max(s0, (runs[i - 1][-1]["e"] + run[0]["s"]) / 2)
            ranges.append((max(0.0, s0), e0))
    print(f"{len(ranges)} runs, {sum(e - s for s, e in ranges):.1f}s kept; removed gaps:")
    for t, gap, v, p, n in report:
        flag = "  <-- VOICED (filler or missed words?)" if v > 0.25 else ""
        print(f"  {t:7.2f} {gap:4.2f}s voiced {v:4.2f}s  «{p}» … «{n}»{flag}")
    if args.dry:
        return
    dur = assemble(args.project, ranges)
    print(f"{args.project}: {dur:.1f}s")


if __name__ == "__main__":
    sys.exit(main())
