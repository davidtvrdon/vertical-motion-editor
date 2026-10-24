import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';
import {theme} from './theme';

/**
 * Visual identity, resolved from the active theme (src/theme/active.json, written by scripts/apply_brand.py
 * from a style preset + brand/brand.json). Components only use the semantic tokens below, so a different
 * brand or preset restyles everything. See .claude/skills/vertical-motion-editor/references/style-guide.md.
 *
 *   primary    the accent: the main box colour, the active caption word, highlights
 *   secondary  the deep brand field: scene background (tone "secondary")
 *   dark       dark scene background and dark boxes
 *   paper      light scene background
 *   line       outlines, hard shadows, text on light surfaces
 */
export const colors = theme.colors;

// Fonts are bundled in public/brand/fonts (downloaded once by apply_brand.py), so renders work offline.
const FAMILY = theme.fonts.family;
for (const f of theme.fonts.files) {
  loadFont({
    family: FAMILY,
    url: staticFile(f.url),
    weight: f.weight,
    ...(f.unicodeRange ? {unicodeRange: f.unicodeRange} : {}),
    format: theme.fonts.format as 'woff2',
  });
}
const fontFamily = `"${FAMILY}", Inter, "Helvetica Neue", Arial, sans-serif`;

export const fonts = {
  display: fontFamily,
  body: fontFamily,
} as const;

export {theme};

/** Thickness of the outline, in px at 1080 short side (0 for the soft style). */
export const STROKE = theme.box.stroke;
/** Default depth of a box's extrusion / offset shadow. */
export const DEPTH = 16;

/** Hatch used on the bottom face of extruded boxes (vertical stripes, skewed by the face). */
export const hatch = (stripe = 3, gap = 11) =>
  `repeating-linear-gradient(90deg, ${colors.line} 0 ${stripe}px, ${colors.white} ${stripe}px ${stripe + gap}px)`;

/** Diagonal hatch for flat surfaces (backgrounds, bars). */
export const hatchDiagonal = (stripe = 3, gap = 14, color: string = colors.line, bg: string = 'transparent') =>
  `repeating-linear-gradient(45deg, ${color} 0 ${stripe}px, ${bg} ${stripe}px ${stripe + gap}px)`;

export const textOutline = (px = 5, color: string = colors.line) => ({
  WebkitTextStroke: `${px}px ${color}`,
  paintOrder: 'stroke fill' as const,
});

/** Keep numbers glued to their units/currency ("$699", "16 h", "8 GB") so they never wrap apart. */
export const glue = (text: string) =>
  text.replace(/(\d) (?=(€|\$|£|%|×|x\b|h\b|GB|TB|MB|k\b|M\b|mil|mld|tis|eur|Kč|min|s\b))/g, '$1 ').replace(/(mil\.|mld\.|tis\.) (?=€)/g, '$1 ');

/** `rgba()` of a #RRGGBB colour. */
export const alpha = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

/** Number / date formatting follows the brand language. */
export const LOCALE = theme.locale;

/** Distance factor for hard shadows: full for the extruded style, lighter for the others. */
const SHADOW_K = theme.box.style === 'extrude' ? 1 : theme.box.depthScale;

/** `box-shadow` for mock UI cards: a hard offset in the line colour, or a soft shadow for the soft style. */
export const hardShadow = (px: number) =>
  theme.box.style === 'soft'
    ? `0 ${px * 0.6}px ${px * 1.8}px ${alpha(colors.line, 0.28)}`
    : `${px * SHADOW_K}px ${px * SHADOW_K}px 0 ${colors.line}`;

/** The same for `filter: drop-shadow(...)` (images with transparency). */
export const dropShadow = (px: number) =>
  theme.box.style === 'soft'
    ? `drop-shadow(0 ${px * 0.6}px ${px * 1.2}px ${alpha(colors.line, 0.3)})`
    : `drop-shadow(${px * SHADOW_K}px ${px * SHADOW_K}px 0 ${colors.line})`;

/** `border` for mock UI cards: outline thickness follows the theme (none for the soft style). */
export const edge = (px: number) => (theme.box.stroke === 0 ? 'none' : `${(px * theme.box.stroke) / 6}px solid ${colors.line}`);

/** Is a #RRGGBB background dark enough that light marks should be drawn on it? */
export const isDarkBg = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] < 0.25;
};
