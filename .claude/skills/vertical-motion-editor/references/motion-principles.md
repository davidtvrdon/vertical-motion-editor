# Motion principles

Working rules for the edit. Part A is the baseline (standard short-form practice). Part B is a list of techniques that make motion
graphics feel crafted rather than computerised; it grows as the user studies their own reference videos
(skill `learn-motion-references`). When B contradicts A, **B wins**, because it comes from the user's chosen teachers.

## A. Baseline

### Go further than the words
- Don't just put the spoken words on screen. **Build scenes**: animated schematics, systems that assemble themselves, little worlds (a chat window that types, a machine that processes input, a map, a timeline that fills in, objects that move and interact).
- Each cutaway should add **information or a metaphor** the words alone don't give: *how* it works, *what* it looks like, *what* changes.
- Prefer multi-step build-ups (element 1 lands, then 2 connects to it, then the result appears) over single title cards. KineticTitle / KeywordPop are seasoning, not the meal.
- When no component fits, build a new one (`extending.md`) instead of falling back to text.

### Say it, show it
- **What is said = what is seen, at the same moment.** A visual that lands on its word builds trust, while one that lands a second late reads as random. Use word timestamps and start visuals 0–3 frames *before* the word's `s`.
- One idea per cutaway. If you need two ideas, you need two cutaways.

### Rhythm (shorts)
- Change something on screen every **~2–3 s**: a cutaway, a reframe (zoom snap), or an overlay entering. Static talking head > 4 s loses viewers.
- Cutaways 1.5–3 s (hard max 5 s). Returning to the face with a **new framing** (1.0 ↔ 1.12 ↔ 1.18) hides the jump and resets attention.
- Vary the rhythm: 2.6 / 3.4 / 2.8 / 3.2 s feels human, 3.0 / 3.0 / 3.0 feels like a machine.
- **The hook is sacred**: the first 2.5 s show the face and a HookTitle that states the payoff or the tension ("A laptop for $699?"). No logo intro on shorts.
- End on the face with the payoff or CTA. Don't cut away in the last ~2 s.

