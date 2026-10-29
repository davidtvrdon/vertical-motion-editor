# Vertical Motion Editor

An **AI-agent skill + Remotion engine** that edits talking-head **vertical video** (TikTok, Instagram Reels, YouTube Shorts) the way a motion designer would:
animated scenes that illustrate what's being said, relevant b-roll, word-by-word captions, punch-in cuts on a steady rhythm, and a branded outro.
Works with **Claude Code, Codex CLI, Cursor, Gemini CLI**, or any agent that can run shell commands and look at images.

```
your video ─► WhisperX word timestamps ─► agent writes plan.json ─► Pexels b-roll ─► validate ─► review stills ─► Remotion MP4
```

Every visual lands on the word it illustrates. The agent never opens a timeline: the video is code (`plan.json`), rendered by [Remotion](https://www.remotion.dev/).
The look is **yours**: you pick a visual style and bring your logo, colours, font and outro.

## Install (about 10 minutes, once)

**You need:** a computer with [Node.js](https://nodejs.org) 18+ (20 recommended), [ffmpeg](https://ffmpeg.org), Python 3.10–3.13, ~6 GB free disk, and an AI coding agent.
macOS/Linux directly; on Windows use WSL.

```bash
git clone https://github.com/davidtvrdon/vertical-motion-editor.git
cd vertical-motion-editor
bash scripts/setup.sh        # npm packages, Python venv + WhisperX, sound effects, health check
```

Then open your agent in this folder and say:

> **Set up my brand.**

The agent runs the onboarding (`.claude/skills/vertical-motion-editor/references/onboarding.md`) and walks you through:

| step | what happens |
|---|---|
| 1. Dependencies | `scripts/doctor.py` checks everything and tells you the exact command for anything missing |
| 2. **Your Pexels key** | free stock video and photos for b-roll. You create your own key at **https://www.pexels.com/api/** (sign up → "Your API Key") and it is stored in `.env`, which is never committed |
| 3. **Branding materials** | brand name, handle, language, logo (PNG/SVG), colours (it can suggest them from your logo), font (any Google Font, or your own file) |
| 4. **Visual style** | it renders previews of four styles with your brand applied and you choose |
| 5. **Outro** | what closes every short: logo card, follow card with your handles, a minimal call to action, your own image/clip, or nothing; plus the call-to-action text, platforms, sound and length |
| 6. Check | it shows you a style sheet and an outro still, and you tweak until you like them |

Prefer a terminal wizard? `python3 scripts/onboard.py` asks the same questions. Everything is saved in `brand/brand.json` (editable by hand), and `python3 scripts/apply_brand.py` rebuilds the theme.

### The four styles

Preview them any time: `node scripts/preview_styles.mjs` → `out/style-previews/*.jpg`.

| | |
|---|---|
| **pulse** (default) | bold modern pop: rounded cards with hard offset shadows, lime / indigo / ink |
| **block** | neo-brutalist stickers: 3D extruded blocks, thick outlines, yellow / pink / black |
| **clean** | minimal and calm: soft rounded cards, one blue accent; good for business and education |
| **editorial** | magazine / documentary: serif type, paper texture, film grain, vermilion / teal |

Your colours, font and logo are applied on top of whichever style you pick. You can also add presets (`src/theme/presets.json`).

### Optional: use it from any folder

Inside this repo the skill is found automatically (`.claude/skills/`, plus `AGENTS.md` for other agents). To use it from any folder:
`bash scripts/install_skill.sh` (Claude Code) or `bash scripts/install_skill.sh <your agent's skills folder>`.

## Editing a video: three levels

Open your agent in this folder and talk to it.

**Quick** (30–60 s short, no brief). Every ~3 s the face cuts to b-roll or an animation (≤ 5 s), and motion graphics go over the face inside the TikTok/Reels/Shorts safe zones:
> Quick edit ~/Videos/clip.mov.

**Medium** (context and guidance). The agent creates `projects/<name>/brief.md` from a template for you to fill in, or you write the context in chat:
> Edit ~/Videos/clip.mov, medium level. Audience: beginners. Key message: the base model is great for students, not for pros. Emphasise price and RAM. CTA "Full video on YouTube".

**Advanced** (exact clips, images, texts). Fill the shot-list table in `templates/brief-advanced.md` (phrase → element → file/props, with `LOCKED` rows) and put your files into `projects/<name>/assets/`:
> Edit ~/Videos/clip.mov, advanced. The brief is in projects/clip/brief.md, assets are in the folder.

Output: `projects/<name>/out/<name>-final.mp4`, plus the Pexels credits. Your outro is appended automatically.

### Manual commands (what the agent runs)
```bash
source .venv/bin/activate
python3 scripts/new_project.py demo ~/Videos/clip.mov --level quick
python3 scripts/transcribe.py demo                   # language from your brand; --model small|medium|large-v3
python3 scripts/fix_words.py demo "chat gee pee tee=ChatGPT"   # proofread names for the captions
python3 scripts/analyze_faces.py demo                # face track: graphics never cover the face
python3 scripts/quick_plan.py demo                   # rhythm skeleton → projects/demo/plan.json
#   … the agent fills the TODO slots …
python3 scripts/pexels.py fill demo                  # download b-roll for cuts with a query
python3 scripts/validate_plan.py demo
node scripts/review.mjs demo --safe                  # stills + contact sheets → projects/demo/review/
bash scripts/render.sh demo final
npx remotion studio src/index.ts --props=projects/demo/plan.json --public-dir=projects/demo   # scrub interactively
```

## What's inside

- **~60 animated scenes** (numbers, comparisons, schematics, chat windows, maps, timelines, news cards …) and overlays (hook titles, keyword pops, stat badges, lower thirds, CTAs). Browse them: `npm run studio` → `GalleryShort`. Catalog: `.claude/skills/vertical-motion-editor/references/components.md`.
- **Smart layout**: the face track keeps graphics off the talking head; split-screen clips get graphics on the listener's half; captions stay inside the platform safe zones.
- **A rhythm engine** that snaps cuts to pauses and word starts, plus a validator that checks timing, files and repetition.
- **Film look** (grain, paper texture, gate weave, aberration), tuned per style.
- **Review loop**: the agent renders stills and looks at them before the final render.

## Dependencies at a glance

| | what | for |
|---|---|---|
| system | Node.js 18+, npm, ffmpeg/ffprobe, Python 3.10–3.13 | everything |
| npm | `remotion`, `@remotion/cli`, `@remotion/bundler`, `@remotion/renderer`, `@remotion/fonts`, `@remotion/media-utils`, `react` 19, `typescript` | rendering |
| pip | `whisperx` (PyTorch), `numpy`, `pillow`, `opencv-python-headless` | transcription, analysis, sound effects |
| accounts | a free **Pexels** API key (yours) | b-roll |
| network (once) | npm, pip, Hugging Face (Whisper models), Google Fonts, Remotion's headless Chrome | downloads |

Optional: HuggingFace token (speaker labels), an NVIDIA GPU (fast transcription), `yt-dlp` (reference videos), the OpusClip connector (`references/opusclip.md`).

## Layout

```
.claude/skills/vertical-motion-editor/   the editing skill: SKILL.md + references/ (onboarding, style guide, components, schema …) + brief templates
.claude/skills/learn-motion-references/  skill for studying reference videos
AGENTS.md  CLAUDE.md                     entry points for other agents / Claude Code
brand/                                   your brand.json (and an example)
src/                                     Remotion: Edit composition, BrandBox, captions, scenes, overlays, outro, theme/
public/brand/                            your logo, fonts, outro media, sound effects (generated)
scripts/                                 pipeline (Python + WhisperX, Node for review stills), doctor, onboarding
projects/<name>/                         one folder per video (media gitignored; brief.md + plan.json tracked)
```

## Notes
- **Privacy / secrets**: `.env` is gitignored; nothing is sent anywhere except package downloads, Google Fonts, Pexels searches and model downloads. The repo contains no keys.
- **Pexels licence**: free to use; credit the photographer where practical (the agent lists credits after each job). Always follow Pexels' current terms.
- **Fonts**: Google Fonts are open source (mostly SIL OFL). If you supply your own font file, make sure you may use it.
- **Safe zones** are conservative approximations (platforms move their UI): check with `review.mjs --safe`.
- **Rendering** is CPU-bound: a 30 s short takes ~1–3 min on a recent laptop.
- Not just shorts: the engine also renders 16:9 (`--format long`), see `references/other-formats.md`.

## License
MIT: see [LICENSE](LICENSE). Remotion has its own [license terms](https://www.remotion.dev/license) (free for individuals and small teams; check yours for commercial use).
