import active from './active.json';

/**
 * The active theme: a style preset merged with the user's brand (brand/brand.json).
 * Written by `python3 scripts/apply_brand.py`; never edit active.json by hand.
 */
export type BoxStyle = 'extrude' | 'offset' | 'soft' | 'flat';
export type PlatformKind = 'youtube' | 'instagram' | 'tiktok' | 'x' | 'linkedin' | 'facebook' | 'spotify' | 'apple' | 'website';
export type OutroStyle = 'logo-card' | 'follow-card' | 'minimal' | 'custom' | 'none';
export type SignatureBg = 'slab' | 'blobs' | 'corners' | 'rules';

export type Theme = {
  preset: string;
  label: string;
  colors: {
    primary: string;
    primaryDark: string;
    /** the primary colour darkened until it reads on paper and white (text, thin strokes) */
    accent: string;
    onPrimary: string;
    secondary: string;
    secondaryDark: string;
    onSecondary: string;
    dark: string;
    paper: string;
    line: string;
    white: string;
    grey: string;
  };
  fonts: {
    family: string;
    format: string;
    files: {url: string; weight: string; unicodeRange: string | null}[];
  };
  box: {style: BoxStyle; stroke: number; depthScale: number; radius: number; hatch: boolean};
  captions: {style: 'outline' | 'clean'; emphasis: 'box' | 'color'};
  background: {signature: SignatureBg; secondary: string};
  look: {grain: number; texture: number; onTwos: boolean; jitter: boolean; aberration: number; vignette: number; footage: boolean};
  brand: {name: string; handle: string; website: string; tagline: string};
  language: string;
  locale: string;
  logo: {file: string; w: number; h: number; watermark: {corner?: string; size?: number} | null} | null;
  outro: {
    style: OutroStyle;
    duration: number;
    cta: string;
    tone: 'primary' | 'secondary' | 'dark' | 'paper';
    platforms: {kind: PlatformKind; handle: string}[];
    file: string | null;
    fileKind: 'video' | 'image' | null;
    sound: string | null;
  };
};

export const theme = active as unknown as Theme;
