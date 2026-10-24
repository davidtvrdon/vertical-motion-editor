# Style guide: the theme system

Nothing about the look is hard-coded to one brand. Every colour, the font, the box style, the backdrops and the film look come
from the **active theme**: a style *preset* merged with the user's *brand* (`brand/brand.json`). Components only use semantic tokens.

```
src/theme/presets.json  ──┐
brand/brand.json        ──┼─►  python3 scripts/apply_brand.py  ─►  src/theme/active.json  ─►  src/brand.ts  ─►  every component
logo / font / outro media ┘                                        (+ files copied to public/brand/)
```
Change the look → edit `brand/brand.json` (or run `scripts/onboard.py`) → `python3 scripts/apply_brand.py`. Never edit `active.json` by hand.

## Presets (the "visual style" the user picks)

Render a contact sheet of each: `node scripts/preview_styles.mjs` → `out/style-previews/<preset>.jpg`.

| preset | feel | boxes | default font | palette | film look |
|---|---|---|---|---|---|
| **pulse** (default) | bold, modern, creator-pop | rounded cards, hard offset shadow, thin outline | Bricolage Grotesque | lime `#C8F135` · indigo `#3D3BF3` · ink `#0E1117` · paper `#F4F3EE` | light grain, clean footage |
| **block** | neo-brutalist stickers | 3D extruded blocks, thick outline, hatched underside | Archivo | yellow `#FFD60A` · pink `#FF4FA3` · black · cream `#FFF6DC` | tactile: grain, texture, on-twos, gate weave |
| **clean** | calm, minimal, business / education | soft rounded cards, soft shadow, no outline | Inter | blue `#2F6BFF` · pale blue `#DCE6FF` · slate · `#F7F8FA` | almost none |
| **editorial** | magazine / documentary | square-ish cards, small hard shadow, hairline rules | Fraunces (serif) | vermilion `#E4572E` · deep teal `#14303D` · warm paper `#EFE8DA` | heavy: grain, paper texture, on-twos, aberration |

The user's own colours, font, logo and outro are applied on top of whichever preset they choose, so "pulse with my orange" is a normal choice.

## Tokens (`colors` in `src/brand.ts`)

| token | meaning | used for |
|---|---|---|
| `primary` | the accent | main box colour, the active caption word, highlights. One primary thing at a time |
| `primaryDark` | darker accent | extrusion underside (when not hatched) |
| `accent` | primary darkened until it reads on paper/white (derived) | text and thin strokes on light surfaces |
| `onPrimary` | readable text colour on `primary` (derived) | text inside primary boxes |
| `secondary` | the deep (or, for `clean`, pale) brand field | scene background, tone `secondary` |
| `secondaryDark`, `onSecondary` | darker variant, readable text on it (derived) | |
| `dark` | dark scene background and dark boxes | tone `dark` |
| `paper` | light scene background | tone `paper`, packshot backgrounds |
| `line` | outlines, hard shadows, text on light surfaces | everywhere |
| `white`, `grey` | neutrals | |

If the user gives only `primary` and `secondary`, the rest comes from the preset and the derived tokens adapt, so text stays readable.
Use `colors.accent`, not `colors.primary`, for text on paper/white (a lime or yellow primary is unreadable there).

**Scene tones** (`tone` on a scene): `secondary` (draws the theme's secondary backdrop: dots, grid, circuit …), `paper`, `primary` (the accent as a field), `dark`.
Rotate them; never the same tone on two consecutive scenes. A box never matches its background: `BrandBox` swaps `dark` on `dark`, `primary` on `primary` automatically.

## The brand box (`BrandBox`, the signature element)

Face + outline + depth effect, in one of four looks (`box.style`): `extrude` (3D block, optional hatched underside), `offset` (rounded card with
a hard offset shadow), `soft` (rounded card, soft shadow, no outline), `flat` (outline only).
- Every text overlay lives on a box or is outlined/shadowed text (captions). No floating plain text.
- Motion: the box **drops in** (spring with a little overshoot), **lands flat, then the depth grows** (0 → full over ~6 frames).
- Box colours: `primary` (main), `white`/`paper` (secondary lines), `dark` (titles over busy backgrounds, CTA), `secondary`.
- Slight tilt (−3°) on `KeywordPop` gives a sticker feel. Keep titles and numbers straight.
- Mock UI cards inside scenes (phones, windows, calendars) use the same outline and shadow helpers (`edge`, `hardShadow`, `dropShadow` in `brand.ts`), so they follow the theme.

## Type

- The font comes from `brand.json → font`: a Google Fonts family (downloaded once into `public/brand/fonts/`, then offline) or a font file. Inter is bundled.
- Headlines 800–900, tight tracking (`-0.02em`). Body/sub 700. (A font without a heavy weight renders its heaviest.)
- Sentence case. No ALL CAPS paragraphs; one word in caps for emphasis is fine.
- Glue numbers to units with `glue()` (non-breaking space): `$699`, `16 h`, `8 GB`.
- Number formatting follows `brand.json → language` (locale from the language: `en-US`, `de-DE`, `sk-SK` …).
- Check the language's special characters render in review; if the font lacks them, pick another font.

## Motion language

- Enter fast (6–10 frames at 30 fps), hold, exit faster (6 frames). Never fade slowly.
- Springs: damping ~14, stiffness ~180. Bouncy only for stickers/emoji.
- Counting numbers finish by ~35 % of their on-screen time, so the viewer reads the final value.
- Stagger lists 4–14 frames per item.
- Background life: shapes drift slowly. Never animate everything at once.

## Copy (on-screen text)

- Language = the video's language. Pexels queries are English.
- On-screen text ≤ 4 words (hook ≤ 6). It **reinforces**, it doesn't transcribe: the captions already carry the words.
- Tone follows the brand (ask in the onboarding, default: clear, direct, a little dry). No hype words, no clickbait the video doesn't pay off.
- Brand and product names are spelled correctly (fix them in the transcript with `fix_words.py`).
- CTA examples: "Follow for more" · "Full video on YouTube" · "Link in bio" · your site. The outro already carries the handle and platforms, so an on-face CTA can be shorter.

## Sound

- `public/brand/sfx/`: whoosh, pop, click, riser, thud. They are synthesized in code (`scripts/make_sfx.py`), so they're royalty-free. `audio.autoSfx: true` adds **only a whoosh on moving transitions, at 70 % of `sfxVolume`**, and a thud on `flash`. **No pop/"boing" on graphics** by default: `overlaySfx` stays off unless the user asks.
- The outro can carry the user's own sound (`outro.sound`, e.g. a short jingle), faded out over its last frames.
- Music is optional and quiet (0.05–0.1). Never over a hook sentence you want understood.

## Adding a preset

Add an entry to `src/theme/presets.json` (copy one, change `colors`, `font`, `box`, `captions`, `background`, `look`), then
`python3 scripts/apply_brand.py --preset <name>` and `node scripts/preview_styles.mjs <name>`. Box styles: `extrude | offset | soft | flat`;
signature backgrounds: `slab | blobs | corners | rules`; secondary patterns: any backdrop name (`dots`, `grid`, `circuit`, `rays`, …).
