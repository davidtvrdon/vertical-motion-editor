/**
 * The edit plan ("EDL") is the single contract between Claude and Remotion.
 * Claude writes projects/<name>/plan.json; Remotion renders it.
 * All times are in SECONDS on the OUTPUT timeline. Paths are relative to the
 * project folder (it is used as Remotion's --public-dir).
 */

export type Format = 'short' | 'long';
export type Platform = 'all' | 'tiktok' | 'reels' | 'shorts' | 'youtube';

export type Word = {
  /** the word as spoken */
  w: string;
  /** start (s) */
  s: number;
  /** end (s) */
  e: number;
  speaker?: string;
};

export type Transition = 'cut' | 'whip' | 'zoom' | 'flash' | 'slide' | 'box';

export type Zoom = {
  start: number;
  end: number;
  /** 1 = no zoom. Punch-ins: 1.08–1.2 */
  scale: number;
  /** 'snap' = jump cut feel (instant), 'smooth' = eased push-in over the whole range */
  ease?: 'snap' | 'smooth';
  /** zoom origin, 0–1 of frame. Defaults to source.focusX / focusY */
  x?: number;
  y?: number;
};

export type CutType = 'broll' | 'image' | 'scene';

/** Background behind a full-frame scene (see src/components/scenes/backdrops.tsx). */
export type Backdrop = 'classic' | 'circuit' | 'grid' | 'dots' | 'rays' | 'rings' | 'collage' | 'shapes' | 'split' | 'tape';

export type Cut = {
  start: number;
  end: number;
  type: CutType;
  /** broll: video file, image: image file */
  src?: string;
  /** broll: seconds to skip into the clip */
  trim?: number;
  /** broll playback rate (0.5–2) */
  rate?: number;
  /** image / broll: slow camera move */
  motion?: 'in' | 'out' | 'left' | 'right' | 'none';
  /** image (fit cover): pan across a wide photo from x0 to x1 (0–1 of its width) over the cut, e.g. [0, 0.7] from the
   *  device on the left to the person on the right. Needs motion 'none'. */
  pan?: [number, number];
  /** image / broll: 'cover' fills the frame (photos, footage); 'contain' shows the whole
   *  image on a brand background (logos, screenshots, product packshots, charts) */
  fit?: 'cover' | 'contain';
  /** image / broll: map the picture into the brand palette (collage colour system):
   *  'duo' = dark shadows → paper highlights; 'primary' = dark → the primary colour; hides low-quality stock */
  tint?: 'duo' | 'primary';
  /** scene: name of a full-frame animated scene (see src/components/scenes) */
  scene?: string;
  props?: Record<string, unknown>;
  /** scene: background; omitted = plan.sceneBg rotation (or the classic slab / blue circuit) */
  bg?: Backdrop;
  transition?: Transition;
  /** image / broll / media scenes: show the picture exactly as delivered (no grain, texture, aberration or tint).
   *  Use it for press kits and other media that must not be altered. */
  raw?: boolean;
  /** captions are kept over broll/image and hidden over scenes unless overridden */
  captions?: boolean;
  /** --- bookkeeping, ignored by the renderer --- */
  spoken?: string;
  query?: string;
  credit?: string;
  note?: string;
};

export type Overlay = {
  start: number;
  end: number;
  /** name of an overlay component (see src/components/overlays) */
  component: string;
  props?: Record<string, unknown>;
  note?: string;
};

export type Sfx = {at: number; src: string; volume?: number};

/** Documentary look for graphics and footage (defaults in src/components/Look.tsx). */
export type Look = {
  /** film grain 0–1 (scenes; b-roll gets 80 %) */
  grain?: number;
  /** paper texture on scenes 0–1 */
  texture?: number;
  /** scenes animate on twos (12 fps feel) */
  onTwos?: boolean;
  /** gate weave + exposure flicker on scenes */
  jitter?: boolean;
  /** chromatic aberration strength (1 ≈ 2 px on 1080 wide) */
  aberration?: number;
  /** edge darkening 0–1 */
  vignette?: number;
  /** homogenize b-roll/images with the same grain/aberration/vignette */
  footage?: boolean;
};

