#!/usr/bin/env python3
"""Word-level transcript with WhisperX (https://github.com/m-bain/whisperX).

    python3 scripts/transcribe.py <project> [--language en] [--model small]

Writes to the project folder:
  transcript.json   {"language", "words": [{"w","s","e","score"}], "segments": [{"s","e","text"}]}
  transcript.txt    one segment per line with [mm:ss.ss → mm:ss.ss] stamps (for reading/planning)

Alignment models are downloaded per language on first use (WhisperX default alignment model for that language).
Runs on CPU (int8) by default; pass --device cuda on an NVIDIA GPU.
The default language is the brand language (brand/brand.json → language). Proofread names afterwards
(e.g. "chat gee pee tee" → ChatGPT) with scripts/fix_words.py.
"""
import argparse
import sys

from common import fmt_t, load_env, load_theme, project_dir, save_json


def fill_missing(words: list[dict]) -> list[dict]:
    """wav2vec2 can't align some tokens (digits, symbols). Give them interpolated times."""
    for i, w in enumerate(words):
        if "s" in w and "e" in w:
            continue
        prev_e = next((words[j]["e"] for j in range(i - 1, -1, -1) if "e" in words[j]), 0.0)
        nxt_s = next((words[j]["s"] for j in range(i + 1, len(words)) if "s" in words[j]), prev_e + 0.4)
        w["s"], w["e"] = prev_e, max(prev_e + 0.05, nxt_s)
    return words


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("project")
    ap.add_argument("--language", default=None, help="ISO code, e.g. en, de, sk (default: the brand language, else en)")
    ap.add_argument("--model", default=None, help="whisper model: tiny/base/small/medium/large-v3 (default: large-v3 with --device cuda, else small). Bigger = more accurate, slower, bigger download")
    ap.add_argument("--device", default="cpu")
    ap.add_argument("--compute-type", default=None, help="default: int8 on cpu, float16 on cuda")
    ap.add_argument("--batch-size", type=int, default=8)
    ap.add_argument("--hotwords", default=None,
                    help="comma separated names/terms to bias recognition. Off by default: it can cause hallucinated/skipped text. "
                         "Prefer fixing names afterwards with scripts/fix_words.py")
    ap.add_argument("--prompt", action="store_true",
                    help="also pass hotwords as initial_prompt (can make Whisper SKIP whole passages of disfluent speech; off by default)")
    ap.add_argument("--input", default="source.mp4", help="file inside the project folder")
    args = ap.parse_args()

    load_env()
    args.language = args.language or load_theme().get("language") or "en"
    args.model = args.model or ("large-v3" if args.device == "cuda" else "small")
    try:
        import whisperx  # noqa: WPS433
    except ImportError:
        sys.exit("error: whisperx not installed. Run: bash scripts/setup.sh (or pip install whisperx)")

    proj = project_dir(args.project)
    media = proj / args.input
    compute = args.compute_type or ("float16" if args.device == "cuda" else "int8")

    print(f"loading {args.model} on {args.device}/{compute} ...")
    model = whisperx.load_model(
        args.model, args.device, compute_type=compute, language=args.language,
        asr_options={"hotwords": args.hotwords, "initial_prompt": args.hotwords if args.prompt else None},
    )
    audio = whisperx.load_audio(str(media))
    result = model.transcribe(audio, batch_size=args.batch_size, language=args.language)

    print("aligning words ...")
    align_model, meta = whisperx.load_align_model(language_code=args.language, device=args.device)
    aligned = whisperx.align(result["segments"], align_model, meta, audio, args.device, return_char_alignments=False)

    words, segments = [], []
    for seg in aligned["segments"]:
        segments.append({"s": round(seg["start"], 3), "e": round(seg["end"], 3), "text": seg["text"].strip()})
        for w in seg.get("words", []):
            item = {"w": w["word"].strip()}
            if "start" in w and "end" in w:
                item.update(s=round(w["start"], 3), e=round(w["end"], 3), score=round(w.get("score", 0), 3))
            words.append(item)
    words = [w for w in fill_missing(words) if w["w"]]

    save_json(proj / "transcript.json", {"language": args.language, "words": words, "segments": segments})
    with open(proj / "transcript.txt", "w", encoding="utf-8") as f:
        for s in segments:
            f.write(f"[{fmt_t(s['s'])} → {fmt_t(s['e'])}] {s['text']}\n")
    print(f"{len(words)} words, {len(segments)} segments → {proj / 'transcript.json'}")


if __name__ == "__main__":
    main()
