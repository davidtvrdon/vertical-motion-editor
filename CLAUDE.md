# Vertical motion editor

Remotion + WhisperX engine, driven by an AI agent, that edits talking-head **vertical video** (TikTok / Reels / Shorts) with motion graphics, b-roll, captions and a branded outro.

- First time here (or no `brand/brand.json`)? Run the onboarding in `.claude/skills/vertical-motion-editor/references/onboarding.md`: dependencies, the user's own Pexels key, brand materials, a visual style, an outro.
- Editing a video → skill `.claude/skills/vertical-motion-editor/SKILL.md` (quick / medium / advanced levels).
- Learning from reference videos → skill `.claude/skills/learn-motion-references/SKILL.md`.
- Edit plans are JSON (`projects/<name>/plan.json`), rendered by the `Edit` composition in `src/`.
- The look comes from the theme: `brand/brand.json` + a preset → `python3 scripts/apply_brand.py` → `src/theme/active.json`. Never hard-code colours in components; use the tokens in `src/brand.ts`.
- Python scripts: `source .venv/bin/activate` first. Node: `npm run typecheck` after changing `src/`.
- Health check: `python3 scripts/doctor.py`.
- Media (videos, downloads, renders) never goes into git. Only `brief.md` and `plan.json` per project.
- Secrets live in `.env` (gitignored). Never commit, print or invent API keys. The Pexels key belongs to the user.
