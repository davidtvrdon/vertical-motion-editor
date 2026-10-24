/** Shared building blocks for full-frame scenes (backgrounds, layout, entrance). */
import React, {createContext, useContext} from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {alpha, colors, fonts, hatchDiagonal, isDarkBg, theme} from '../../brand';
import {clamp, useSpringIn} from '../../lib/anim';
import {useSafe} from '../../lib/safe';
import {ToneContext} from '../../lib/tone';
import type {Backdrop} from '../../types';
import type {BoxColor} from '../BrandBox';
import {BACKDROPS} from './backdrops';

/** Set by Cutaway from cut.bg (or the plan's auto rotation); read by SceneBg. */
export const BackdropContext = createContext<Backdrop | undefined>(undefined);

export type Base = {durationInFrames: number};
export type Tone = 'paper' | 'primary' | 'dark' | 'secondary';

/** Scene colour sets. `box` / `alt` are the box colours that read best on that background. */
export const TONE: Record<Tone, {bg: string; fg: string; hatch: string; box: BoxColor; alt: BoxColor}> = {
  paper: {bg: colors.paper, fg: colors.line, hatch: alpha(colors.line, 0.9), box: 'primary', alt: 'white'},
  primary: {bg: colors.primary, fg: colors.onPrimary, hatch: alpha(colors.onPrimary, 0.9), box: 'white', alt: 'dark'},
  dark: {bg: colors.dark, fg: colors.white, hatch: 'rgba(255,255,255,0.85)', box: 'primary', alt: 'white'},
  secondary: {bg: colors.secondary, fg: colors.onSecondary, hatch: alpha(colors.onSecondary, 0.85), box: 'primary', alt: 'white'},
};

/**
 * Circuit traces: lines with round pads, radiating from a ring around the center (a technical motif). They draw themselves in over the first ~20 frames.
 */
const CircuitTraces: React.FC<{tone: Tone}> = ({tone}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(width, height) * 0.36;
  const traces = Array.from({length: 18}, (_, i) => {
    const a = (i / 18) * Math.PI * 2 + 0.17;
    const r1 = r * (1.02 + (i % 3) * 0.05);
    const x1 = cx + Math.cos(a) * r1;
    const y1 = cy + Math.sin(a) * r1;
    const leg = r * (0.18 + ((i * 7) % 5) * 0.06);
    const x2 = cx + Math.cos(a) * (r1 + leg);
    const y2 = cy + Math.sin(a) * (r1 + leg);
    // elbow: continue horizontally or vertically, like PCB traces
    const horiz = i % 2 === 0;
    const x3 = horiz ? x2 + Math.sign(Math.cos(a) || 1) * leg * 0.8 : x2;
    const y3 = horiz ? y2 : y2 + Math.sign(Math.sin(a) || 1) * leg * 0.8;
    return {d: `M${x1},${y1} L${x2},${y2} L${x3},${y3}`, x3, y3, len: leg * 1.8};
  });
  const p = interpolate(frame, [0, 20], [0, 1], clamp);
  const sw = Math.min(width, height) / 270;
  return (
    <svg width={width} height={height} style={{position: 'absolute', inset: 0}}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={TONE[tone].fg} strokeOpacity={isDarkBg(TONE[tone].bg) ? 0.3 : 0.7} strokeWidth={sw} strokeDasharray={`${r * 1.4} ${r * 0.25}`} transform={`rotate(${frame * 0.3} ${cx} ${cy})`} />
      {traces.map((t, i) => (
        <g key={i}>
          <path d={t.d} fill="none" stroke={TONE[tone].fg} strokeOpacity={isDarkBg(TONE[tone].bg) ? 0.3 : 0.7} strokeWidth={sw} strokeDasharray={t.len} strokeDashoffset={t.len * (1 - p)} />
          <circle cx={t.x3} cy={t.y3} r={sw * 2.6} fill="none" stroke={TONE[tone].fg} strokeOpacity={isDarkBg(TONE[tone].bg) ? 0.3 : 0.7} strokeWidth={sw} opacity={p > 0.95 ? 1 : 0} />
        </g>
      ))}
    </svg>
  );
};

