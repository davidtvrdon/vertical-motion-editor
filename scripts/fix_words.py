#!/usr/bin/env python3
"""Fix misrecognized words in a transcript (they become captions), keeping timings.

    python3 scripts/fix_words.py <project> "chedžipity=ChatGPT" "Rokstar=Rockstar"

Matches whole words case-insensitively and keeps trailing punctuation. Multi-word targets
("red ded=Red Dead") replace the first word's text and blank out the rest (timings merge).
Always proofread transcript.txt for brand and product names before planning.
"""
import re
import sys

from common import fmt_t, load_json, project_dir, save_json


def norm(w: str) -> str:
    return re.sub(r"[^\w]", "", w.lower())


def main() -> None:
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    proj = project_dir(sys.argv[1])
    tr = load_json(proj / "transcript.json")
    words = tr["words"]
    for pair in sys.argv[2:]:
        src, dst = pair.split("=", 1)
        parts = [norm(p) for p in src.split()]
        n = 0
        i = 0
        while i <= len(words) - len(parts):
            if [norm(words[i + k]["w"]) for k in range(len(parts))] == parts:
                tail = re.search(r"[^\w]*$", words[i + len(parts) - 1]["w"]).group(0)
                words[i]["w"] = dst + tail
                words[i]["e"] = words[i + len(parts) - 1]["e"]
                del words[i + 1:i + len(parts)]
                n += 1
            i += 1
        print(f"{src!r} → {dst!r}: {n}×")
    # rebuild segment text from words
    for seg in tr["segments"]:
        seg["text"] = " ".join(w["w"] for w in words if seg["s"] - 0.01 <= w["s"] < seg["e"] - 0.01)
    save_json(proj / "transcript.json", tr)
    with open(proj / "transcript.txt", "w", encoding="utf-8") as f:
        for s in tr["segments"]:
            f.write(f"[{fmt_t(s['s'])} → {fmt_t(s['e'])}] {s['text']}\n")


if __name__ == "__main__":
    main()
