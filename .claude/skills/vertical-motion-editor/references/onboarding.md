# Onboarding: install and brand setup (first run)

Run this once per machine/clone, and again whenever the user says "set up my brand", "change my style", "change my outro" or "new Pexels key".
You (the agent) ask the questions; the user never has to edit JSON. Ask in **one or two batches** (not one question per message), show things
rather than describing them, and never invent answers: anything the user skips falls back to a sensible default.
If your agent has a multiple-choice question tool (Claude Code: AskUserQuestion), use it for the style and outro choices.

Money / secrets rules: the Pexels key belongs to the user. Never use a key you did not get from them, never echo it back, never write it anywhere except `.env`
(gitignored), never put it in `brand.json`, a plan, a commit or a message.

## 1. Dependencies

```bash
python3 scripts/doctor.py          # what is missing?
bash scripts/setup.sh              # installs Node packages + Python venv with WhisperX, creates .env, applies the default theme
python3 scripts/doctor.py          # must show "All required checks passed"
```

| needs | why | install |
|---|---|---|
| Node.js 18+ (20+ recommended) and npm | Remotion renders the video | https://nodejs.org · `brew install node` · `sudo apt install nodejs npm` |
| ffmpeg + ffprobe | media probing, stills, encoding | `brew install ffmpeg` · `sudo apt install ffmpeg` · Windows: use WSL |
| Python 3.10–3.13 with `venv` | WhisperX transcription, analysis scripts | `brew install python@3.12` · `sudo apt install python3.12 python3.12-venv` |
| ~6 GB free disk | PyTorch + Whisper models | first transcription downloads the model |
| internet (once) | npm, pip, Google Fonts (font download), Remotion's headless Chrome | |
| an NVIDIA GPU (optional) | much faster transcription: `transcribe.py --device cuda --model large-v3` | |

Python packages (`requirements.txt`): `whisperx`, `numpy`, `pillow`, `opencv-python-headless`. Node packages (`package.json`): Remotion 4 (`remotion`, `@remotion/cli`,
`@remotion/bundler`, `@remotion/renderer`, `@remotion/fonts`, `@remotion/media-utils`), React 19, TypeScript.
Transcription alone can be skipped (`SKIP_WHISPERX=1 bash scripts/setup.sh`) if the user only wants to try the look.
If Remotion cannot download Chrome (offline / locked-down network), set `REMOTION_BROWSER_EXECUTABLE` in `.env` to an installed Chrome/Chromium.

## 2. Pexels API key (free stock footage)

Pexels provides free stock video and photos for b-roll. Each user needs **their own** free key:

1. Open https://www.pexels.com/api/ and sign up / log in.
2. Click "Your API Key" and copy the key.
3. Put it into `.env` as `PEXELS_API_KEY=…`. Either the user edits the file, or (if they paste it to you) save it without echoing it:
   `printf '%s' "<key>" | python3 scripts/onboard.py --pexels-key-stdin`  (this also runs the check)
4. Verify: `python3 scripts/pexels.py check` → "Pexels key OK".

Limits: 200 requests/hour, 20 000/month (free). No key? Say so: b-roll is then limited to scenes and the user's own clips and images. It can be added any time.

## 3. Branding materials

Ask, in this order (all optional; say what the default is when skipped):

| ask | notes | flag |
|---|---|---|
| Brand / channel name | shown in the logo reveal, outro, tape backdrop, newspaper scene | `--name` |
| Main handle (and website) | e.g. `@yourname` | `--handle`, `--website` |
| Tagline, one line (optional) | | `--tagline` |
| Language of the videos | ISO code (`en`, `de`, `sk`, `cs`, …): transcription language, number formats, font subsets | `--language` |
| Logo file | PNG with transparent background (best) or SVG. Ask for the path. No logo → the name is typeset in a box | `--logo` |
| Logo on every video as a small watermark? | corner: top-left / top-right / bottom-left / bottom-right | `--watermark` |
| Brand colours | one or two hex codes. If they have a logo but no codes, run `python3 scripts/onboard.py --suggest-colors <logo>` and offer the results. None → the preset's palette | `--primary`, `--secondary` (`--dark`, `--paper` optional) |
| Font | a Google Fonts name ("Space Grotesk", "Poppins", "DM Serif Display"…), or a path to their font file (`.woff2/.woff/.ttf/.otf`). None → the preset's font. Mind the licence of a font file | `--font` |

