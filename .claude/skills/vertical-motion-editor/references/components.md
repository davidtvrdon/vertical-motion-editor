# Component catalog

Preview everything without footage: `npm run studio`, then compositions **GalleryShort** / **GalleryLong** (every scene and overlay), **StylePreview** (8 frames that show the theme at a glance) and **PostRoll** (the outro).
Text props take any language (use the font's character set). All sizes adapt to 9:16 and 16:9 automatically. Colours, font, box style and backdrops come from the brand theme (style-guide.md).
Code: `src/components/scenes/index.tsx` (full-frame) and `src/components/overlays/index.tsx` (on top of the face).

## Scenes: full-frame cutaways

Used as `{"type": "scene", "scene": "<Name>", "props": {...}}` in `cuts[]`. `tone` is `secondary` (the deep brand colour, with the theme's secondary backdrop) | `paper` | `primary` (the accent colour as a field) | `dark`.
Captions stay on over scenes (scenes keep the caption band clear); set `"captions": false` on a cut only for a deliberate silent moment.

| Scene | Use when the speaker… | Props (★ = required) | Good length |
|---|---|---|---|
| `BigNumber` | says one striking number | ★`value` (number), `prefix`, `suffix` (" €", "×", " %"), `label`, `decimals`, `from`, `tone` | 1.5–2.5 s |
| `KineticTitle` | states the core claim | ★`text` (≤ 7 words), `highlight` (array of words to box), `tone` (default primary) | 2–3 s |
| `Versus` | compares two things | ★`left` / ★`right` = `{label, value?, image?}`, `title`, `tone` | 2.5–3.5 s |
| `BarChart` | compares 2–5 quantities | ★`bars` = `[{label, value}]`, `title`, `unit`, `highlight` (index), `tone` | 3–4 s |
| `ListScene` | enumerates 2–5 items | ★`items` (strings ≤ 3 words), `title`, `tone` (default primary) | 2.5–4 s |
| `ProductShowcase` | names a product (hero moment) | ★`image`, ★`name`, `detail`, `price`, `tone` | 2–3 s |
| `QuoteCard` | quotes someone | ★`quote` (≤ 90 chars), `author`, `tone` (default dark) | 3–4 s |
| `ChapterCard` | (long form) starts a new topic | ★`title`, `number`, `tone`, `sound` (optional audio file) | 2.5 s |
| `LogoSting` | logo reveal: your logo (or brand name) drops in, optional tagline | `text` (overrides the logo/name), `tagline` (default: brand tagline), `tone`, `sound` | 2.5 s |
| `ChatMock` | describes prompting / chatting with an AI | ★`messages` = `[{from: "user"\|"ai", text, instant?}]` (user messages type out, AI shows thinking dots then answers; `instant` = already on screen, for continuing a chat in a later cut), `title` (window name, e.g. "ChatGPT"), `tone` (default secondary), `placeholder` | 2–4 s |
| `FlowDiagram` | explains a chain / cause → effect / process | ★`nodes` (2–4, ≤ 12 chars each), `labels` (text on each arrow), `title`, `highlight` (index, default last), `tone` | 2–3 s |
| `BigQuestion` | raises an open question | ★`text` (the question, ≤ 7 words), `tone` | 2–3 s |

`KineticTitle` also takes `highlightStyle: "box" | "marker"` (marker = a felt-pen swipe behind the word). `ListScene` dims earlier items as each new one lands.

### Schematic build-up scenes (`src/components/scenes/schematics.tsx`)

**Prefer these over text cards.** Each one shows *how* something works in 2–4 steps: an element lands, then connects, then the result appears.
Map the content to a mechanism first ("what would a whiteboard sketch of this sentence look like?"), then pick one.

| Scene | Shows | Props (★ = required) | Good length |
|---|---|---|---|
| `DecisionCard` | an input (message, request) gets checked step by step, then a timer proves speed | ★`input`, `inputLabel`, ★`checks` = `[{q, a, hot?}]` (q ≤ 12 chars), `timer` ("0,4 s"), `instant` (n checks already resolved: continue the card in a later cut), `tone` | 2.5–3.5 s |
| `SortingPipeline` | items stream into a processor and get routed into bins (automation, triage) | ★`box`, ★`bins` (2–3, ≤ 9 chars), `items`, `itemLabel` (emoji), `tone` (secondary) | 3 s |
| `Blockers` | obstacles stack up, get struck through, then the result lands | ★`blockers` (1–3, ≤ 11 chars), ★`result`, `title`, `tone` | 3–3.5 s |
| `GrowthCurve` | an exponential curve draws itself; release dots crowd together | `title`, `label`, `dots`, `tone` (secondary) | 3–4 s |
| `IntervalTimeline` | a vertical timeline where the gaps shrink (things arriving faster) | ★`gaps` (e.g. ["years","months","weeks","days"]), `title`, `start`, `end`, `tone` | 3–4 s |
| `ReleaseRace` | new releases land before the "testing" bar of the previous one fills | ★`interval` ("7–9 days"), `models`, `human`, `tone` | 4–5 s |
| `Outgrow` | a person and an AI column; the column grows past the head ("over their head") | `label`, `human`, `tone` (secondary) | 3.5–4 s |
| `PredictionCard` | a checklist: fulfilled items ticked, the open one pulses with a marker | ★`title`, ★`items` = `[{text, done?}]` (≤ 3 items, ≤ 16 chars), `tone` | 3–4.5 s |
| `Trajectory` | a path from "today" heading to a flagged destination (risk, goal) | ★`to`, `from`, `tone` (dark) | 3–4 s |
| `Gauge` | a needle moving (threat rising, speed slowing) | ★`label`, `from`/`to` (0–1), `low`, `high`, `tone` | 3–3.5 s |

### Media scenes (`src/components/scenes/media.tsx`): the user's own photos and clips, shown unaltered

Paths are inside the project (`assets/…`). Pass `aspect` (width/height of the file) so the card fits. They skip the film look, and a cut with a photo or clip can also carry `"raw": true` (no grain, no tint).

| Scene | Shows | Props (★ = required) | Good length |
|---|---|---|---|
| `PhotoStack` | 2–4 prints tossed onto the table one after another, taped, each with its label | ★`photos` = `[{src, label?, aspect?, fit?}]`, `title`, `aspect`, `tone` | 3–4.5 s |
| `Callouts` | one photo with labelled parts: ring, leader line, label landing one by one | ★`src`, ★`callouts` = `[{x, y, label, dx?, dy?}]` (x, y = 0–1 of the photo), `aspect`, `title`, `tone` | 2.5–4 s |
| `ZoomLens` | a loupe grows on one spot and magnifies it ("look at this detail") | ★`src`, ★`focus` = `{x, y}`, `zoom` (2.6), `label`, `aspect`, `tone` | 3–4 s |
| `ScreenClip` | a product video / screen recording playing in a card with a label | ★`src` (mp4), `trim`, `rate`, `aspect`, `label`, `tone` | 3–5 s |
| `Lineup` | a film strip of product shots; the one in focus grows and gets its label | ★`photos` = `[{src, label, aspect?}]`, `title`, `aspect`, `tone` | 3–4.5 s |

### Object scenes (`src/components/scenes/devices.tsx`): one physical idea drawn in code

| Scene | Shows | Props (★ = required) | Good length |
|---|---|---|---|
| `LockedGrid` | a grid of app tiles: the first ones open, the rest get locked, a stamp lands ("not open yet") | ★`open` (names), `locked` (count), `stamp`, `title`, `tone` | 3.5–4.5 s |
| `SignalBars` | the Wi-Fi symbol drops arc by arc, a stamp lands ("problem") | `label`, `verdict`, `tone` | 3–3.5 s |
| `PortPlug` | a device with a row of ports; a cable clicks into the right one or bounces off a missing socket | ★`device`, ★`ports` = `[{label, ok}]`, ★`plug` (label of the port), `note`, `tone` | 3.5–4.5 s |
| `Thermometer` | a thermometer fills with the accent colour until the label lands ("overheated") | `label`, `verdict`, `tone` | 3.5–4 s |

### Web scenes (`src/components/scenes/web.tsx`)

| Scene | Shows | Props (★ = required) | Good length |
|---|---|---|---|
| `LookAlike` | one website mock-up changes brand (name + colour) every 20 % of the cut while the layout never moves; tags land on the repeated traits, then a stamp ("same site") | `skins` = `[{name, accent}]` (3 defaults), `tags` (≤ 3, default "3 columns", "round corners", "soft shadows"), `stamp`, `tone` (secondary) | 4.5–5 s |

### Story scenes (`src/components/scenes/stories.tsx`)

For news-style statements: who wins, who lags, who overtakes, who plugs in, few vs. everyone.

| Scene | Shows | Props (★ = required) | Good length |
|---|---|---|---|
| `Crowd` | a few highlighted people (big), then the grid fills with everyone ("for the masses", "anyone could") | ★`toLabel`, `fromLabel`, `few`, `tone` (secondary) | 3.5–5 s |
| `Verdict` | winner/loser of the month: 🏆 or 👎 drops, the name lands on a podium, and the reasons tick in | ★`name`, `kind` ("winner"/"loser"), `reasons` (≤ 3, ≤ 18 chars), `title`, `tone` | 3–4 s |
| `RankSwap` | a ranking where the challenger's bar grows and overtakes the leader, then gets the crown | ★`title`, ★`items` (2–4), `challenger` (index), `tone` | 3–4 s |
| `Hub` | an ecosystem opens: the lock springs open, and third parties fly in and plug into the centre | ★`center`, ★`satellites` (3–6, ≤ 9 chars), `caption`, `tone` | 3–4 s |
| `LaggardRace` | lanes on a track: the leaders sprint, the laggard crawls (🐌), and a stamp lands | ★`leaders` (2–3), ★`laggard`, `label`, `tone` (dark) | 4–5 s |

### World scenes (`src/components/scenes/worlds.tsx`)

Familiar objects and places for recurring tech-news moments. Each has its own visual language, so use them to keep consecutive videos from looking alike.

| Scene | Use when the speaker… | Props (★ = required) | Good length |
|---|---|---|---|
| `PhoneNotification` | announces a launch or news; "a notification arrived" | ★`notifications` = `[{app?, title, text?}]` (1–3; newest last), `time`, `tone` | 3–4 s |
| `EventTimeline` | tells a history: "in 2017… then… today" | ★`events` = `[{date, label}]` (2–4), `title`, `highlight` (index, default last) | 3.5–5 s |
| `MoneyFlow` | an investment, a payment or a deal: "Company A invested 13 billion in Company B" | ★`from`, ★`to`, ★`amount`, `prefix`, `suffix`, `decimals`, `label`, `coin` ("€"/"$") | 3–4 s |
| `Balance` | weighs pros and cons: "is it worth it?" | ★`left`/★`right` = `{label, items?}`, `heavier` ("left"/"right"), `title` | 3.5–4.5 s |
| `SearchBar` | "when you google…", people search for X | ★`query`, `results` (≤ 3), `engine` (plain text, no logos) | 3–4 s |
| `PriceTag` | talks about a price or a price change | ★`product`, ★`newPrice`, `oldPrice` (struck out), `note` ("per month") | 2.5–3.5 s |
| `CalendarDate` | names a date: a launch day, a deadline | ★`day`, ★`month`, `label`, `flips` | 2.5–3.5 s |
| `WorldMap` | names countries or regions (US vs China, Europe, Estonia) | ★`pins` = `[{label, place}]` (place: usa, europe, canada, brazil, uk, germany, france, china, japan, korea, india, israel, africa, australia, … (Slovak and Czech names work too)) or `{label, x, y}` (0–1), `connect`, `title` | 3–4 s |
| `LayerStack` | explains layers: chip → model → app, a tech stack | ★`layers` (bottom → top, 2–4), `highlight`, `title` | 3–4 s |
| `BeforeAfter` | an upgrade or improvement: "it took 8 hours, now 8 minutes" | ★`before`/★`after` = `{title, lines?}`, `labels` | 3–4 s |
| `Newspaper` | big news, "officially confirmed" | ★`headline`, `paper`, `sub`, `date`, `stamp` ("Official", "Breaking") | 3–4 s |
| `Battery` | battery life, or anything draining or filling up | ★`to`, `from` (default 100), `label`, `suffix` | 2.5–3.5 s |
| `Terminal` | code, AI agents, developers, "you type a command" | ★`lines` = `[{t: "cmd"\|"out", text}]` (2–4), `title` | 3–4.5 s |
| `Acquisition` | "X buys Y", a merger | ★`buyer`, ★`target`, `price` | 3–3.5 s |
| `SocialPost` | quotes a post by someone | ★`name`, ★`text` (≤ 90 chars), `handle`, `likes`, `reposts` | 3.5–4.5 s |

**Variety across videos:** `validate_plan.py` warns when a scene type was already used in 2 of your last 3 videos, or twice in the same video. Treat it as a cue to pick a different scene for the same idea. Most ideas fit 2–3 scenes: a price change → `PriceTag` / `BeforeAfter` / `BigNumber`; a history → `EventTimeline` / `CalendarDate` / `Newspaper`.

Timing inside scenes is proportional to the cut length, so shorten or lengthen the cut to land the key step on its word.
Keep text short: scene text is set at 70–110 px, so long strings wrap.

## Outro (end card, `plan.postRoll`)

`"postRoll": {"duration": 2.5}`: appended after `plan.duration` (the composition grows by `duration`; the edit and its audio stop at `plan.duration`).
`quick_plan.py` adds it to every short unless the brand's outro style is `none` or the source already ends on its own end card. Everything
defaults to the brand's outro (`brand/brand.json` → `outro`, set up in the onboarding); the plan can override per video:

| key | meaning |
|---|---|
| `duration` | seconds, 0.5–15 (default: `outro.duration`, 2.5) |
| `style` | `logo-card` · `follow-card` · `minimal` · `custom` |
| `cta` | the call to action text |
| `platforms` | `[{"kind": "instagram", "handle": "@me"}, …]`, kinds: youtube, instagram, tiktok, x, linkedin, facebook, spotify, apple, website |
| `sound` | audio file inside the project (e.g. `brand/outro/sound.wav`), or `false` to mute the brand sound |

| Style | Layout |
|---|---|
| `logo-card` | logo drops in (or the brand name in a box) → call-to-action box lands → handle → platform badges pop in one by one |
| `follow-card` | small logo → big call to action → one box per platform with its handle, sliding in from the left |
| `minimal` | the call to action in a box (or the logo) and the handle, nothing else |
| `custom` | your own image or short video (`outro.file`), optionally with the call to action on top |

- Background and colours come from the theme (`outro.tone`, default `secondary`); the platform glyphs are simplified shapes drawn in the component, so no brand files ship with the repo.
- Layout is for 9:16 (content shifted up to clear the bottom platform UI); on 16:9 it scales to fit.
- Code: `src/components/PostRoll.tsx`; preview alone with `npm run studio` → **PostRoll**, or render a still: `npx remotion still src/index.ts PostRoll out/outro.png --frame=45`.
- Don't add an outro to a clip that already ends on an end card baked in by another tool (`layout.outro`); the validator warns.

## Look: texture & imperfection (`plan.look`, `src/components/Look.tsx`)

Every scene is wrapped in `SceneLook` and every b-roll/image in `FootageLook` (see motion-principles B1–B2):
on-twos animation, gate weave + exposure flicker, light chromatic aberration, paper mottling + drifting halftone + grain, vignette.
Defaults come from the theme's `look` (each style preset ships its own: `pulse` is light, `block` and `editorial` are tactile, `clean` is almost clean). Full set: `{"grain": 0.5, "texture": 0.5, "onTwos": true, "jitter": true, "aberration": 1, "vignette": 0.3, "footage": true}`.
Override per plan (`"look": {"texture": 0.3}`) or switch off entirely (`"look": false`). The talking head is never treated.

Helpers for new components: `Marker` (felt-marker swipe behind text), `Scribble` (hand-drawn circle / arrow / underline /
strike with edge boil), `ScreenTreatment` (scan lines + refresh flicker for UI mockups).

## Scene backgrounds (`bg` per cut, `sceneBg` per plan)

Every scene is drawn on a backdrop that takes its colours from the scene's `tone`. Set `"sceneBg": "auto"` on the plan (`quick_plan.py` does this) and the renderer rotates the backdrops across the scene cuts. Each video starts at a different point in the rotation, so consecutive videos don't open on the same background. To pin one scene, set `"bg"` on that cut. The validator warns when every scene still uses the classic background.

| `bg` | Look | Suits |
|---|---|---|
| `classic` | the theme's signature background: hatched slab (`block`), soft drifting shapes (`pulse`), faint rings and crop marks (`clean`), magazine rules (`editorial`) | anything |
| `circuit` | circuit traces with round pads | AI and tech topics |
| `grid` | blueprint graph paper, slow pan, crop marks | explainers, how it works, stacks, diagrams |
| `dots` | halftone dots fading in from two corners | numbers, stats, print feel |
| `rays` | slowly turning sunburst | winners, big reveals, "breaking" moments |
| `rings` | radio-wave rings pulsing from the centre | announcements, notifications, signals |
| `collage` | torn paper scraps in the palette  | titles, opinions, media topics |
| `shapes` | outline shapes drifting at the edges, snapping on twos | questions, lighter topics |
| `split` | diagonal two-tone split with a primary-colour edge line | comparisons, before/after, versus |
| `tape` | two scrolling tape bands with your brand name and tagline | news, episode plugs, CTAs |

Backdrops stay low-contrast behind the content. Keep the busiest ones (`collage`, `tape`) for scenes with little text.

## Cut media (b-roll / image)

`{"type": "broll", "src": "assets/x.mp4", "trim": 1.0, "rate": 1, "motion": "in", "fit": "cover"}`
`{"type": "image", "src": "assets/x.jpg", "motion": "in|out|left|right|none", "fit": "cover|contain"}`
- `tint: "duo" | "primary"` recolours the clip into the brand palette (duotone dark/paper, or dark → the primary colour). Use it to unify mismatched stock or hide a low-quality image.
- `fit: "contain"` places the image whole on the paper background with a hard shadow. Use it for logos, screenshots, packshots and charts.
- `motion` defaults: images `in` (slow push, Ken Burns); b-roll `none`.
- `rate` 0.5–0.8 = slow-mo for calm moments. 1.2–1.5 for energy (the clip must be long enough: validator checks).

## Transitions (per cut, `transition`)

| value | feel | auto SFX |
|---|---|---|
| `cut` | default, cleanest | none |
| `whip` | fast horizontal push with motion blur, energetic | whoosh |
| `slide` | slides up from the bottom | whoosh |
| `zoom` | punches in from 135 % | whoosh |
| `flash` | white flash, a reveal/impact | thud |
| `box` | rectangle opens from the center: the signature reveal, 1–2× per short | whoosh |

## Overlays: on top of the talking head

Used in `overlays[]`: `{"start", "end", "component": "<Name>", "props": {...}}`.
`position` is `top` (default: the band above the head on 9:16) | `upper` | `center` | `lower` | `seam` (split-screen: box bottom sits on the seam between the two speakers).
Captions always render above overlays. Avoid `lower` on shorts (caption band).

| Overlay | Use | Props (★ = required) |
|---|---|---|
| `HookTitle` | first 1–3 s of a short | ★`text` (≤ 6 words), `highlight` (substring drawn white-outlined), `color`, `position` |
| `KeywordPop` | the workhorse: 1–3 words that matter right now | ★`text` (≤ 22 chars), `sub`, `color` (primary/white/dark/paper/secondary), `position`, `align`, `tilt` |
| `StatBadge` | number while the face stays on | ★`value`, `prefix`, `suffix`, `label`, `decimals`, `from`, `position`, `color` |
| `ProductCard` | product mentioned while talking | ★`image`, ★`name`, `detail` (price/spec), `side` (left/right), `position` |
| `ListOverlay` | building list over the face | ★`items`, `title`, `stagger` (frames), `position` |
| `LowerThird` | name + role (guest intro) | ★`name`, `title` |
| `Sticker` | emoji reaction ("🤯" "✅" "❌" "🤔" "🔥") | ★`text`, `x`, `y` (0–1 within safe area), `size` |
| `ProgressBar` | retention bar for the whole short | none (set start 0, end = duration) |
| `CTA` | the last seconds | ★`text`, `sub`, `position` (default center) |

## Face layer

- `zooms[]`: `{"start", "end", "scale": 1.12, "ease": "snap"|"smooth", "x"?, "y"?}`. Snap = jump-cut reframing (use on each return from a cutaway). Smooth = slow push-in (hook, emotional line). Keep scale ≤ 1.2 on 1080p sources (quality).
- `source.focusX/focusY` (0–1): crop center when a 16:9 recording is made vertical. Put focusX on the speaker's face.

## Captions

`captions: {enabled, file: "transcript.json", emphasis: [...], maxWords: 3, style: "outline"|"clean"}` (omit `style` to follow the theme)
- `outline` (the `pulse` / `block` default): heavy white text with a thick outline in the line colour; the spoken word turns the primary colour; `emphasis` words get a primary-colour box.
- `clean` (the `clean` / `editorial` default; always on 16:9): smaller, soft shadow, `emphasis` words still get the box.
- Chunks break on punctuation and pauses > 0.35 s.
