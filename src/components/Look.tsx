/**
 * The film look, tunable per theme and per plan (the editorial preset turns all of it up):
 * - nothing is perfectly clean: film grain + paper texture on graphics (texture > flat colour)
 * - animation "on twos" (12 fps feel on a 24/30 fps timeline) for a tactile, crafted motion
 * - old-cinema imperfections: sub-pixel gate weave (jitter) + exposure flicker
 * - light chromatic aberration + vignette that pulls the eye to the centre
 * - footage homogenization: every b-roll clip gets the SAME grain / aberration / vignette,
 *   so stock from different cameras reads as one film
 * All deterministic (seeded by frame), tunable per plan via plan.look.
 */
import React, {useId} from 'react';
import {AbsoluteFill, Freeze, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {theme} from '../brand';
import type {Look} from '../types';

/** Defaults come from the theme (each style preset ships its own film look); plan.look overrides them. */
export const DEFAULT_LOOK: Required<Look> = {...theme.look};

export const resolveLook = (look?: Look | false): Required<Look> | null => (look === false ? null : {...DEFAULT_LOOK, ...(look ?? {})});

/** Animated film grain (changes every held frame). */
export const Grain: React.FC<{amount: number; step?: number}> = ({amount, step = 2}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const id = useId().replace(/:/g, '');
  if (amount <= 0) return null;
  const seed = Math.floor(frame / step) % 97;
  return (
    <AbsoluteFill style={{pointerEvents: 'none', mixBlendMode: 'overlay', opacity: 0.55 * amount}}>
      <svg width={width} height={height}>
        <filter id={`g${id}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={seed} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#g${id})`} />
      </svg>
    </AbsoluteFill>
  );
};

/** Static paper / print texture: low-frequency mottling + fibres, multiplied in (like a curves-adjusted texture). */
export const PaperTexture: React.FC<{amount: number}> = ({amount}) => {
  const {width, height} = useVideoConfig();
  const id = useId().replace(/:/g, '');
  if (amount <= 0) return null;
  return (
    <AbsoluteFill style={{pointerEvents: 'none', mixBlendMode: 'multiply', opacity: amount}}>
      <svg width={width} height={height}>
        <filter id={`p${id}`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves={4} seed={7} result="mottle" />
          <feTurbulence type="fractalNoise" baseFrequency="0.6 0.04" numOctaves={1} seed={3} result="fibre" />
          <feBlend in="mottle" in2="fibre" mode="multiply" result="mix" />
          <feColorMatrix
            in="mix"
            type="matrix"
            values="0 0 0 0 1   0 0 0 0 0.98   0 0 0 0 0.95   -0.9 0 0 0 0.62"
          />
        </filter>
        <rect width="100%" height="100%" filter={`url(#p${id})`} />
      </svg>
    </AbsoluteFill>
  );
};

/** Mid-frequency lane: halftone dots drifting slowly so they shimmer (moiré) against the pixels. */
export const Halftone: React.FC<{amount: number}> = ({amount}) => {
  const frame = useCurrentFrame();
  const {width} = useVideoConfig();
  if (amount <= 0) return null;
  const cell = Math.round(7 * (width / 1080));
  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        mixBlendMode: 'overlay',
        opacity: 0.35 * amount,
        backgroundImage: `radial-gradient(circle, rgba(0,0,0,0.9) 0 32%, rgba(0,0,0,0) 36%)`,
        backgroundSize: `${cell}px ${cell}px`,
        backgroundPosition: `${frame * 0.15}px ${frame * 0.08}px`,
        transform: 'rotate(15deg) scale(1.3)',
      }}
    />
  );
};

export const Vignette: React.FC<{amount: number}> = ({amount}) =>
  amount > 0 ? (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        background: `radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,${0.55 * amount}) 100%)`,
      }}
    />
  ) : null;

/** Chromatic aberration: red shifted left, blue right, recombined with screen. */
const AberrationFilter: React.FC<{id: string; px: number}> = ({id, px}) => (
  <svg width={0} height={0} style={{position: 'absolute'}}>
    <filter id={id} x="-2%" y="-2%" width="104%" height="104%" colorInterpolationFilters="sRGB">
      <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
      <feOffset in="r" dx={-px} dy={0} result="rs" />
      <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
      <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
      <feOffset in="b" dx={px} dy={0} result="bs" />
      <feBlend in="rs" in2="g" mode="screen" result="rg" />
      <feBlend in="rg" in2="bs" mode="screen" />
    </filter>
  </svg>
);

/** Wraps a motion-graphics scene: on-twos, gate weave, flicker, aberration, texture, grain, vignette. */
export const SceneLook: React.FC<{look: Required<Look>; children: React.ReactNode}> = ({look, children}) => {
  const frame = useCurrentFrame();
  const {width} = useVideoConfig();
  const u = width / 1080;
  const id = `ca${useId().replace(/:/g, '')}`;
  const held = look.onTwos ? Math.floor(frame / 2) * 2 : frame;
  const jx = look.jitter ? (random(`jx${held}`) - 0.5) * 2.4 * u : 0;
  const jy = look.jitter ? (random(`jy${held}`) - 0.5) * 2.4 * u : 0;
  const flicker = look.jitter ? 1 + (random(`fl${held}`) - 0.5) * 0.05 : 1;
  const px = Math.round(look.aberration * 2 * u * 10) / 10;
  return (
    <AbsoluteFill>
      {px > 0 ? <AberrationFilter id={id} px={px} /> : null}
      <AbsoluteFill style={{transform: `translate(${jx}px, ${jy}px) scale(1.004)`, filter: `${px > 0 ? `url(#${id}) ` : ''}brightness(${flicker})`}}>
        {look.onTwos ? <Freeze frame={held}>{children}</Freeze> : children}
      </AbsoluteFill>
      {/* texture lanes: lows (paper mottling) · mids (halftone) · highs (grain) */}
      <PaperTexture amount={look.texture} />
      <Halftone amount={look.texture} />
      <Grain amount={look.grain} />
      <Vignette amount={look.vignette} />
    </AbsoluteFill>
  );
};

/** Footage homogenization for b-roll / images: same grain + aberration + vignette on every clip. */
export const FootageLook: React.FC<{look: Required<Look>; children: React.ReactNode}> = ({look, children}) => {
  const {width} = useVideoConfig();
  const id = `fa${useId().replace(/:/g, '')}`;
  const px = Math.round(look.aberration * 1.5 * (width / 1080) * 10) / 10;
  if (!look.footage) return <>{children}</>;
  return (
    <AbsoluteFill>
      {px > 0 ? <AberrationFilter id={id} px={px} /> : null}
      <AbsoluteFill style={{filter: `${px > 0 ? `url(#${id}) ` : ''}contrast(1.04) saturate(0.92)`}}>{children}</AbsoluteFill>
      <Grain amount={look.grain * 0.8} />
      <Vignette amount={look.vignette} />
    </AbsoluteFill>
  );
};