### Layered depth
- Scenes read better with three planes: **background** (colour + the theme's drifting shapes), **midground** (the information: number, list, image), **foreground** accents (a label box, a sticker). Our `SceneBg` + brand boxes already do this, so keep the midground to one focal element.
- Move planes at different speeds (slow bg drift, springy mid, snappy fg) for parallax without 3D.

### Timing & easing (30 fps)
- Entrances 6–10 frames with a spring (slight overshoot). Exits 4–6 frames, ease-in. Nothing lingers after its sentence ends.
- Stagger related elements 4–8 frames apart (title → value → label).
- Counting numbers: finish by ~35 % of on-screen time.
- Hold readable text at least **0.8 s + 0.25 s per word**.

### Text
- ≤ 4 words per overlay (hook ≤ 6). Don't duplicate the captions: overlays **name** the concept, captions **say** the sentence.
- One highlight colour per frame (the primary colour). Never two boxes of equal weight fighting.

### Sound
- Every visual cut that moves (whip / slide / zoom / box) gets a whoosh starting ~4 frames early, kept quiet (70 % of sfxVolume). **Overlays get no sound** by default (a pop/boing on every graphic gets annoying; `audio.overlaySfx` turns it on). Silence is fine between.
- SFX sit well under the voice. If you notice the SFX, it's too loud.

### B-roll
- **Use b-roll whenever you can find a clip that's relevant to what's said.** Search properly, with several concrete queries. A generic clip that only matches the mood reads as filler, so when nothing relevant exists, use a motion graphic instead.
- Literal first ("server" → servers), then metaphorical only if literal doesn't exist ("inflation" → price tags, shopping cart).
- Avoid visible faces looking into camera (competes with the host), watermarks, other brands' logos, text in other languages.
- Prefer motion inside the clip (hands, traffic, screens scrolling) over static shots.

### What to avoid
- Letting the AI "wing it" gives mixed results. **Templates + rules** give consistency, which is why this skill has a fixed component library and levels.
- The fastest improvement loop: find a style you like → recreate it as a component → save as template → reuse (see `extending.md`).
- For shorts cut from a long video: pick **one topic** per short, keep the sentences whole (never cut words), and pace faster than the original.

## B. Learned from the reference library

Techniques collected from motion-design tutorials. What is already built into the engine is marked **[built]**, with the component or plan field;
the rest is a to-do list for new components (`extending.md`). Add your own with the `learn-motion-references` skill.

- **Normalize textures for overlay/soft-light**: desaturate and centre them on 50 % grey, or they shift the colours underneath. White-background textures → darken modes (multiply); black-background → lighten modes (screen). **[built]** PaperTexture multiply, Halftone/Grain overlay on grey noise
- **Texture scale must feel physical.** Most textures are too big: tile them smaller, and judge their scale against a real object (the "quarter trick"). **[built]** halftone cell ≈ 7 px at 1080 wide
- **Authentic scans** (a real magazine texture through a high-pass filter) beat synthetic ones, and slight colour misregistration on text sells print. **[built]** chromatic aberration; scanned textures in not built yet
- **Texture beats flat colour.** A flat solid background reads as a PowerPoint slide. Layer a subtle texture (paper, halftone, grain) over every graphic. **[built]** `SceneLook` in `Look.tsx`, `plan.look.texture`
- **Stack textures in three frequency lanes:** lows (paper mottling / light leaks), mids (halftone), highs (grain / dust). One lane alone looks fake. **[built]** PaperTexture + Halftone + Grain
- **Halftone dots** make an image feel printed and alive. Dark = big dense dots, light = small sparse ones. Blend overlay, strength via curves. **[built]**
- **Moiré:** a fine halftone plus slow camera movement makes the texture "dance" on stills. **[built]** the Halftone drifts slowly
- **Never pure white, never pure black.** Nothing in reality is. Paper is slightly translucent and warm/cool tinted. Pull highlights down ~10 %. **[built]** brand `paper` #F4F1EC / `ink` #111111
- **Gate weave + exposure flicker**, the two imperfections of old film printing, fight the "computerized" look. **[built]** `look.jitter`
- **Animate on twos** (posterize time to 12 fps) for an organic, stop-motion feel. Applies to graphics, not to the talking head. **[built]** `look.onTwos`
- **Soft/sharp tug of war:** a 2 px blur plus an unsharp mask on top gives the ink-bleed and scan artefacts of physical prints. not built yet
- **Print decay / risograph:** roughen edges, letterpress noise, slight ink spread, misregistered colour passes. Use for nostalgic or editorial moments, not everywhere. not built yet

### B2. Footage & photos
- **Vintage TV frame**: placing footage inside an old TV frame (plus RGB split and screen texture) makes it feel intentional and dated. not built yet
- **Light/shadow overlay drifting slowly across a photo** adds depth to flat images. not built yet
- **Gate weave works on stills too.** A tiny position wiggle plus exposure flicker stops a photo reading as a static JPEG. **[built]** apply `SceneLook` jitter; images get the slow push
- **Homogenize the footage.** B-roll from different cameras gets the same grain, aberration, vignette and colour treatment, so everything reads as one film. **[built]** `FootageLook`, `look.footage`
- **Documentary photo stack:** fringe blur at the edges, film dust, a vignette that guides the eye, and a slow zoom so the photo feels filmed. **[built]** vignette + `motion: "in"` on image cuts
- **Tint photos into the palette** (duotone): images from different sources become one collage, and tinting plus halftone hides low-quality images. **[built]** cut `tint: "duo" | "red"`
- **Layered editorial backgrounds** instead of solids: topic images, tinted dark-grey to near-white, low contrast, plus texture. partly built (`SceneBg` + CircuitTraces); photo backgrounds are in not built yet
- **2.5D parallax:** split a photo into fore/mid/background and dolly slowly. not built yet (needs cut-out assets)
- **Screen treatment** for anything that "lives on a screen": scan lines, a slow rolling dark band, a phosphor colour cast, a slight refresh flicker. **[built]** `ScreenTreatment` (used in ChatMock)
- **Animated shadow pattern** (a window/tree shadow drifting, blurred, linear-burn) makes static scenes feel filmed. not built yet

### B3. Motion & cutting
- **Documents and archival pages**: a page turn animated at 8 fps feels hand-animated. not built yet
- **Collage assembly**: cut one image into overlapping fragments with text and shapes woven between them, with texture variance per layer. not built yet
- **Extreme ease curves**: fast acceleration, fast deceleration. They give excitement. **[built]** `EXTREME` bezier in Cutaway and schematics
- **Cut the curve:** cut at the point of highest velocity. Momentum carries across the cut and it disappears. Keep the same direction of motion across it. **[built]** whip/slide/zoom transitions peak at the cut
- **Cut on action:** punch in or out while something is moving (a bar rising, a line drawing). A cut on stillness feels jarring. → rule: put zoom snaps on words where something is animating, never on a frozen frame
- **Smooth, long ease-outs** (1–2 s) for camera moves on stills.
- **Focus hunting:** a rack-focus blur shift sells depth on flat compositions. not built yet
- **Snap jitter, not smooth wiggle.** Collage elements should jump between held positions, not float. **[built]** jitter is held on twos
- **Edge boil:** hand-drawn lines should shimmer slightly every frame (roughen plus turbulent displace with an animated seed). **[built]** `Scribble` reseeds its displacement on twos
- **Tapered pen lines:** trim-path lines with a tapered end, turbulent displace, and a pencil/photocopy edge. **[built]** `Scribble` (round caps + displacement)
- **Ink reveal:** reveal artwork through a spreading ink matte (choker plus roughen edges, animated). Use it for "something being uncovered". not built yet

### B4. Guiding the eye
- **Rebus layouts:** weave images or icons into the text, replacing words and matching their scale and baseline. Ordinary words become visual. not built yet (KineticTitle with inline icons)
- **Map animations:** desaturated map, regions traced and tinted in overlay, a burn-film reveal, texture on top. not built yet (MapScene)
- **The eye goes to the highest contrast first.** For a callout, lower the contrast of everything except the target, optionally with a mechanical click. not built yet (contrast-callout on the face/b-roll)
- **Focus dimming in lists**: earlier items step back when the next one lands, so only one thing is bright. **[built]** ListScene, DecisionCard, Blockers, ReleaseRace
- **Highlighter behind the key words** (a felt-marker swipe in the primary colour). **[built]** `Marker`, `KineticTitle highlightStyle: "marker"`
- **The invisible teacher's hand:** circles, arrows and underlines drawn on at the moment the word is said. **[built]** `Scribble`
- **Radio waves / pulses** mark a location or a callout without extra animation. not built yet
- **Monospaced number counters**, so digits don't jitter while counting. **[built]** BigNumber uses tabular numerals
- **One text animation at a time**, built from presets, so it stays sophisticated rather than busy. → rule: never two animated text elements entering in the same 0.5 s

### B5. Sound
- **Tactile sound design:** paper rustles, felt marker, film-camera snaps, clicks. Sounds you can *feel*, layered low. → keep extremely quiet. A "boing" on every graphic gets annoying, so the default stays whoosh-only (see A. Sound)
- **Build sounds from layers** of textures (wind + ambience + a close detail), not one literal sample.
- **Marimba / educational music bed**: it doesn't compete with the voice, it's emotionally neutral, and it signals "information". Optional `audio.music` at ~0.05–0.07.

### B6. Identity
- **A recurring motif** (colour, pattern, sound) makes the work recognisably yours. For you that's the brand box, the colours, the font and the theme's backdrop: use them in every scene.
- **Save the look as a preset** and reuse it; perfect the effect stack once. **[built]** `plan.look` defaults + the component library