export type EditPlan = {
  format: Format;
  platform?: Platform;
  fps?: number;
  /** output length in seconds */
  duration: number;
  source: {
    src: string;
    /** seconds into the source file where the output starts */
    start?: number;
    volume?: number;
    /** crop focus when the source aspect differs from the output (0–1) */
    focusX?: number;
    focusY?: number;
    /**
     * Per-shot crop for 16:9 sources that cut between camera angles (e.g. a side-by-side two-shot).
     * `x` is the speaker's face centre as a fraction of the SOURCE width (0–1). Output-timeline seconds;
     * outside every window `focusX` applies. Switch on the source's camera cuts.
     */
    focusTrack?: {start: number; end: number; x: number}[];
  };
  captions?: {
    enabled: boolean;
    /** JSON file with {words: Word[]} (output of scripts/transcribe.py) */
    file?: string;
    words?: Word[];
    /** words to render with the brand box highlight */
    emphasis?: string[];
    maxWords?: number;
    /** omit to follow the theme: 'outline' (bold, outlined, active word in the primary colour) | 'clean' (soft shadow) */
    style?: 'outline' | 'clean';
  };
  zooms?: Zoom[];
  cuts?: Cut[];
  overlays?: Overlay[];
  audio?: {
    music?: {src: string; volume?: number; start?: number};
    sfx?: Sfx[];
    /** automatically add whoosh on transitions and pop on overlay entries */
    autoSfx?: boolean;
    sfxVolume?: number;
    /** pop on every overlay entry (off by default: the user dislikes it) */
    overlaySfx?: boolean;
  };
  /**
   * Channel logo drawn at a FIXED position/size for the whole video (px on the output frame).
   * Unaffected by zooms; hidden during scene cutaways and on the outro card.
   * Set automatically from brand.json → watermark, or by detect_layout.py when the source had a burned-in logo.
   */
  logo?: {src: string; x: number; y: number; w: number; h?: number};
  /**
   * Outro / end card, appended AFTER `duration`: the composition grows by `postRoll.duration` seconds and the source
   * audio stops at the end of the edit. Omit for none. Everything defaults to the brand's outro (brand.json → outro):
   * `style` logo-card | follow-card | minimal | custom, `cta` the call to action, `platforms` the social badges,
   * `sound` an audio file in the project (e.g. brand/outro/sound.wav).
   */
  postRoll?: {
    duration?: number;
    cta?: string;
    style?: 'logo-card' | 'follow-card' | 'minimal' | 'custom';
    platforms?: {kind: string; handle?: string}[];
    sound?: string | false;
  };
  /** film look (grain, texture, aberration …); omit for the theme's defaults, false to switch off */
  look?: Look | false;
  /** scene backgrounds: 'auto' rotates through all backdrops (different start per video); 'classic' = the theme's signature background */
  sceneBg?: 'auto' | 'classic';
  /** from scripts/detect_layout.py: stacked two-speaker stretches and an end card already burned into the source */
  layout?: {
    splitScreen?: {start: number; end: number}[];
    outro?: number | null;
    /** from analyze_faces.py: [t, x, y, w, h] (0–1, unzoomed source) of the main face every 0.5 s */
    faces?: number[][];
    /** from analyze_faces.py: who is talking during split-screen */
    speakers?: {start: number; end: number; who: 'top' | 'bottom'}[];
    /**
     * Output-time windows of a split-screen where the halves should be swapped (so the same person is always in the
     * upper half). Set by hand, or by your own script; `speakers` must then be flipped for those windows too.
     */
    hostSwap?: {start: number; end: number}[];
  };
  debug?: {safeZones?: boolean; timecode?: boolean};
};
