import React from 'react';
import {alpha, colors, DEPTH, fonts, hatch, theme} from '../brand';
import {useTone} from '../lib/tone';

export type BoxColor = 'primary' | 'white' | 'dark' | 'paper' | 'secondary';

const FACE: Record<BoxColor, {bg: string; fg: string}> = {
  primary: {bg: colors.primary, fg: colors.onPrimary},
  secondary: {bg: colors.secondary, fg: colors.onSecondary},
  white: {bg: colors.white, fg: colors.line},
  paper: {bg: colors.paper, fg: colors.line},
  dark: {bg: colors.dark, fg: colors.white},
};

const BASE_STROKE = 6; // components size their `stroke` prop against a 6 px baseline

/**
 * The signature element: a face with an outline and a depth effect. The look comes from the theme:
 *  - extrude: a 3D block extruded towards the bottom-right (side face + optionally hatched underside)
 *  - offset:  a rounded card with a hard offset shadow (sticker look)
 *  - soft:    a rounded card with a soft shadow and no outline
 *  - flat:    outline only
 * `extrude` (0–1) animates the depth, so boxes can land flat and then pop out.
 */
export const BrandBox: React.FC<{
  children?: React.ReactNode;
  color?: BoxColor;
  /** depth in px (extrusion or shadow offset) */
  depth?: number;
  extrude?: number;
  stroke?: number;
  padding?: string | number;
  style?: React.CSSProperties;
  faceStyle?: React.CSSProperties;
}> = ({children, color = 'primary', depth = DEPTH, extrude = 1, stroke = BASE_STROKE, padding = '0.18em 0.4em', style, faceStyle}) => {
  const box = theme.box;
  const k = stroke / BASE_STROKE;
  const st = box.stroke * k;
  const radius = box.radius * Math.max(0.35, k);
  // never let a box blend into the background it sits on
  const tone = useTone();
  const effective: BoxColor = tone === 'dark' && color === 'dark' ? 'white' : tone === 'primary' && color === 'primary' ? 'dark' : tone === 'paper' && color === 'paper' ? 'white' : tone === 'secondary' && color === 'secondary' ? 'primary' : color;
  const face = FACE[effective];
  const base: React.CSSProperties = {
    position: 'relative',
    background: face.bg,
    color: face.fg,
    padding,
    fontFamily: fonts.display,
    fontWeight: 800,
    lineHeight: 1.05,
    letterSpacing: '-0.02em',
  };

  if (box.style !== 'extrude') {
    const d = Math.max(0, depth * box.depthScale * extrude);
    const shadow =
      box.style === 'offset'
        ? `${d}px ${d}px 0 ${colors.line}`
        : box.style === 'soft'
          ? `0 ${d * 0.7}px ${d * 2.2}px ${alpha(colors.line, 0.3)}`
          : 'none';
    return (
      <div style={{position: 'relative', display: 'inline-block', ...style}}>
        <div style={{...base, border: st > 0 ? `${st}px solid ${colors.line}` : 'none', borderRadius: radius, boxShadow: shadow, ...faceStyle}}>{children}</div>
      </div>
    );
  }

  const d = Math.max(0, depth * extrude);
  // Skewed faces thin out the borders that end up diagonal; compensate by 1/cos(45°).
  const diag = st * Math.SQRT2;
  return (
    <div style={{position: 'relative', display: 'inline-block', ...style}}>
      {d > 0.5 ? (
        <>
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: '100%',
              width: '100%',
              height: d,
              background: box.hatch ? hatch(Math.max(2, st * 0.5), Math.max(6, st * 1.8)) : colors.primaryDark,
              borderStyle: 'solid',
              borderColor: colors.line,
              borderWidth: `0 ${diag}px ${st}px ${diag}px`,
              transform: 'skewX(45deg)',
              transformOrigin: 'top left',
              boxSizing: 'border-box',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: '100%',
              top: 0,
              width: d,
              height: '100%',
              background: colors.white,
              borderStyle: 'solid',
              borderColor: colors.line,
              borderWidth: `${diag}px ${st}px ${diag}px 0`,
              transform: 'skewY(45deg)',
              transformOrigin: 'top left',
              boxSizing: 'border-box',
            }}
          />
        </>
      ) : null}
      <div style={{...base, border: `${st}px solid ${colors.line}`, ...faceStyle}}>{children}</div>
    </div>
  );
};
