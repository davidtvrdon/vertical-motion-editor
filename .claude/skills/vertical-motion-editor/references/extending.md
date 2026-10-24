# Extending the library

Also possible: a new **style preset** (see `style-guide.md` → Adding a preset), a new outro style (`src/components/PostRoll.tsx`), a new backdrop (`src/components/scenes/backdrops.tsx`).

The engine gets better by **adding templates**, not by improvising each time.

## Add a scene or overlay
1. Write the component in `src/components/scenes/index.tsx` (full-frame) or `src/components/overlays/index.tsx` (on the face). Rules:
   - signature `React.FC<Base & {...props}>`, where `durationInFrames` is always passed
   - position via `useSafe()` (`safe.x/y/w/h`, `safe.anchorY(pos)`, `safe.u` scale unit), never hard-coded pixels
   - text on `<BrandBox>`, colours from `colors` (semantic tokens; never hex values), outlines/shadows via `edge()` / `hardShadow()` / `dropShadow()`, `glue()` on anything with numbers
   - entrances with `useSpringIn`, exits with `useExit`, following the motion language (style-guide.md)
   - deterministic: no `Math.random()`, no `Date`. Everything is a function of `useCurrentFrame()`.
2. Register it in the `SCENES` / `OVERLAYS` map at the bottom of the file.
3. Add the name to `SCENES` / `OVERLAYS` in `scripts/common.py` (validator).
4. Add sample props to `src/Gallery.tsx` and check it in Studio or with `npx remotion still src/index.ts GalleryShort out.png --frame=N`. Check it under at least two presets (`python3 scripts/apply_brand.py --preset block`, then `clean`) and restore yours afterwards.
5. Document it in `references/components.md` (props + when to use).
6. `npm run typecheck`.

## Recreate a style from a reference video
1. `python3 scripts/ingest_references.py <folder-with-the-clip>` produces contact sheets at 2 fps plus shot-change timestamps.
2. For precise motion, extract a dense burst around the moment: `ffmpeg -ss 12.0 -t 1.5 -i ref.mp4 -vf fps=15,scale=480:-2,tile=5x5 burst.jpg`.
3. Describe it as layers (bg / mid / fg), timings in frames and easing, then build it as a component with the theme tokens (don't copy the reference's branding).
4. Save it as a reusable template (steps above) and note the source in `motion-principles.md` → Part B.

## Ideas not built yet
- Per-speaker reframing for two-shot video (face tracking → `focusX` keyframes)
- Silence / filler-word removal (jump cuts from the transcript) before planning
- Screen-recording zoom-and-pan component for app demos
- Music bed library + ducking under the voice