Check that the font covers the language (e.g. Slovak/Czech need Latin Extended; Cyrillic needs a Cyrillic subset, which `apply_brand.py` downloads for `ru/uk/bg/sr`).

## 4. Visual style

```bash
node scripts/preview_styles.mjs            # ~1 minute: out/style-previews/{pulse,block,clean,editorial}.jpg
```
It applies the user's colours/font/logo from `brand/brand.json` to each preset if that already exists (run step 3's `onboard.py --no-apply` first to see their brand in each style).
Open each JPG with the Read tool, **show them to the user** (describe in one line each) and ask which one:

| style | in one line |
|---|---|
| **pulse** (default) | bold modern pop: rounded cards with hard shadows, lime/indigo/ink by default |
| **block** | neo-brutalist stickers: 3D extruded blocks, thick outlines, yellow/pink/black by default |
| **clean** | minimal and calm: soft rounded cards, one blue accent, almost no texture; good for business and education |
| **editorial** | magazine/documentary: serif type, paper texture, film grain, vermilion/teal by default |

If none fits: pick the nearest and adjust `colors`, `font`, or the advanced keys (`box.style`, `box.radius`, `captions.style`, `look`) in `brand/brand.json`; see `style-guide.md`.
Also ask the **tone of voice** in a few words ("calm and smart", "loud and funny"): it guides on-screen copy later (note it in `brand/brand.json` as `"tone": "…"` for yourself; the renderer ignores it).

## 5. Outro

Ask what should close every short:

| style | what the viewer sees | needs |
|---|---|---|
| `logo-card` | logo (or name) drops in, call-to-action box, handle, platform badges | logo optional, CTA, platforms optional |
| `follow-card` | big call to action and one line per platform with its handle | CTA, ≥ 1 platform with handle |
| `minimal` | just the call to action and the handle | CTA |
| `custom` | the user's own image or short video, optionally with the CTA on top | a file (video length sets the duration) |
| `none` | no end card | |

Also ask: the **call-to-action text** ("Follow for more", "Full video on YouTube", "Subscribe", in their language), **which platforms and handles**
(youtube, instagram, tiktok, x, linkedin, facebook, spotify, apple, website), the **duration** (default 2.5 s; 2–3 s works best for shorts), and an optional **sound** (a short jingle .wav/.mp3).
Flags: `--outro-style`, `--outro-cta`, `--outro-duration`, `--outro-platform instagram=@me` (repeatable), `--outro-file`, `--outro-sound`.

## 6. Apply and verify

```bash
python3 scripts/onboard.py --name "Acme Weekly" --handle @acmeweekly --language en --preset pulse \
  --primary "#FF5A1F" --secondary "#1B1F3B" --font "Space Grotesk" --logo ~/Brand/logo.png --watermark top-left \
  --outro-style follow-card --outro-cta "Follow for more" --outro-platform instagram=@acmeweekly --outro-platform youtube=@acmeweekly
```
This writes `brand/brand.json` and runs `scripts/apply_brand.py` (downloads the font, copies logo/outro media into `public/brand/`, writes `src/theme/active.json`).
Then **show the user the result**, not just "done":

```bash
node scripts/preview_styles.mjs <preset>                       # the chosen style with their brand
npx remotion still src/index.ts PostRoll out/outro.png --frame=45    # the outro (open with the Read tool)
npm run studio                                                  # optional: GalleryShort lists every scene and overlay
```
Iterate on anything they dislike (change flags, re-run `onboard.py`). When they are happy, tell them how to start:
"Give me a vertical video and say *quick edit this*" and mention that a brief (medium level) or a shot list (advanced) gives them more control.
Finish by running `python3 scripts/doctor.py --online` and reporting what works and what is still missing.

## What is stored where

| file | content | in git? |
|---|---|---|
| `.env` | `PEXELS_API_KEY`, optional tokens | **never** (gitignored) |
| `brand/brand.json` | the brand answers | yes (no secrets inside) |
| `public/brand/` | logo, fonts, outro media, sound effects | yes |
| `src/theme/active.json` | the resolved theme (generated) | yes |
| `projects/<name>/` | per-video folder: source, assets, renders | only `brief.md` and `plan.json` |
