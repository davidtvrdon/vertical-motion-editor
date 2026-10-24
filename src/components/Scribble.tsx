/**
 * Hand-drawn markups ("the invisible teacher's hand"): circles, arrows, underlines and
 * strike-throughs that draw themselves on (trim-path style) with rough, marker-like edges.
 * Use them to tell the viewer where to look first. Coordinates are in px of the output frame.
 */
import React, {useId} from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {colors} from '../brand';
import {clamp} from '../lib/anim';

export type Mark =
  | {kind: 'circle'; x: number; y: number; w: number; h: number}
  | {kind: 'arrow'; from: [number, number]; to: [number, number]; bend?: number}
  | {kind: 'underline' | 'strike'; x: number; y: number; w: number};

const path = (m: Mark): string => {
  if (m.kind === 'circle') {
    // slightly open, overshooting ellipse, like a quick pen loop
    const {x, y, w, h} = m;
    const cx = x + w / 2;
    const cy = y + h / 2;
    const rx = w / 2;
    const ry = h / 2;
    const pts = Array.from({length: 40}, (_, i) => {
      const a = -Math.PI * 0.6 + (i / 39) * Math.PI * 2.15;
      const wob = 1 + Math.sin(i * 1.7) * 0.03;
      return `${cx + Math.cos(a) * rx * wob},${cy + Math.sin(a) * ry * wob}`;
    });
    return `M${pts.join(' L')}`;
  }
  if (m.kind === 'arrow') {
    const [x1, y1] = m.from;
    const [x2, y2] = m.to;
    const bend = m.bend ?? 0.2;
    const mx = (x1 + x2) / 2 - (y2 - y1) * bend;
    const my = (y1 + y2) / 2 + (x2 - x1) * bend;
    const ang = Math.atan2(y2 - my, x2 - mx);
    const hl = Math.hypot(x2 - x1, y2 - y1) * 0.12 + 18;
    const h1 = `${x2 - Math.cos(ang - 0.5) * hl},${y2 - Math.sin(ang - 0.5) * hl}`;
    const h2 = `${x2 - Math.cos(ang + 0.5) * hl},${y2 - Math.sin(ang + 0.5) * hl}`;
    return `M${x1},${y1} Q${mx},${my} ${x2},${y2} M${h1} L${x2},${y2} L${h2}`;
  }
  const yy = m.kind === 'strike' ? m.y : m.y;
  return `M${m.x},${yy + 4} C${m.x + m.w * 0.3},${yy - 6} ${m.x + m.w * 0.7},${yy + 8} ${m.x + m.w},${yy - 2}`;
};

/** Draws `marks` one after another starting at `delay`; each takes `frames`. */
export const Scribble: React.FC<{marks: Mark[]; delay?: number; frames?: number; color?: string; width?: number; boil?: boolean}> = ({
  marks,
  delay = 0,
  frames = 10,
  color = colors.primary,
  width = 12,
  boil = true,
}) => {
  const frame = useCurrentFrame();
  const {width: W, height: H} = useVideoConfig();
  const id = `s${useId().replace(/:/g, '')}`;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <svg width={W} height={H}>
        <filter id={id}>
          {/* edge boil: new noise seed every 2 frames, so the line shimmers like hand-drawn frames */}
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves={2} seed={boil ? Math.floor(frame / 2) % 50 : 4} />
          <feDisplacementMap in="SourceGraphic" scale={5} />
        </filter>
        {marks.map((m, i) => {
          const start = delay + i * Math.round(frames * 0.8);
          const p = interpolate(frame, [start, start + frames], [0, 1], clamp);
          return (
            <path
              key={i}
              d={path(m)}
              fill="none"
              stroke={color}
              strokeWidth={width * (W / 1080)}
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1}
              strokeDasharray="1 1"
              strokeDashoffset={1 - p}
              filter={`url(#${id})`}
              opacity={p > 0 ? 1 : 0}
            />
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

/**
 * Screen treatment for UI mockups / screenshots (so they don't look pasted on):
 * thin scan lines + a subtle refresh-rate exposure pulse. Wrap the screen content.
 */
export const ScreenTreatment: React.FC<{children: React.ReactNode; lines?: number}> = ({children, lines = 0.18}) => {
  const frame = useCurrentFrame();
  const pulse = 1 + Math.sin(frame * 2.1) * 0.012;
  return (
    <div style={{position: 'relative', filter: `brightness(${pulse})`}}>
      {children}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          mixBlendMode: 'multiply',
          opacity: lines,
          background: `repeating-linear-gradient(0deg, ${colors.line} 0 2px, transparent 2px 6px)`,
        }}
      />
    </div>
  );
};
