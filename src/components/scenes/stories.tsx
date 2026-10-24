/**
 * Story scenes: small worlds for news-style statements (who wins, who lags, who overtakes,
 * who plugs in, few vs. masses). Same build-up rules as schematics.tsx: element lands →
 * interacts → verdict, one focal point at a time, extreme ease in/out.
 */
import React from 'react';
import {Easing, interpolate, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {colors, fonts, glue, hardShadow, edge} from '../../brand';
import {clamp, useSpringIn} from '../../lib/anim';
import {useSafe} from '../../lib/safe';
import {BrandBox} from '../BrandBox';
import {Marker} from '../Marker';
import {Base, Center, Drop, SceneBg, Tone, TONE} from './common';

const EXTREME = Easing.bezier(0.85, 0, 0.15, 1);
const T: React.FC<{size: number; weight?: number; color?: string; children: React.ReactNode; style?: React.CSSProperties}> = ({size, weight = 800, color, children, style}) => (
  <span style={{fontFamily: fonts.display, fontSize: size, fontWeight: weight, color, lineHeight: 1.1, letterSpacing: '-0.01em', ...style}}>{children}</span>
);

/** A simple outlined person glyph (head + shoulders). */
const Person: React.FC<{size: number; fill?: string; stroke?: number}> = ({size, fill = colors.white, stroke = 4}) => (
  <svg width={size} height={size * 1.25} viewBox="0 0 40 50" style={{display: 'block'}}>
    <circle cx="20" cy="13" r="10" fill={fill} stroke={colors.line} strokeWidth={stroke} />
    <path d="M3 49 C3 33 11 27 20 27 C29 27 37 33 37 49 Z" fill={fill} stroke={colors.line} strokeWidth={stroke} strokeLinejoin="round" />
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────────────────────
/**
 * Crowd: a few highlighted people ("the chosen few") → the grid fills up with everyone ("everyone").
 * `fromLabel` shows while it's few, `toLabel` lands when the grid is full.
 */
export const Crowd: React.FC<Base & {fromLabel?: string; toLabel: string; few?: number; tone?: Tone}> = ({fromLabel, toLabel, few = 3, tone = 'secondary', durationInFrames}) => {
  const frame = useCurrentFrame();
  const {width} = useVideoConfig();
  const safe = useSafe();
  const t = TONE[tone];
  const s = (safe.isShort ? 115 : 70) * safe.u;
  const cols = safe.isShort ? 7 : 12;
  const rows = safe.isShort ? 8 : 5;
  const n = cols * rows;
  const cell = Math.min(safe.w / cols, (safe.h * (safe.isShort ? 0.72 : 0.62)) / rows / 1.25);
  const gridW = cell * cols;
  const x0 = (width - gridW) / 2;
  const y0 = safe.y + (safe.h - cell * 1.25 * rows) / 2 + (safe.isShort ? 40 : 70) * safe.u;
  // the few are fixed positions near the middle
  const fewIdx = Array.from({length: few}, (_, i) => Math.floor(n / 2) - Math.floor(few / 2) + i - (i % 2 ? cols : 0));
  const fillStart = durationInFrames * 0.35;
  const fillEnd = durationInFrames * 0.75;
  const toAt = durationInFrames * 0.72;
  // the few start big (the only people who have it), then shrink into the crowd as it fills
  const fewScale = interpolate(frame, [fillStart - 4, fillStart + 8], [2.4, 1], {...clamp, easing: EXTREME});
  return (
    <SceneBg tone={tone}>
      {Array.from({length: n}, (_, i) => {
        const isFew = fewIdx.includes(i);
        const r = random(`crowd${i}`);
        const at = isFew ? 4 + fewIdx.indexOf(i) * 3 : fillStart + r * (fillEnd - fillStart);
        const p = interpolate(frame, [at, at + 5], [0, 1], {...clamp, easing: EXTREME});
        const col = i % cols;
        const row = Math.floor(i / cols);
        return (
          <div key={i} style={{position: 'absolute', left: x0 + col * cell + cell * 0.1, top: y0 + row * cell * 1.25, transform: `scale(${p * (isFew ? fewScale : 1)})`, transformOrigin: '50% 100%', opacity: p, zIndex: isFew ? 2 : 1}}>
            <Person size={cell * 0.8} fill={isFew ? colors.primary : colors.white} stroke={isFew ? 5 : 4} />
          </div>
        );
      })}
      {fromLabel ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: safe.y + 10 * safe.u, display: 'flex', justifyContent: 'center', opacity: interpolate(frame, [toAt - 4, toAt], [1, 0], clamp)}}>
          <Drop>
            {(ex) => (
              <BrandBox color={t.alt} extrude={ex} depth={12 * safe.u}>
                <T size={s * 0.8} weight={900}>{glue(fromLabel)}</T>
              </BrandBox>
            )}
          </Drop>
        </div>
      ) : null}
      <div style={{position: 'absolute', left: 0, right: 0, top: safe.y + 10 * safe.u, display: 'flex', justifyContent: 'center', opacity: interpolate(frame, [toAt, toAt + 4], [0, 1], clamp), transform: `scale(${interpolate(frame, [toAt, toAt + 8], [1.4, 1], {...clamp, easing: EXTREME})})`}}>
        <BrandBox color="primary" depth={18 * safe.u}>
          <T size={s} weight={900}>{glue(toLabel)}</T>
        </BrandBox>
      </div>
    </SceneBg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────────────────────
/**
 * Verdict: "winner / loser of the month" card. A trophy (or a thumbs-down) drops in, the name
 * lands on a podium, then the reasons tick in one by one (earlier ones dim).
 */
export const Verdict: React.FC<Base & {kind?: 'winner' | 'loser'; title?: string; name: string; reasons?: string[]; tone?: Tone}> = ({
  kind = 'winner',
  title,
  name,
  reasons = [],
  tone,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const safe = useSafe();
  const win = kind === 'winner';
  const tn: Tone = tone ?? (win ? 'paper' : 'dark');
  const t = TONE[tn];
  const s = (safe.isShort ? 125 : 72) * safe.u;
  const icon = useSpringIn(2, {damping: 9});
  const nameIn = useSpringIn(8);
  const r0 = durationInFrames * 0.35;
  const step = reasons.length ? (durationInFrames * 0.45) / reasons.length : 0;
  const wobble = win ? 0 : Math.sin(frame / 3) * 4;
  return (
    <SceneBg tone={tn}>
      <Center gap={22}>
        <BrandBox color={win ? 'dark' : 'white'} depth={10 * safe.u}>
          <T size={s * 0.62} weight={900}>{glue(title ?? (win ? 'Winner' : 'Loser'))}</T>
        </BrandBox>
        <div style={{fontSize: s * 2.2, lineHeight: 1, transform: `translateY(${(1 - icon) * -200}px) rotate(${wobble}deg) scale(${0.5 + 0.5 * icon})`}}>{win ? '🏆' : '👎'}</div>
        <div style={{transform: `scale(${0.3 + 0.7 * nameIn})`, opacity: nameIn}}>
          <BrandBox color={win ? 'primary' : 'white'} depth={24 * safe.u}>
            <T size={s * 1.25} weight={900}>{glue(name)}</T>
          </BrandBox>
        </div>
        {/* podium step */}
        <div style={{width: 520 * safe.u, height: 36 * safe.u, background: `repeating-linear-gradient(45deg, ${t.hatch} 0 ${4 * safe.u}px, transparent ${4 * safe.u}px ${13 * safe.u}px)`, border: `${6 * safe.u}px solid ${t.fg}`, marginTop: -10 * safe.u}} />
        <div style={{display: 'flex', flexDirection: 'column', gap: 14 * safe.u, alignSelf: safe.isShort ? 'stretch' : 'center', marginTop: 16 * safe.u}}>
          {reasons.map((r, i) => {
            const at = r0 + i * step;
            const p = interpolate(frame, [at, at + 6], [0, 1], {...clamp, easing: EXTREME});
            const next = i + 1 < reasons.length ? r0 + (i + 1) * step : Infinity;
            const back = Number.isFinite(next) ? interpolate(frame, [next, next + 6], [0, 1], clamp) : 0;
            return (
              <div key={i} style={{display: 'flex', alignItems: 'center', gap: 16 * safe.u, opacity: p * (1 - 0.4 * back), transform: `translateX(${(1 - p) * -80}px)`}}>
                <T size={s * 0.7} weight={900} color={win ? colors.primary : t.fg}>{win ? '✓' : '✗'}</T>
                <T size={s * 0.62} weight={800} color={t.fg} style={{textAlign: 'left'}}>{glue(r)}</T>
              </div>
            );
          })}
        </div>
      </Center>
    </SceneBg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────────────────────
/**
 * RankSwap: a chart ("App Store downloads") where the challenger climbs past the leader.
 * items[0] starts on top; `challenger` (index) overtakes it at ~55 % and gets the crown.
 */
export const RankSwap: React.FC<Base & {title: string; items: string[]; challenger?: number; tone?: Tone}> = ({title, items, challenger = 1, tone = 'secondary', durationInFrames}) => {
  const frame = useCurrentFrame();
  const {width} = useVideoConfig();
  const safe = useSafe();
  const t = TONE[tone];
  const s = (safe.isShort ? 120 : 70) * safe.u;
  const rowH = (safe.isShort ? 210 : 150) * safe.u;
  const top = safe.y + safe.h * 0.32;
  const swap = interpolate(frame, [durationInFrames * 0.42, durationInFrames * 0.62], [0, 1], {...clamp, easing: EXTREME});
  const crown = interpolate(frame, [durationInFrames * 0.64, durationInFrames * 0.7], [0, 1], clamp);
  const barW = (i: number) => {
    // challenger bar grows past the leader
    const base = [0.78, 0.55, 0.4, 0.3][i] ?? 0.25;
    const grow = i === challenger ? interpolate(frame, [durationInFrames * 0.15, durationInFrames * 0.62], [base, 0.92], {...clamp, easing: Easing.inOut(Easing.cubic)}) : base;
    return grow * (safe.w - 40 * safe.u);
  };
  const rank = (i: number) => (i === challenger ? challenger - challenger * swap : i === 0 ? swap : i);
  return (
    <SceneBg tone={tone}>
      <div style={{position: 'absolute', left: 0, right: 0, top: safe.y + 20 * safe.u, display: 'flex', justifyContent: 'center'}}>
        <Drop>
          {(ex) => (
            <BrandBox color="dark" extrude={ex} depth={12 * safe.u}>
              <T size={s * 0.72} weight={900}>{glue(title)}</T>
            </BrandBox>
          )}
        </Drop>
      </div>
      {items.map((it, i) => {
        const inP = interpolate(frame, [3 + i * 3, 9 + i * 3], [0, 1], {...clamp, easing: EXTREME});
        const y = top + rank(i) * rowH;
        const isC = i === challenger;
        return (
          <div key={it} style={{position: 'absolute', left: (width - safe.w) / 2 + 20 * safe.u, top: y, width: barW(i) * inP, height: rowH * 0.78, background: isC ? colors.primary : colors.white, border: edge(6 * safe.u), boxShadow: hardShadow(10 * safe.u), display: 'flex', alignItems: 'center', paddingLeft: 20 * safe.u, overflow: 'visible', whiteSpace: 'nowrap'}}>
            <T size={s * 0.62} weight={900} color={colors.line}>{`${Math.round(rank(i)) + 1}. ${it}`}</T>
            {isC && crown > 0 ? <span style={{position: 'absolute', right: -20 * safe.u, top: -70 * safe.u, fontSize: s * 0.9, transform: `scale(${crown})`}}>👑</span> : null}
          </div>
        );
      })}
      <div style={{position: 'absolute', left: 0, right: 0, top: top + items.length * rowH + 30 * safe.u, textAlign: 'center', color: t.fg, opacity: crown}}>
        <T size={s * 0.6} weight={800} color={t.fg}>{glue(`${items[challenger]} predbehla ${items[0]}`)}</T>
      </div>
    </SceneBg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────────────────────
/**
 * Hub: an ecosystem opens up. The platform sits in the centre as a closed box; the lock
 * springs open, then third-party satellites fly in and plug in with a connector line.
 */
export const Hub: React.FC<Base & {center: string; satellites: string[]; caption?: string; tone?: Tone}> = ({center, satellites, caption, tone = 'paper', durationInFrames}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const safe = useSafe();
  const t = TONE[tone];
  const s = (safe.isShort ? 110 : 64) * safe.u;
  const cx = width / 2;
  const cy = safe.y + safe.h * 0.47;
  const R = Math.min(safe.w * 0.34, 360 * safe.u);
  const open = interpolate(frame, [durationInFrames * 0.12, durationInFrames * 0.22], [0, 1], {...clamp, easing: EXTREME});
  const at = (i: number) => durationInFrames * (0.25 + (0.45 * i) / Math.max(1, satellites.length));
  // even counts sit on the diagonals so no satellite lands level with (and behind) the wide centre box
  const ang = (i: number) => -Math.PI / 2 + (satellites.length % 2 === 0 ? Math.PI / satellites.length : 0) + (i / satellites.length) * Math.PI * 2;
  const RY = R * 1.35;
  return (
    <SceneBg tone={tone}>
      <svg width={width} height={height} style={{position: 'absolute', inset: 0}}>
        {satellites.map((_, i) => {
          const a = ang(i);
          const p = interpolate(frame, [at(i) + 4, at(i) + 8], [0, 1], clamp);
          const x = cx + Math.cos(a) * R;
          const y = cy + Math.sin(a) * RY;
          return <line key={i} x1={cx} y1={cy} x2={cx + (x - cx) * p} y2={cy + (y - cy) * p} stroke={t.fg} strokeWidth={8 * safe.u} strokeDasharray={`${16 * safe.u} ${10 * safe.u}`} />;
        })}
      </svg>
      {satellites.map((sat, i) => {
        const a = ang(i);
        const p = interpolate(frame, [at(i), at(i) + 6], [0, 1], {...clamp, easing: EXTREME});
        const d = R * (1 + 1.2 * (1 - p));
        return (
          <div key={sat} style={{position: 'absolute', left: cx + Math.cos(a) * d, top: cy + Math.sin(a) * d * 1.35, transform: 'translate(-50%,-50%)', opacity: p}}>
            <BrandBox color="white" depth={10 * safe.u} stroke={5 * safe.u} padding="0.12em 0.35em">
              <T size={s * 0.6} weight={900}>{glue(sat)}</T>
            </BrandBox>
          </div>
        );
      })}
      <div style={{position: 'absolute', left: cx, top: cy, transform: 'translate(-50%,-50%)'}}>
        <BrandBox color="primary" depth={22 * safe.u} padding={`${20 * safe.u}px ${34 * safe.u}px`}>
          <T size={s * 1.1} weight={900}>{glue(center)}</T>
        </BrandBox>
        <div style={{position: 'absolute', left: '50%', top: -90 * safe.u, transform: `translateX(-50%) rotate(${open * -25}deg)`, transformOrigin: '70% 100%', fontSize: s * 0.9}}>{open < 0.5 ? '🔒' : '🔓'}</div>
      </div>
      {caption ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: cy + RY + 90 * safe.u, display: 'flex', justifyContent: 'center', opacity: interpolate(frame, [durationInFrames * 0.7, durationInFrames * 0.75], [0, 1], clamp)}}>
          <Marker delay={Math.round(durationInFrames * 0.72)} frames={8}>
            <T size={s * 0.58} weight={900} color={colors.line}>{glue(caption)}</T>
          </Marker>
        </div>
      ) : null}
    </SceneBg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────────────────────
/**
 * LaggardRace: lanes on a track. The leaders sprint ahead; the laggard crawls (a snail pace),
 * falling further behind every second. Optional `label` stamps the laggard at the end.
 */
export const LaggardRace: React.FC<Base & {leaders: string[]; laggard: string; label?: string; tone?: Tone}> = ({leaders, laggard, label, tone = 'dark', durationInFrames}) => {
  const frame = useCurrentFrame();
  const {width} = useVideoConfig();
  const safe = useSafe();
  const t = TONE[tone];
  const s = (safe.isShort ? 110 : 64) * safe.u;
  const lanes = [...leaders, laggard];
  const laneH = (safe.isShort ? 220 : 150) * safe.u;
  const top = safe.y + safe.h * 0.5 - (lanes.length * laneH) / 2;
  const x0 = (width - safe.w) / 2 + 20 * safe.u;
  const x1 = (width + safe.w) / 2 - 20 * safe.u;
  const run = interpolate(frame, [4, durationInFrames * 0.85], [0, 1], {...clamp, easing: Easing.out(Easing.quad)});
  const stamp = interpolate(frame, [durationInFrames * 0.7, durationInFrames * 0.76], [0, 1], {...clamp, easing: EXTREME});
  return (
    <SceneBg tone={tone}>
      {/* finish line */}
      <div style={{position: 'absolute', left: x1 - 14 * safe.u, top: top - 20 * safe.u, width: 18 * safe.u, height: lanes.length * laneH + 20 * safe.u, background: `repeating-linear-gradient(0deg, ${colors.white} 0 ${18 * safe.u}px, ${colors.line} ${18 * safe.u}px ${36 * safe.u}px)`, border: `${3 * safe.u}px solid ${t.fg}`}} />
      {lanes.map((ln, i) => {
        const lag = i === lanes.length - 1;
        const speed = lag ? 0.14 : 0.78 + random(`lane${i}`) * 0.17;
        const bob = lag ? 0 : Math.abs(Math.sin(frame / 2.2 + i)) * 8 * safe.u;
        const x = x0 + (x1 - x0 - 480 * safe.u) * run * speed;
        const y = top + i * laneH;
        return (
          <React.Fragment key={ln}>
            <div style={{position: 'absolute', left: x0, width: x1 - x0, top: y + laneH - 6 * safe.u, height: 4 * safe.u, background: t.fg, opacity: 0.35}} />
            <div style={{position: 'absolute', left: x, top: y + laneH * 0.12 - bob, display: 'flex', alignItems: 'center', gap: 10 * safe.u}}>
              <span style={{fontSize: s * 0.95}}>{lag ? '🐌' : '🏃'}</span>
              <BrandBox color={lag ? 'white' : 'primary'} depth={8 * safe.u} stroke={5 * safe.u} padding="0.1em 0.3em">
                <T size={s * 0.6} weight={900}>{glue(ln)}</T>
              </BrandBox>
            </div>
          </React.Fragment>
        );
      })}
      {label ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: top + lanes.length * laneH + 50 * safe.u, display: 'flex', justifyContent: 'center', opacity: stamp, transform: `scale(${1.6 - 0.6 * stamp}) rotate(-4deg)`}}>
          <BrandBox color="white" depth={16 * safe.u}>
            <T size={s * 1.05} weight={900}>{glue(label)}</T>
          </BrandBox>
        </div>
      ) : null}
    </SceneBg>
  );
};
