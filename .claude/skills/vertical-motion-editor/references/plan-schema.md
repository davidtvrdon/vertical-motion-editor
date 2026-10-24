# plan.json

TypeScript source of truth: `src/types.ts`. Validator: `scripts/validate_plan.py`.
**Times are seconds on the output timeline.** Paths are relative to the project folder
(`source.mp4`, `assets/…`, `brand/…`, `transcript.json`).

```jsonc
{
  "format": "short",                 // "short" 1080x1920 | "long" 1920x1080
  "platform": "all",                 // all | tiktok | reels | shorts | youtube (safe zones)
  "fps": 30,
  "duration": 27.0,                  // output length (s)
  "source": {"src": "source.mp4", "start": 0, "volume": 1, "focusX": 0.5, "focusY": 0.4,
             "focusTrack": [{"start": 22.0, "end": 27.0, "x": 0.24}]},   // optional: per-shot crop for 16:9 sources that cut between angles (x = face centre, 0–1 of source width)
  "captions": {"enabled": true, "file": "transcript.json", "emphasis": ["MacBook", "699", "student"]},   // optional "style": "outline" | "clean" (default: the theme's)
  "zooms": [
    {"start": 0, "end": 2.5, "scale": 1.08, "ease": "smooth"},
    {"start": 4.25, "end": 7.21, "scale": 1.12, "ease": "snap"}
  ],
  "cuts": [
    {"start": 2.5, "end": 4.25, "type": "scene", "scene": "BigNumber",
     "props": {"value": 699, "prefix": "$", "label": "The new laptop"}, "transition": "cut",
     "spoken": "The new one costs 699 dollars."},
    {"start": 7.21, "end": 9.21, "type": "broll", "query": "apple silicon chip macro",
     "src": "assets/pexels-123456.mp4", "trim": 1.0, "transition": "whip",
     "credit": "Video: Jane Doe / Pexels"},
    {"start": 12.65, "end": 14.84, "type": "scene", "scene": "Versus", "transition": "slide",
     "props": {"left": {"label": "Battery", "value": "16 hours"}, "right": {"label": "Memory", "value": "only 8 GB"}}},
    {"start": 22.84, "end": 25.0, "type": "image", "src": "assets/product.png", "fit": "contain", "motion": "in", "raw": true}   // raw: show the media exactly as delivered (no grain/tint)
  ],
  "overlays": [
    {"start": 0.1, "end": 2.4, "component": "HookTitle", "props": {"text": "A laptop for $699?", "highlight": "$699"}},
    {"start": 4.5, "end": 7.1, "component": "KeywordPop", "props": {"text": "Cheapest ever", "sub": "from this brand"}},
    {"start": 9.46, "end": 12.55, "component": "StatBadge", "props": {"value": 16, "suffix": " h", "label": "battery life"}},
    {"start": 25.25, "end": 26.9, "component": "CTA", "props": {"text": "Follow for more", "sub": "link in bio"}}
  ],
  "audio": {
    "autoSfx": true, "sfxVolume": 0.3,
    "music": {"src": "assets/music.mp3", "volume": 0.06},
    "sfx": [{"at": 12.5, "src": "brand/sfx/riser.wav", "volume": 0.3}]
  },
  "logo": {"src": "brand/logo.png", "x": 60, "y": 150, "w": 190, "h": 100},  // watermark: fixed all video long; hidden under scenes and the outro. quick_plan fills it from brand.json → watermark
  "postRoll": {"duration": 2.5},    // the brand's outro appended AFTER `duration` (optional keys: cta, style, platforms, sound). See components.md → Outro
  "sceneBg": "auto",                // rotate scene backgrounds (per cut: "bg": "grid" | "dots" | "rays" | "rings" | "collage" | "shapes" | "split" | "tape" | "classic" | "circuit")
  "look": {"grain": 0.5, "texture": 0.5, "onTwos": true, "jitter": true, "aberration": 1, "vignette": 0.3, "footage": true},  // optional override of the theme's look; false = off
  "layout": {"splitScreen": [{"start": 10.75, "end": 13.25}], "outro": 43.0,   // from detect_layout.py (OpusClip sources)
             "faces": [[0.0, 0.21, 0.29, 0.58, 0.43]],                          // from analyze_faces.py: [t, x, y, w, h] every 0.5 s
             "speakers": [{"start": 10.75, "end": 13.25, "who": "bottom"}],     // from analyze_faces.py: who talks in split-screen
             "hostSwap": [{"start": 0.0, "end": 11.95}]},                       // optional, by hand: the renderer swaps the two halves there, so the same person stays in the upper half (flip `speakers` there too)
  "debug": {"safeZones": false}
}
```

Bookkeeping fields (`spoken`, `query`, `credit`, `note`, `pexels_id`, `pexels_url`) are ignored by the renderer.
Keep them: `spoken` explains the choice, `credit` feeds the credits list.

Rules the validator enforces:
- no `TODO` anywhere · cuts don't overlap · everything within `duration`
- shorts: cutaway ≤ 5 s (warn > 3.5 s for b-roll) · quick level: warn when > 4.6 s on the face
- files exist · b-roll clip ≥ `trim + length × rate` (no freeze frames)
- known scene/overlay/transition/tone names · text length limits · overlay collisions
