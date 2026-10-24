# Other formats

The skill is built for **vertical clips (9:16, 1080×1920)**: the rhythm rules, safe zones, captions and the no-cover logic all assume a short.
The engine can render other shapes, with limits.

## 16:9 long form (`--format long`)
`python3 scripts/new_project.py <name> <video> --format long` → a 1920×1080 composition with the YouTube title-safe margin.
What changes: no forced 3 s rhythm (cutaways only where they add information: products, places, data, people), captions off by default
(set `captions.enabled: true`; the `clean` caption style is used), cutaways up to 8 s, `LowerThird` on each guest's first appearance,
`ChapterCard` at topic changes, `ProductCard` / `ProductShowcase` whenever a product is named. The outro scales to fit.
Not built: per-shot reframing of multi-camera recordings (a `source.focusTrack` exists for that, set by hand).

## Cropping a landscape source to vertical
`new_project.py` warns when the source is landscape. The renderer crops around the speaker: set `source.focusX` (0–1, the speaker's face
position across the source width). Two people side by side in a wide shot do not fit a vertical frame; cut between them with `source.focusTrack`
(output-time windows with an `x` each) or record vertically.

## Square, 4:5 or other sizes
Add a size to `SIZE` in `src/Root.tsx` and a format name in `src/types.ts` (`Format`) and `src/lib/safe.tsx` (`insetsFor`). Components scale with
`safe.u` and the safe area, so most scenes adapt. Re-check every scene in review.

## Adjusting the look for another use
Everything visual is in the theme (`style-guide.md`). A corporate explainer, a course, a news clip: pick `clean` or `editorial`, set the
brand colours, use `box.style: flat`, lower the `look` values, and keep the scene library: it is not specific to any topic.
