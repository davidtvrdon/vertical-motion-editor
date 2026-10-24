# brand/

Your brand lives here as `brand/brand.json`. Create it by running the onboarding (ask your AI agent to
"set up my brand", or run `python3 scripts/onboard.py`), or copy `brand.example.json` and edit it.
After any change run `python3 scripts/apply_brand.py`: it builds the theme the renderer reads
(`src/theme/active.json`) and copies your logo, font and outro media into `public/brand/`.

| key | meaning |
|---|---|
| `brandName`, `handle`, `website`, `tagline` | shown in the outro, the logo reveal and some scenes |
| `language` | ISO code of your videos (`en`, `de`, `sk` …): transcription language, number formatting, font subsets |
| `preset` | `pulse` (default), `block`, `clean`, `editorial`: the overall look. Preview them: `node scripts/preview_styles.mjs` |
| `colors` | any of `primary` (accent), `secondary` (deep/field colour), `dark`, `paper`, `line`, `white`, `grey`. Missing ones come from the preset; readable text colours are derived |
| `font` | a Google Fonts family name (downloaded once, then offline) or a path to a `.woff2/.woff/.ttf/.otf` file |
| `logo` | path to a PNG (transparent background) or SVG |
| `watermark` | `{ "corner": "top-left" \| "top-right" \| "bottom-left" \| "bottom-right", "size": 190 }`: a small fixed logo on every short |
| `outro` | `style` `logo-card` \| `follow-card` \| `minimal` \| `custom` \| `none`, `duration`, `cta`, `platforms` (youtube, instagram, tiktok, x, linkedin, facebook, spotify, apple, website), `file` (for `custom`), `sound` |
| `box`, `captions`, `background`, `look` | advanced overrides of the preset (see `src/theme/presets.json` for the keys) |

Secrets do not belong here. The Pexels key goes into `.env` (gitignored).
