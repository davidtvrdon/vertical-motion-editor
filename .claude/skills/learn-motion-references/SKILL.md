---
name: learn-motion-references
description: Study a library of reference videos (motion-graphics tutorials, or videos in a style the user admires) and distill them into rules and new components for the vertical-motion-editor skill. Use when the user drops videos into reference-videos/ and asks to "learn from these", "ingest the reference videos", "analyse my motion graphics tutorials", or to continue a previous ingestion batch.
---

# Learn from reference videos

Goal: turn raw reference videos into **(1)** per-video notes, **(2)** concrete rules in
`vertical-motion-editor/references/motion-principles.md` Part B, and **(3)** a backlog of components worth building.
Raw videos never go into git. Only the distilled knowledge does. Respect the creators: learn the *technique*, never copy their branding,
and don't publish their transcripts (the `knowledge/` folder is for your own notes; keep the repo public only if the notes are your words).

## 1. Extract (once, can be re-run: finished videos are skipped)
```bash
source .venv/bin/activate
python3 scripts/ingest_references.py reference-videos/ --language en   # drop --language to auto-detect
```
For each video this writes `knowledge/reference-videos/<slug>/`: contact sheets (4×4 tiles, 2 fps),
`cuts.json` (shot changes, cuts/min), `transcript.txt`, and `index.md` with an empty Notes section.
Progress table: `knowledge/reference-videos/INDEX.md`.
Videos on YouTube/TikTok/Instagram: `yt-dlp` can download them for personal study if the user has the right to (`brew install yt-dlp`).

## 2. Study in batches of ~5 videos
The contact sheets are images, and dozens of videos won't fit in one context. Work in batches, and for bigger runs
consider one subagent per batch, each returning finished notes.

For each video:
1. Read `index.md` (stats), `transcript.txt` (what the teacher *says*), then every `sheet-NN.jpg` (what they *show*).
   Tiles are row-major, 0.5 s apart, so tile k of sheet n is at `(n*16 + k) * 0.5` s.
2. When a moment matters (a specific ease, a transition), zoom in:
   `ffmpeg -ss <t> -t 1.2 -i "<video>" -vf fps=15,scale=480:-2,tile=6x3 knowledge/reference-videos/<slug>/burst-<t>.jpg`
3. Fill the Notes section of `index.md`. Be **concrete and numeric**: frames, seconds, px, counts, easing names. "Use good timing" is useless. "Hold text 0.25 s per word, min 0.8 s" is a rule.
4. Map every technique to the engine: an existing component/prop, a tweak to an existing component, or a NEW component idea.

After each batch, re-run `python3 scripts/ingest_references.py` (cheap: it only refreshes INDEX.md) and tell the user how many are done.

## 3. Synthesize (after all batches, or every ~15 videos)
- Merge the notes into `.claude/skills/vertical-motion-editor/references/motion-principles.md` → **Part B**, grouped by
  theme (hooks, typography, timing & easing, transitions, layout, data viz, sound, b-roll). One bullet per rule, in your own words. Deduplicate.
  When teachers disagree, note both and pick one for the user's style.
- If a rule changes a default (e.g. entrance length, caption size), **propose the code change** to the user with
  the evidence, then apply it in `src/` if they agree.
- Write `knowledge/reference-videos/BACKLOG.md`: new components ranked by (how often taught × fit with the brand).
  Build the top ones with `references/extending.md`.
- Adapt everything to the active theme (`style-guide.md`): use the semantic colour tokens and the brand box, not the reference's look.
