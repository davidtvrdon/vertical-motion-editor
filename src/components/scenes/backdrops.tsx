/**
 * Scene backdrops: the layer behind every full-frame scene. `classic` is the theme's signature background
 * (see SceneBg in common.tsx) and `circuit` draws technical traces; the rest add variety so
 * consecutive videos don't share the same background. All are low-contrast so the scene
 * content stays readable, and all take their colours from the scene's tone.
 * Choose per cut with `cut.bg`, or let `plan.sceneBg: "auto"` rotate them.
 */
import React from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {alpha, colors, fonts, theme} from '../../brand';
import {clamp} from '../../lib/anim';
import type {Backdrop} from '../../types';

export type BackdropColors = {bg: string; fg: string; dark: boolean};

/** Blueprint graph paper: minor + major lines, slow pan, crop marks in the corners. */
const Grid: React.FC<BackdropColors> = ({fg}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const u = Math.min(width, height) / 1080;
  const minor = 40 * u;
  const major = minor * 5;
  const pan = frame * 0.5;
  const mark = 60 * u;
  const corners: [number, number, number, number][] = [
    [40 * u, 40 * u, 1, 1],
    [width - 40 * u, 40 * u, -1, 1],
    [40 * u, height - 40 * u, 1, -1],
    [width - 40 * u, height - 40 * u, -1, -1],
  ];
  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${alpha(fg, 0.1)} ${u}px, transparent ${u}px), linear-gradient(90deg, ${alpha(fg, 0.1)} ${u}px, transparent ${u}px), linear-gradient(${alpha(fg, 0.22)} ${2 * u}px, transparent ${2 * u}px), linear-gradient(90deg, ${alpha(fg, 0.22)} ${2 * u}px, transparent ${2 * u}px)`,
          backgroundSize: `${minor}px ${minor}px, ${minor}px ${minor}px, ${major}px ${major}px, ${major}px ${major}px`,
          backgroundPosition: `${pan}px ${pan * 0.6}px`,
        }}
      />
      <svg width={width} height={height} style={{position: 'absolute', inset: 0}}>
        {corners.map(([x, y, dx, dy], i) => (
          <path key={i} d={`M${x},${y + dy * mark} L${x},${y} L${x + dx * mark},${y}`} fill="none" stroke={alpha(fg, 0.6)} strokeWidth={4 * u} />
        ))}
      </svg>
    </AbsoluteFill>
  );
};

/** Halftone dot field that is dense in two corners and fades toward the centre. */
const Dots: React.FC<BackdropColors> = ({fg, dark}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const u = Math.min(width, height) / 1080;
  const cell = 34 * u;
  const dot = dark ? colors.primary : fg;
  const layer = (pos: string) => (
    <AbsoluteFill
      style={{
        backgroundImage: `radial-gradient(circle, ${alpha(dot, 0.5)} 0 38%, transparent 42%)`,
        backgroundSize: `${cell}px ${cell}px`,
        backgroundPosition: `${frame * 0.2}px ${frame * 0.1}px`,
        WebkitMaskImage: `radial-gradient(circle at ${pos}, black 0%, transparent 58%)`,
        maskImage: `radial-gradient(circle at ${pos}, black 0%, transparent 58%)`,
      }}
    />
  );
  return (
    <AbsoluteFill>
      {layer('100% 100%')}
      {layer('0% 0%')}
    </AbsoluteFill>
  );
};

/** Sunburst: alternating rays turning slowly around a point just above centre. */
const Rays: React.FC<BackdropColors> = ({fg, dark}) => {
  const frame = useCurrentFrame();
  const rot = frame * 0.12;
  const c = alpha(dark ? colors.white : fg, dark ? 0.06 : 0.07);
  return (
    <AbsoluteFill
      style={{
        backgroundImage: `repeating-conic-gradient(from ${rot}deg at 50% 44%, ${c} 0deg 9deg, transparent 9deg 18deg)`,
        WebkitMaskImage: 'radial-gradient(circle at 50% 44%, transparent 8%, black 30%)',
        maskImage: 'radial-gradient(circle at 50% 44%, transparent 8%, black 30%)',
      }}
    />
  );
};

/** Radio-wave rings pulsing out from the centre. */
const Rings: React.FC<BackdropColors> = ({fg}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const u = Math.min(width, height) / 1080;
  const cx = width / 2;
  const cy = height * 0.46;
  const gap = 130 * u;
  const n = Math.ceil(Math.hypot(width, height) / 2 / gap) + 1;
  const off = (frame * 1.6 * u) % gap;
  return (
    <svg width={width} height={height} style={{position: 'absolute', inset: 0}}>
      {Array.from({length: n}, (_, i) => {
        const r = i * gap + off;
        const o = interpolate(r, [0, gap * 2, gap * n], [0, 0.28, 0.06], clamp);
        return <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={fg} strokeWidth={(i % 3 === 0 ? 5 : 2.5) * u} opacity={o} />;
      })}
    </svg>
  );
};

/** Collage: torn paper scraps (jagged polygons) in the palette, drifting on twos. */
const Collage: React.FC<BackdropColors> = ({dark}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const held = Math.floor(frame / 2) * 2;
  const scraps = [
    {x: -0.12, y: 0.02, w: 0.6, h: 0.22, c: dark ? '#2A2A2A' : '#E4DED3', r: -6},
    {x: 0.62, y: 0.08, w: 0.5, h: 0.16, c: colors.primary, r: 8},
    {x: 0.55, y: 0.74, w: 0.62, h: 0.24, c: dark ? '#1C1C1C' : '#E9E4DA', r: -4},
    {x: -0.1, y: 0.8, w: 0.45, h: 0.16, c: dark ? '#333' : '#D9D2C5', r: 5},
    {x: 0.78, y: 0.42, w: 0.3, h: 0.1, c: dark ? colors.primary : colors.white, r: -12},
  ];
  const torn = (w: number, h: number, seed: number) => {
    const pts: string[] = [];
    const steps = 22;
    const edge = (i: number, x: number, y: number, jx: number, jy: number) => pts.push(`${x + (random(`${seed}-${i}x`) - 0.5) * jx},${y + (random(`${seed}-${i}y`) - 0.5) * jy}`);
    for (let i = 0; i <= steps; i++) edge(i, (i / steps) * w, 0, 0, h * 0.08);
    for (let i = 0; i <= steps / 3; i++) edge(100 + i, w, (i / (steps / 3)) * h, w * 0.02, 0);
    for (let i = steps; i >= 0; i--) edge(200 + i, (i / steps) * w, h, 0, h * 0.08);
    for (let i = steps / 3; i >= 0; i--) edge(300 + i, 0, (i / (steps / 3)) * h, w * 0.02, 0);
    return pts.join(' ');
  };
  return (
    <svg width={width} height={height} style={{position: 'absolute', inset: 0}}>
      <defs>
        <filter id="scrapShadow" x="-10%" y="-10%" width="130%" height="140%">
          <feDropShadow dx="0" dy={height * 0.004} stdDeviation={height * 0.004} floodOpacity="0.25" />
        </filter>
      </defs>
      {scraps.map((sc, i) => {
        const w = sc.w * width;
        const h = sc.h * height;
        const dx = Math.sin(held / 40 + i) * width * 0.006;
        const dy = Math.cos(held / 50 + i) * height * 0.004;
        return (
          <g key={i} transform={`translate(${sc.x * width + dx},${sc.y * height + dy}) rotate(${sc.r} ${w / 2} ${h / 2})`} filter="url(#scrapShadow)">
            <polygon points={torn(w, h, i)} fill={sc.c} opacity={0.9} />
          </g>
        );
      })}
    </svg>
  );
};

/** Floating outline shapes (circle, triangle, square, plus, squiggle), snapping on twos. */
const Shapes: React.FC<BackdropColors> = ({fg}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const u = Math.min(width, height) / 1080;
  const held = Math.floor(frame / 2) * 2;
  const kinds = ['circle', 'tri', 'square', 'plus', 'squiggle', 'circle', 'tri', 'plus', 'square', 'squiggle'];
  const sw = 6 * u;
  return (
    <svg width={width} height={height} style={{position: 'absolute', inset: 0}}>
      {kinds.map((k, i) => {
        // keep shapes near the edges so the centre stays clear
        const side = i % 4;
        const along = random(`sa${i}`);
        const x = side === 0 ? width * (0.04 + 0.12 * random(`sx${i}`)) : side === 1 ? width * (0.84 + 0.12 * random(`sx${i}`)) : width * along;
        const y = side === 2 ? height * (0.04 + 0.1 * random(`sy${i}`)) : side === 3 ? height * (0.86 + 0.1 * random(`sy${i}`)) : height * along;
        const size = (50 + random(`ss${i}`) * 60) * u;
        const drift = Math.sin(held / 30 + i * 1.7) * 14 * u;
        const rot = held * (i % 2 ? 0.4 : -0.3) + i * 30;
        const fill = i % 5 === 1 ? colors.primary : 'none';
        const stroke = alpha(fg, 0.45);
        const tr = `translate(${x},${y + drift}) rotate(${rot})`;
        if (k === 'circle') return <circle key={i} transform={tr} r={size / 2} fill={fill} stroke={stroke} strokeWidth={sw} opacity={fill === 'none' ? 1 : 0.8} />;
        if (k === 'square') return <rect key={i} transform={tr} x={-size / 2} y={-size / 2} width={size} height={size} fill={fill} stroke={stroke} strokeWidth={sw} opacity={fill === 'none' ? 1 : 0.8} />;
        if (k === 'tri') return <polygon key={i} transform={tr} points={`0,${-size / 2} ${size / 2},${size / 2} ${-size / 2},${size / 2}`} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" opacity={fill === 'none' ? 1 : 0.8} />;
        if (k === 'plus') return <path key={i} transform={tr} d={`M${-size / 2},0 L${size / 2},0 M0,${-size / 2} L0,${size / 2}`} stroke={stroke} strokeWidth={sw * 1.4} strokeLinecap="round" />;
        return <path key={i} transform={tr} d={`M${-size},0 q${size / 4},${-size / 3} ${size / 2},0 t${size / 2},0 t${size / 2},0 t${size / 2},0`} fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />;
      })}
    </svg>
  );
};

/** Diagonal two-tone split with a red edge line that draws itself in. */
const Split: React.FC<BackdropColors> = ({dark}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const u = Math.min(width, height) / 1080;
  const p = interpolate(frame, [0, 14], [0, 1], clamp);
  const shade = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)';
  // edge from (0, 70%) to (100%, 35%)
  const x1 = 0;
  const y1 = height * 0.72;
  const x2 = width;
  const y2 = height * 0.36;
  return (
    <svg width={width} height={height} style={{position: 'absolute', inset: 0}}>
      <polygon points={`${x1},${y1} ${x2},${y2} ${width},${height} 0,${height}`} fill={shade} />
      <line x1={x1} y1={y1} x2={x1 + (x2 - x1) * p} y2={y1 + (y2 - y1) * p} stroke={colors.primary} strokeWidth={14 * u} />
    </svg>
  );
};

/** Two scrolling tape bands with the brand name across opposite corners: a recurring brand motif. */
const Tape: React.FC<BackdropColors & {text?: string}> = ({dark, text = `${(theme.brand.name || 'NEW EPISODE').toUpperCase()}${theme.brand.tagline ? ` · ${theme.brand.tagline.toUpperCase()}` : ''} · `}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const u = Math.min(width, height) / 1080;
  const bandH = 84 * u;
  const run = text.repeat(12);
  const band = (top: number, rot: number, dir: number, bg: string, fg: string) => (
    <div style={{position: 'absolute', left: -width * 0.25, width: width * 1.5, top, height: bandH, background: bg, transform: `rotate(${rot}deg)`, borderTop: `${5 * u}px solid ${colors.line}`, borderBottom: `${5 * u}px solid ${colors.line}`, overflow: 'hidden', display: 'flex', alignItems: 'center'}}>
      <div style={{whiteSpace: 'nowrap', transform: `translateX(${dir * ((frame * 3 * u) % (width * 0.6)) - width * 0.3}px)`, fontFamily: fonts.display, fontWeight: 900, fontSize: bandH * 0.5, letterSpacing: '0.08em', color: fg}}>{run}</div>
    </div>
  );
  return (
    <AbsoluteFill style={{opacity: 0.92}}>
      {band(height * 0.06, -7, -1, colors.line, colors.primary)}
      {band(height * 0.88, -7, 1, dark ? colors.white : colors.primary, colors.line)}
    </AbsoluteFill>
  );
};

export const BACKDROPS: Record<Exclude<Backdrop, 'classic' | 'circuit'>, React.FC<BackdropColors>> = {
  grid: Grid,
  dots: Dots,
  rays: Rays,
  rings: Rings,
  collage: Collage,
  shapes: Shapes,
  split: Split,
  tape: Tape,
};

/** Rotation used by plan.sceneBg = "auto" (classic/circuit stay in the mix). */
export const AUTO_BACKDROPS: Backdrop[] = ['classic', 'grid', 'rays', 'collage', 'rings', 'dots', 'split', 'shapes', 'tape'];