const onDarkTone = (tone: Tone) => isDarkBg(TONE[tone].bg);

/** extruded themes: a drifting hatched slab and a small square in the corner. */
const SignatureSlab: React.FC<{tone: Tone}> = ({tone}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const t = TONE[tone];
  const slab = Math.max(width, height) * 0.42;
  const edgeColor = tone === 'dark' ? colors.white : colors.line;
  return (
    <>
      <div
        style={{
          position: 'absolute',
          width: slab,
          height: slab,
          right: -slab * 0.35,
          bottom: -slab * 0.35,
          border: `6px solid ${edgeColor}`,
          backgroundImage: hatchDiagonal(4, 18, t.hatch),
          backgroundPosition: `${frame * 0.6}px 0`,
          transform: 'rotate(8deg)',
          opacity: 0.9,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: slab * 0.35,
          height: slab * 0.35,
          left: -slab * 0.12,
          top: height * 0.12,
          border: `6px solid ${edgeColor}`,
          background: tone === 'primary' ? colors.white : colors.primary,
          transform: `rotate(${-10 + frame * 0.05}deg)`,
        }}
      />
    </>
  );
};

/** rounded themes: two flat soft shapes that drift slowly (no outlines). */
const SignatureBlobs: React.FC<{tone: Tone}> = ({tone}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const t = TONE[tone];
  const big = Math.max(width, height) * 0.5;
  const small = big * 0.42;
  const tint = tone === 'primary' ? colors.white : colors.primary;
  return (
    <>
      <div
        style={{
          position: 'absolute',
          width: big,
          height: big,
          right: -big * 0.38 + Math.sin(frame / 55) * 14,
          bottom: -big * 0.3,
          borderRadius: '50%',
          background: alpha(t.fg, onDarkTone(tone) ? 0.07 : 0.06),
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: small,
          height: small,
          left: -small * 0.3,
          top: height * 0.1 + Math.cos(frame / 70) * 12,
          borderRadius: small * 0.28,
          background: alpha(tint, tone === 'paper' ? 0.55 : 0.9),
          transform: `rotate(${-12 + frame * 0.06}deg)`,
        }}
      />
    </>
  );
};

/** minimal themes: two faint rings off the corner plus crop marks. */
const SignatureCorners: React.FC<{tone: Tone}> = ({tone}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const u = Math.min(width, height) / 1080;
  const fg = TONE[tone].fg;
  const r = Math.max(width, height) * 0.36;
  const mark = 54 * u;
  const m = 44 * u;
  return (
    <svg width={width} height={height} style={{position: 'absolute', inset: 0}}>
      {[1, 1.35, 1.7].map((k, i) => (
        <circle key={i} cx={width * 0.98} cy={height * 0.98} r={r * k + Math.sin(frame / 60 + i) * 6 * u} fill="none" stroke={alpha(fg, 0.07 - i * 0.015)} strokeWidth={3 * u} />
      ))}
      {[
        [m, m, 1, 1],
        [width - m, m, -1, 1],
      ].map(([x, y, dx, dy], i) => (
        <path key={i} d={`M${x},${y + dy * mark} L${x},${y} L${x + dx * mark},${y}`} fill="none" stroke={alpha(fg, 0.35)} strokeWidth={3 * u} />
      ))}
    </svg>
  );
};

