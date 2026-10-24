---
name: vertical-motion-editor
description: Edit talking-head vertical video (TikTok, Instagram Reels, YouTube Shorts, 30–60 s) with motion graphics, b-roll, captions and a branded outro, using Remotion + WhisperX word timestamps. Includes a first-run onboarding (installs the dependencies, asks for the user's own free Pexels API key, their brand materials, a visual style and an outro). Three levels - quick ("just edit this"), medium (a brief with context), advanced (exact clips, images and timestamps). Triggers - "edit this video", "make a short", "add motion graphics", "add b-roll", "quick edit", "cut this for TikTok/Reels", "use this brief", "set up my brand", "install the video editor", "change my style", "change my outro".
---

# Vertical motion editor

You are the editor. The video is **code**: you write `projects/<name>/plan.json` (the edit plan) and Remotion renders
it. You never touch a timeline GUI. WhisperX gives you word timestamps, so every visual lands on the word it
illustrates. The look (colours, font, boxes, backdrops, outro) comes from the user's **brand theme**, not from this file.

```
set up once ─► new_project ─► transcribe (WhisperX) ─► plan.json ─► pexels fill ─► validate ─► review stills ─► render
(onboarding)                                              ▲  you write this, by level  │            │ you LOOK at them
                                                          └──────────────── fix ◄──────┴────────────┘
```

Works with any agent that can run shell commands and read images (Claude Code, Codex CLI, …). Run everything from the
repo root. Python scripts run inside the venv: `source .venv/bin/activate` (or `.venv/bin/python`).

## 0. Is it set up? (check every session)

If the current folder has no `scripts/doctor.py`, you are outside the engine repo: this skill was installed globally, and the file
`ENGINE_DIR` next to this SKILL.md holds the repo path. `cd` there first.

```bash
python3 scripts/doctor.py          # add --json for machine-readable output
```
- Anything **required** is red → do the install steps in `references/onboarding.md` §1 (`bash scripts/setup.sh`).
- No `brand/brand.json` (doctor: "brand set up" is optional-red) and the user has not said "use the default" →
  run the **onboarding** (below) before editing anything. It takes a few minutes and makes every video on-brand.
- `PEXELS_API_KEY` missing → b-roll is limited to scenes and the user's own assets. Offer the Pexels step.

### Onboarding (first run, or "set up my brand" / "change my style" / "change my outro")

Full script with exact questions, commands and what to show: **`references/onboarding.md`**. In short, in this order:

1. **Dependencies**: `bash scripts/setup.sh` (Node, ffmpeg, Python venv with WhisperX). Fix what `doctor.py` reports.
2. **Pexels key**: the *user* creates their own free key at https://www.pexels.com/api/ (sign up → "Your API Key").
   Never use or invent a key, never print it, never commit it. It lives in `.env` (gitignored). Test: `python3 scripts/pexels.py check`.
3. **Branding materials**: name, handle, language of the videos, logo file, brand colours (offer `--suggest-colors` from
   the logo), font (Google Fonts name or a font file). Anything they don't have uses the style's defaults.
4. **Visual style**: run `node scripts/preview_styles.mjs`, open each `out/style-previews/<preset>.jpg` with the Read tool,
   describe the four options (**pulse** default · **block** · **clean** · **editorial**) and let the user choose. Their colours and font
   are applied on top of whichever preset they pick.
5. **Outro**: ask what they want at the end of each short: `logo-card`, `follow-card`, `minimal`, `custom` (their own image or
   clip) or `none`; the call to action text; which platforms and handles; optional sound; duration.
6. **Apply and check**: `python3 scripts/onboard.py …flags…` writes `brand/brand.json` and runs `scripts/apply_brand.py`.
   Show the result: `node scripts/preview_styles.mjs <preset>` and an outro still
   (`npx remotion still src/index.ts PostRoll out/outro.png --frame=45`). Iterate until they are happy.

## 1. Pick the level

| Signal from the user | Level |
|---|---|
| Only a video (+ maybe one line: "quick edit", "make a short out of this") | **quick** |
| A filled `brief.md` or a paragraph of context: topic, audience, key points, CTA, tone | **medium** |
| Exact instructions: timestamps or phrases → specific clips, images or animations; provided asset files; exact texts | **advanced** |

If unsure, use **quick**, say which level you picked, and tell the user a brief would unlock medium.
Don't ask questions in quick mode. In medium/advanced, ask only about real ambiguities, in one batch.

## 2. Common pipeline

```bash
python3 scripts/new_project.py <name> <video> [--level quick|medium|advanced]    # short (9:16) is the default format
python3 scripts/transcribe.py <name>          # language = the brand language; --model small (default on CPU) … large-v3 (best)
```
**Always** (every short, any source) run the face pass; it gives the renderer the face track for the no-cover rules:
```bash
.venv/bin/python scripts/analyze_faces.py <name>
```
Clips from tools that stack two speakers or burn in their own end card (OpusClip and similar, `references/opusclip.md`):
```bash
python3 scripts/detect_layout.py <name> [--outro-color RRGGBB]   # split-screen stretches + end card → project.json
.venv/bin/python scripts/analyze_faces.py <name>                  # then the face pass: who talks in each split-screen stretch
```
`quick_plan.py` then keeps cutaways/overlays off the end card and drops punch-ins during split-screen.

**No-cover rules (automatic, from `layout.faces` / `layout.speakers`):**
- **An overlay never covers the talking head.** The renderer measures each overlay and fits it into the free band above the hair. When the framing is too tight (a big face), the talking head shrinks into a **framed video card** just enough to open that band, and returns to full frame afterwards. Punch-in zooms pause meanwhile. Short overlays keep the face almost full size; long ones shrink the card more, so **keep a HookTitle to ≤ 2 lines (≈ 30 characters) and KeywordPops to one line + optional sub.**
- **Split-screen:** an overlay becomes a **panel that fully covers the listener's half**, so the speaker stays visible. Graphics are only drawn there when the overlay sets `props.panel: true`; otherwise put the idea on a full-frame cut.
- **Captions are always on**, over the face, b-roll and full-screen scenes, inside the safe zone. Scenes keep a band above the bottom safe line free for them. In split-screen the caption sits on the **listener's** side of the seam.
- Speaker detection is a mouth-motion guess. Check one split frame in review; if it's wrong, edit `layout.speakers` in plan.json (`"who": "top" | "bottom"`). To keep the same person in the upper half, set `layout.hostSwap` windows by hand.

Then read `projects/<name>/transcript.txt` and **proofread names**. Whisper misspells brands and names phonetically.
Fix them before planning, since they become captions: `python3 scripts/fix_words.py <name> "chat gee pee tee=ChatGPT"`.
Understand the argument and the one idea worth a short, before you plan anything.

**Clip from a longer recording:** cut a wide window with ffmpeg, `new_project.py` it, transcribe, then pick word-exact ranges and assemble
them with `python3 scripts/splice_source.py <name> --tighten 0.45 --keep a-b c-d …` (jump cuts, dead air out; re-transcribe afterwards).
`python3 scripts/cut_by_words.py` removes every gap between words (ehms, breaths).

Shorts longer than ~60 s: pick the strongest 30–60 s window with a hook in the first sentence and a complete thought. Pass it as
`--start/--end` to `quick_plan.py`, or set `source.start` + `duration`.

After planning (per level, below):
```bash
python3 scripts/pexels.py fill <name>            # downloads b-roll/photos for cuts with `query` and no `src`
python3 scripts/validate_plan.py <name>          # must print OK
node scripts/review.mjs <name> --safe            # stills + contact sheets in projects/<name>/review/
```
**Open every `review/sheet-*.jpg` with the Read tool and critique it** using the checklist in §6. Fix the plan and re-review until clean. Then:
```bash
bash scripts/render.sh <name> preview            # optional half-res check
bash scripts/render.sh <name> final              # → projects/<name>/out/<name>-final.mp4
```
**Outro.** Every short ends with the brand's outro (`plan.postRoll`, component `PostRoll`; set up in the onboarding, details in `references/components.md`).
`quick_plan.py` adds `"postRoll": {"duration": …}` automatically unless the brand's outro style is `none` or the source already
carries its own end card (`layout.outro`). It is appended **after** `duration`, so cuts, overlays and captions never touch it, and the edit's
own audio stops where it begins. Skip it with `quick_plan.py --no-post-roll` or by deleting the key; override per video with
`postRoll.cta`, `postRoll.style`, `postRoll.platforms`. Preview it alone with `npm run studio` → `PostRoll`. Review stills cover only the edit, so
check the end card with `ffmpeg -ss <duration+1> -i out/<name>-final.mp4 -frames:v 1 end.png`.

Report: the output path, the level used, a table of cutaways/overlays (time → what), and the Pexels credits (Pexels asks for attribution where practical).

## 2b. The user's own media and the pattern budget

- **Use the user's product media first.** When a folder (`assets/`, a shared drive link) holds product photos or clips, they beat stock and generic scenes. Look at EVERY file (contact sheet) and map files to sentences. If a clip's topic has no media in the folder, say so and use the code-drawn object scenes instead of stock.
- **Show media unaltered** when the source forbids edits (press kits, licensed footage): cuts get `"raw": true`, no `tint`, and the media scenes (`PhotoStack`, `Callouts`, `ZoomLens`, `ScreenClip`, `Lineup`) skip the film look automatically. Scaling, a card, a loupe or a label is fine; recolouring and grain are not. Downscale big photos to ≤ 2200 px and crop progress bars off screen recordings with ffmpeg before use.
- **Pattern budget (hard rule).** Patterns repeat across a batch and stop working: **a scene type appears at most once per video and at most once across the clips edited together**; neighbours also differ in tone. Plan the whole batch first (a table of clip → cut → scene), then fill. Prefer the media and object scenes, and invent a new scene (`references/extending.md`) when no existing one shows the idea.

## 3. QUICK: rhythm-first, zero questions

The rule for shorts:
- **About every 3 s the face cuts away** to b-roll, an image or an animated scene.
- **A cutaway is ≤ 5 s, ideally 1.5–3 s.** Then back to the face, with a new punch-in framing.
- **While the face is on screen there is a motion graphic on top** (keyword, stat, sticker…), inside the platform safe zone.
- Hook: the first ~2.5 s stay on the face with a `HookTitle`. The last ~2 s stay on the face with a `CTA` or the payoff.

Steps:
1. `python3 scripts/quick_plan.py <name>` builds the skeleton. Cut slots are snapped to pauses and word starts, with alternating zooms, a `HookTitle` slot and one overlay slot per face stretch. Each slot carries `spoken`, the words said during it.
2. Replace every `"TODO"` in `plan.json`. For each **cut slot**, choose:
   - a **number, price, percentage or multiplier** in `spoken` → `scene: BigNumber` (or `BarChart` if two or more numbers are compared)
   - **"X vs Y", "instead of", "compared to"** → `scene: Versus`
   - an **enumeration** ("three things", "first, second") → `scene: ListScene`
   - **the key claim of the video** → `scene: KineticTitle` (≤ 7 words)
   - **someone prompting / chatting with an AI** → `scene: ChatMock` with the actual prompt as the message
   - **cause → effect, a process, a chain, "A needs B to…"** → `scene: FlowDiagram` (2–4 short nodes)
   - **an open question, doubt** → `scene: BigQuestion`
   - **a mechanism** (a system checks/sorts/decides, something speeds up, grows, outgrows, races, is blocked, heads somewhere, rises or falls) → a **schematic scene** from components.md: `DecisionCard`, `SortingPipeline`, `Blockers`, `GrowthCurve` / `IntervalTimeline`, `ReleaseRace`, `Outgrow`, `PredictionCard`, `Trajectory`, `Gauge`. **Aim for at least half the cutaways in a short to be schematics or ChatMock/FlowDiagram.**
   - **a news-style statement** (someone wins/loses, overtakes, lags behind, opens up, goes from a few users to everyone) → a **story scene**: `Verdict`, `RankSwap`, `LaggardRace`, `Hub`, `Crowd`.
   - **a familiar object or place** → a **world scene**: a price → `PriceTag`, a date → `CalendarDate`, countries → `WorldMap`, a launch or news → `PhoneNotification` / `Newspaper`, history → `EventTimeline`, money or a deal → `MoneyFlow` / `Acquisition`, pros and cons → `Balance`, search → `SearchBar`, an upgrade → `BeforeAfter`, a stack → `LayerStack`, battery → `Battery`, code or agents → `Terminal`, a quote from someone → `SocialPost`.
   - **Backgrounds**: keep `"sceneBg": "auto"` (set by quick_plan). Override `bg` on a cut when a backdrop fits the content: `grid` for how it works, `rays` for a winner or reveal, `split` for comparisons, `rings` for announcements, `tape` for news.
   - **Keep videos from looking alike**: `validate_plan.py` warns about scenes repeated across recent projects; pick fresh ones where the content allows.
   - Long ideas can span two cutaways with the face in between: continue the same scene (`DecisionCard` / `ChatMock` with `instant`) so it reads as one build-up.
   - a **named product or brand** → `type: image` + the product image if the user provided one, otherwise `ProductShowcase`/`KeywordPop`
   - **B-roll only when you find a clip that is genuinely relevant** to what's said at that moment (the speaker says "editor" → an editor marking up a manuscript; "server room" → servers). Look actively: several queries and `pexels.py search`, not just the first hit. Not relevant: mood-only matches and generic AI stock (robot hands, binary code, random crowds, someone staring out a window). When no relevant clip exists, build a motion graphic from the content instead. There's no quota.
   - After `pexels.py fill`, look at a frame of every clip and reject anything that doesn't pass that test.
   - **Go beyond repeating the words**: build schematics and scenes that show how things work (`references/motion-principles.md` → "Go further than the words"). A cutaway that only shows the spoken sentence as text is the weakest option.
   - Motion rules (`references/motion-principles.md`): cut on action/at the peak of the ease curve, one animated text at a time, focus on one element (earlier ones dim), texture everything (the theme's `look` does it).
   - Never three identical scene types in a row. Rotate tones (`secondary` → `primary` → `paper` → `dark`).
   - `transition`: mostly `cut`. Use `whip`/`zoom`/`slide` on every 2nd–3rd cutaway for energy and `flash` for a reveal. `box` is the signature reveal, so use it sparingly (1–2× per short).
3. For each **overlay slot** (on the face), pick the one thing worth reinforcing in that stretch: `KeywordPop` (2–3 words from the sentence, not a verbatim caption), `StatBadge`, `Sticker`, `ListOverlay`, `ProductCard`. If nothing fits, **delete the slot**: an empty face stretch is better than noise. Last slot: `CTA` ("Follow for more", "Full video on YouTube") or the payoff.
4. `captions.emphasis`: 3–6 words (names, numbers, the keyword) that get the highlighted box.
5. When b-roll is justified, queries must be concrete and visual in English: `"editor red pen editing manuscript"`, not `"productivity"`.

## 4. MEDIUM: brief-guided

Input is `projects/<name>/brief.md` (template: `templates/brief-medium.md`) or context in chat.
1. Read the brief and transcript, then write a 5–10 line **edit concept**: the hook, what the viewer should remember, the visual motifs, and which moments get scenes. Show it to the user only if the brief asks for approval.
2. Run `quick_plan.py` with rhythm options from the brief: pace fast → `--head 2.5 --insert 1.8`, calmer → `--head 4 --insert 2.5`.
3. Fill slots as in quick, but:
   - the brief's **key message** gets a `KineticTitle` or `HookTitle`, and its **keywords** go into `captions.emphasis` and `KeywordPop`s
   - honor **b-roll themes / avoid lists** in every Pexels query
   - use the brief's **CTA** text verbatim
   - move or merge slots so the brief's **must-show moments** land exactly on their words (search `transcript.json` for the word, then use its `s`/`e`)
4. Keep the quick-mode limits (≤ 5 s cutaways on shorts) unless the brief overrides them.

## 5. ADVANCED: exact shot list

Input: `templates/brief-advanced.md` filled in, plus files in `projects/<name>/assets/`.
1. Parse the shot list. Each row is **anchor (timestamp or quoted phrase) → element → content**. Resolve every phrase to times with `transcript.json`: the start is the first word's `s`, and the end is the last word's `e` plus about 0.3 s.
2. Build `plan.json` **by hand** (no quick_plan), or run quick_plan and then overwrite the slots the brief pins. Rows marked `LOCKED` must match exactly. You fill the gaps with medium-level judgement, unless the brief says "only what I listed".
3. Specific Pexels clips: `python3 scripts/pexels.py get <name> <id>`. To browse: `python3 scripts/pexels.py search "<q>"`.
4. User files: copy them into `assets/` (don't symlink files, because Remotion won't serve them). Logos, screenshots and packshots: `fit: "contain"`. Photos and footage: `fit: "cover"`.
5. If the brief asks for a visual that no component covers, **build a new component** (see `references/extending.md`), register it, and add it to `references/components.md`, so the library grows.
6. Before rendering, print a table of each LOCKED row → what you placed and when, so the user can verify.

## 6. Review checklist (for every contact sheet)

- Text is inside the safe zone. With `--safe`, the blue areas are platform UI, and nothing important may sit there.
- No graphic covers a face (the renderer handles it when `layout.faces` exists; the validator warns when it doesn't). In split-screen stills, the panel covers the person who is **not** talking. If not, fix `layout.speakers`.
- Captions are visible in every still (face, b-roll, scenes) and inside the safe zone; no scene element sits under them.
- No text over busy b-roll without its box. Nothing is cut off, and no line holds a single orphaned word.
- Numbers are fully counted up by mid-cutaway. Units are glued (`$699` / `699 €` never wraps).
- Neighbouring cutaways differ in type and tone, so it doesn't read as the same card three times.
- B-roll matches what is being said at that moment. Clips with watermarks, burned-in text or other people's logos are rejected.
- The language's special characters render (diacritics, umlauts, Cyrillic …). If a glyph is missing, the font lacks it: change `font` in brand.json.
- **Scenes fill the frame.** Scene text must be readable on a phone: when the build-up sits small in the middle with big empty areas, shorten the strings or raise the size (scene text ≈ 70–110 px on 1080 wide).
- **Sample build-up scenes 2–3 times** (`--times` at ~35 %, 65 %, 92 % of each cut). A middle frame alone hides a step that lands late or never.
- Text on dark tones (`dark`, and `secondary` when it is dark) must be light, never dark on dark. Text colour in the brand colour must contrast with its background.
- Stickers and emoji never sit on a face (in split-screen they easily land on the other speaker's head). When in doubt, leave them out.
- The brand shows: logo/watermark where intended, colours and font consistent, the outro matches what the user chose.

## 7. Other formats and sources

- **OpusClip and similar clip makers** (they bake in their own captions): `references/opusclip.md`.
- **16:9 / long form, or a different aspect ratio**: this skill is built for vertical clips; `references/other-formats.md` says what changes.

## References

- `references/onboarding.md`: the first-run script (dependencies, Pexels key, brand questions, style, outro)
- `references/style-guide.md`: the theme system, the four presets, tokens, type, boxes, motion, copy rules, sound
- `references/components.md`: every scene and overlay with props (**check before inventing**)
- `references/plan-schema.md`: the plan.json format and a full example
- `references/safe-zones.md`: platform UI areas and layout bands
- `references/motion-principles.md`: timing and easing rules
- `references/broll-and-assets.md`: Pexels queries, product images, licensing
- `references/extending.md`: adding components, presets or templates
- `references/opusclip.md`, `references/other-formats.md`
