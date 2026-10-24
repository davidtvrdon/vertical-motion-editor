# Safe zones

Vertical platforms draw UI over the video. Values (px on 1080×1920) live in `src/lib/safe.tsx`
and `scripts/common.py`. They are conservative approximations; the apps change their UI, so re-check
occasionally by rendering with `"debug": {"safeZones": true}` and comparing with a screenshot of a
real post.

| platform | top | bottom | left | right | what's there |
|---|---|---|---|---|---|
| TikTok | 160 | 480 | 60 | 150 | top: Following/For You tabs, search · bottom: caption, handle, sound ticker, nav · right: like/comment/share/profile rail |
| Reels | 220 | 420 | 60 | 140 | top: Reels header, camera · bottom: caption, audio, nav · right: action rail |
| Shorts | 180 | 400 | 60 | 150 | top: search/menu · bottom: title, channel, subscribe · right: action rail |
| **all** (default) | 220 | 480 | 60 | 150 | union of the three: safe everywhere |
| 16:9 long | 60 | 70 | 96 | 96 | classic 5 % title-safe (see other-formats.md) |

## Layout bands on 9:16 (with `all`)

```
   0 ┌──────────────────────┐
     │  platform UI          │
 220 ├──────────────────────┤  ← HookTitle / KeywordPop / StatBadge  (position "top")
     │  OVERLAY BAND         │
~600 │                       │
     │  FACE (keep clear)    │  ← eyes & mouth: never covered
~1150│                       │
     │  CAPTION BAND         │  ← captions sit ~10 % above the bottom inset
1440 ├──────────────────────┤
     │  platform UI          │  ← caption, handle, music, nav
1920 └──────────────────────┘      right 150 px: action rail (avoid for text)
```

- Framing: vertical recordings usually have the eyes around y 600–800. If the face sits lower, the top band gets bigger. If the face is high (tight framing), move overlays to `position: "upper"` only when they don't hit the eyes. Always check the review stills.
- 16:9 sources cropped to 9:16: set `source.focusX` to the speaker (0.3 when they sit left of center). A zoom's `x`/`y` moves the zoom origin toward a point, which helps a little with two people in frame. Per-speaker reframing of a two-shot is done by hand with `source.focusTrack` (see other-formats.md); or record vertically.
- Right edge: nothing important in the last 150 px (like/comment buttons).
