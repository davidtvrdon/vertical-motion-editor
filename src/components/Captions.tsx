import React, {useMemo} from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {colors, fonts, textOutline, theme} from '../brand';
import {useSafe} from '../lib/safe';
import type {Cut, Word} from '../types';
import {BrandBox} from './BrandBox';

type Chunk = {words: Word[]; s: number; e: number};

const norm = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

/** Group words into short caption chunks: break on punctuation, pauses, word and char limits. */
export const chunkWords = (words: Word[], maxWords: number, maxChars: number): Chunk[] => {
  const chunks: Chunk[] = [];
  let cur: Word[] = [];
  const flush = () => {
    if (cur.length) chunks.push({words: cur, s: cur[0].s, e: cur[cur.length - 1].e});
    cur = [];
  };
  words.forEach((w, i) => {
    const prev = words[i - 1];
    const chars = cur.reduce((n, x) => n + x.w.length + 1, 0) + w.w.length;
    if (cur.length && (cur.length >= maxWords || chars > maxChars || (prev && w.s - prev.e > 0.35))) flush();
    cur.push(w);
    if (/[.!?,;:…]$/.test(w.w)) flush();
  });
  flush();
  // Hold each chunk until the next one starts (max +0.6s) so captions don't flicker off.
  return chunks.map((c, i) => ({...c, e: Math.min(chunks[i + 1]?.s ?? c.e + 0.6, c.e + 0.6)}));
};

export const Captions: React.FC<{
  words: Word[];
  emphasis?: string[];
  maxWords?: number;
  style?: 'outline' | 'clean';
  cuts?: Cut[];
  /** stretches where two speakers are stacked: captions sit just below the seam instead */
  splitScreen?: {start: number; end: number}[];
  /** branded end card: no captions from here on */
  outro?: number | null;
  /** who talks during split-screen: captions go on the listener's side of the seam */
  speakers?: {start: number; end: number; who: 'top' | 'bottom'}[];
}> = ({words, emphasis = [], maxWords, style, cuts = [], splitScreen = [], outro, speakers = []}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const safe = useSafe();
  const t = frame / fps;
  const mode = style ?? (safe.isShort ? theme.captions.style : 'clean');
  const chunks = useMemo(
    () => chunkWords(words, maxWords ?? (safe.isShort ? 3 : 7), safe.isShort ? 22 : 48),
    [words, maxWords, safe.isShort],
  );
  const emph = useMemo(() => new Set(emphasis.map(norm)), [emphasis]);

  // Captions stay on everywhere (talking head, b-roll and full-screen scenes); scenes keep the
  // caption band clear. Only an explicit `captions: false` on a cut hides them.
  const hidden = cuts.some((c) => t >= c.start && t < c.end && c.captions === false);
  const underCutaway = cuts.some((c) => t >= c.start && t < c.end);
  const chunk = chunks.find((c) => t >= c.s && t < c.e);
  if (!chunk || hidden || (outro != null && t >= outro)) return null;

  const pop = spring({frame: frame - Math.round(chunk.s * fps), fps, config: {damping: 13, stiffness: 220, mass: 0.6}});
  const size = (safe.isShort ? 76 : 46) * safe.u;

  // Short: bottom of the safe area (under the chin on typical framing, above platform UI). Long: bottom.
  const bottom = safe.isShort ? safe.insets.bottom + safe.h * 0.035 : safe.insets.bottom;
  const onSeam = safe.isShort && !underCutaway && splitScreen.some((r) => t >= r.start && t < r.end);
  // never over the speaker: when the bottom person talks, sit just above the seam (in the top half)
  const above = onSeam && speakers.find((x) => t >= x.start && t < x.end)?.who === 'bottom';
  const seamPos = above ? {bottom: safe.height / 2 + 14 * safe.u} : {top: safe.height / 2 + 14 * safe.u};

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute',
          left: safe.insets.left,
          right: safe.insets.right,
          ...(onSeam ? {...seamPos, transform: `scale(${interpolate(pop, [0, 1], [0.85, 1])})`} : {bottom}),
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center',
          gap: `${0.12 * size}px ${0.28 * size}px`,
          ...(onSeam ? {} : {transform: `scale(${interpolate(pop, [0, 1], [0.85, 1])})`}),
          transformOrigin: onSeam && !above ? '50% 0%' : '50% 100%',
        }}
      >
        {chunk.words.map((w, i) => {
          const active = t >= w.s && t < w.e + 0.05;
          const spoken = t >= w.s;
          const isEmph = emph.has(norm(w.w));
          const text = w.w.replace(/[,;:]$/, '');
          if (isEmph && theme.captions.emphasis === 'box' && (mode === 'outline' || safe.isShort)) {
            return (
              <BrandBox key={i} color="primary" depth={10 * safe.u} stroke={5 * safe.u} padding="0.02em 0.22em" style={{marginRight: 10 * safe.u}}>
                <span style={{fontSize: size, fontWeight: 900}}>{text}</span>
              </BrandBox>
            );
          }
          return (
            <span
              key={i}
              style={{
                fontFamily: fonts.display,
                fontWeight: mode === 'outline' ? 900 : 700,
                fontSize: size,
                lineHeight: 1.1,
                letterSpacing: '-0.01em',
                color: mode === 'outline' ? (active ? colors.primary : colors.white) : colors.white,
                opacity: mode === 'clean' || spoken ? 1 : 0.9,
                ...(mode === 'outline'
                  ? textOutline(10 * safe.u)
                  : {textShadow: '0 2px 12px rgba(0,0,0,0.85), 0 0 3px rgba(0,0,0,0.9)'}),
              }}
            >
              {text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
