# B-roll, images and product shots

## Pexels (automatic b-roll)

`scripts/pexels.py` reads `PEXELS_API_KEY` from `.env`: the user's own free key from https://www.pexels.com/api/ (onboarding step 2; `python3 scripts/pexels.py check` tests it). Free tier: 200 requests/hour, 20 000/month. Responses are cached for 7 days in `.cache/pexels/`.

- `fill <project>`: for each cut with `type: broll|image`, a `query` and no `src`: searches (portrait for shorts, landscape for long form, then any orientation), skips clips already used in the project and clips shorter than the cut, downloads the smallest MP4 with short side ≥ 1080 px, and sets `src`, `trim`, `credit`, `pexels_id`.
- `search "<query>" [--photos] [--orientation portrait]`: lists candidates with thumbnail links (advanced mode, or when `fill` picked badly).
- `get <project> <id> [--photo]`: downloads an exact clip/photo.

### Writing queries
- English, 2–6 words, **concrete and filmable**: subject + action + framing.
  `"hands typing laptop close up"`, `"data center server racks"`, `"student library laptop"`, `"city traffic night timelapse"`.
- Abstract → concrete: "AI" → `"robot arm factory"` / `"code on screen"`; "money" → `"banknotes counting"`; "privacy" → `"padlock keyboard"`.
- Avoid queries that return people looking at the camera (they compete with the host).
- If `fill` finds nothing, or the result doesn't fit after review, change the query or use a scene instead. Don't force weak b-roll.

## Product images

Pexels has no specific branded products (no particular phone or laptop model). In order of preference:
1. **User-provided** files in `projects/<name>/assets/`. Always ask for them at the advanced level.
2. **Official press / newsroom images** (company newsrooms and press kits). They're made for editorial use. Download them with the user's approval and note the source in `credit`.
3. Generic Pexels photo of the category ("laptop on desk") + a `ProductCard`/`ProductShowcase` naming the product.
4. No image at all: `KeywordPop` with the product name or `BigNumber` with its price.

Display: packshots with transparent/white background → `fit: "contain"` or `ProductShowcase`/`ProductCard`.
Lifestyle photos → `fit: "cover"` with `motion: "in"`.

Never use random images from web search (copyright), and never generate fake "photos" of a real product.

## User footage

- Copy (don't symlink) into `assets/`. Remotion's file server refuses symlinked files.
- iPhone footage is often variable-frame-rate HEVC. If a clip stutters, transcode:
  `ffmpeg -i in.mov -r 30 -c:v libx264 -crf 18 -pix_fmt yuv420p -an assets/out.mp4`.

## Credits

Pexels doesn't require attribution but appreciates it (check their licence page for the current terms). At the end of every job, list `credit` values
so the user can paste them into the description.