/** editorial themes: magazine rules top and bottom, brand name in small caps. */
const SignatureRules: React.FC<{tone: Tone}> = ({tone}) => {
  const {width, height} = useVideoConfig();
  const u = Math.min(width, height) / 1080;
  const fg = TONE[tone].fg;
  const x = 64 * u;
  const name = theme.brand.name.toUpperCase();
  return (
    <>
      <svg width={width} height={height} style={{position: 'absolute', inset: 0}}>
        <line x1={x} x2={width - x} y1={height * 0.06} y2={height * 0.06} stroke={alpha(fg, 0.7)} strokeWidth={4 * u} />
        <line x1={x} x2={width - x} y1={height * 0.06 + 10 * u} y2={height * 0.06 + 10 * u} stroke={alpha(fg, 0.7)} strokeWidth={1.5 * u} />
        <line x1={x} x2={width - x} y1={height * 0.94} y2={height * 0.94} stroke={alpha(fg, 0.5)} strokeWidth={1.5 * u} />
      </svg>
      {name ? (
        <div style={{position: 'absolute', left: x, top: height * 0.06 - 52 * u, fontFamily: fonts.display, fontWeight: 700, fontSize: 26 * u, letterSpacing: '0.22em', color: alpha(fg, 0.75)}}>{name}</div>
      ) : null}
    </>
  );
};

const SIGNATURE: Record<string, React.FC<{tone: Tone}>> = {
  slab: SignatureSlab,
  blobs: SignatureBlobs,
  corners: SignatureCorners,
  rules: SignatureRules,
};

/**
 * Scene background: flat tone colour + the theme's backdrop. Without `cut.bg` the `secondary` tone draws the theme's
 * secondary pattern (circuit, grid, dots …) and every other tone draws the theme's signature shapes.
 */
export const SceneBg: React.FC<{tone?: Tone; children?: React.ReactNode}> = ({tone = 'paper', children}) => {
  const t = TONE[tone];
  const bd = useContext(BackdropContext) ?? (tone === 'secondary' ? (theme.background.secondary as Backdrop) : undefined);
  if (bd && bd !== 'classic' && bd !== 'circuit') {
    const Layer = BACKDROPS[bd];
    return (
      <AbsoluteFill style={{background: t.bg, overflow: 'hidden'}}>
        <Layer bg={t.bg} fg={t.fg} dark={onDarkTone(tone)} />
        <ToneContext.Provider value={tone}>{children}</ToneContext.Provider>
      </AbsoluteFill>
    );
  }
  if (bd === 'circuit') {
    return (
      <AbsoluteFill style={{background: t.bg, overflow: 'hidden'}}>
        <CircuitTraces tone={tone} />
        <ToneContext.Provider value={tone}>{children}</ToneContext.Provider>
      </AbsoluteFill>
    );
  }
  const Sig = SIGNATURE[theme.background.signature] ?? SignatureSlab;
  return (
    <AbsoluteFill style={{background: t.bg, overflow: 'hidden'}}>
      <Sig tone={tone} />
      <ToneContext.Provider value={tone}>{children}</ToneContext.Provider>
    </AbsoluteFill>
  );
};

export const Center: React.FC<{children: React.ReactNode; gap?: number}> = ({children, gap = 28}) => {
  const safe = useSafe();
  return (
    <div
      style={{
        position: 'absolute',
        left: safe.x,
        top: safe.y,
        width: safe.w,
        height: safe.h,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: gap * safe.u,
        textAlign: 'center',
      }}
    >
      {children}
    </div>
  );
};

export const Drop: React.FC<{delay?: number; children: (ex: number) => React.ReactNode; from?: 'top' | 'left' | 'right' | 'bottom'}> = ({delay = 0, children, from = 'top'}) => {
  const s = useSpringIn(delay);
  const ex = useSpringIn(delay + 5, {damping: 12});
  const off = (1 - s) * 90;
  const tr = {top: `translateY(${-off}px)`, bottom: `translateY(${off}px)`, left: `translateX(${-off * 3}px)`, right: `translateX(${off * 3}px)`}[from];
  return <div style={{transform: `${tr} scale(${0.85 + 0.15 * s})`, opacity: Math.min(1, s * 2)}}>{children(ex)}</div>;
};

export const fmt = (n: number, decimals: number, locale: string) => n.toLocaleString(locale, {minimumFractionDigits: decimals, maximumFractionDigits: decimals});
