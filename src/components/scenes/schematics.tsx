/**
 * Schematic scenes: small animated systems that SHOW how something works (not the spoken
 * words as text). Each one builds up in steps: element lands → connects → result appears.
 * Motion follows the reference-library rules: extreme ease in/out, one focal point at a time,
 * earlier elements step back when the next one lands.
 */
import React from 'react';
import {Easing, interpolate, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {colors, fonts, glue, edge} from '../../brand';
import {clamp, useSpringIn} from '../../lib/anim';
import {useSafe} from '../../lib/safe';
import {BrandBox} from '../BrandBox';
import {Marker} from '../Marker';
import {Base, Center, Drop, SceneBg, Tone, TONE} from './common';

const EXTREME = Easing.bezier(0.85, 0, 0.15, 1);
const T: React.FC<{size: number; weight?: number; color?: string; children: React.ReactNode; style?: React.CSSProperties}> = ({size, weight = 800, color, children, style}) => (
  <span style={{fontFamily: fonts.display, fontSize: size, fontWeight: weight, color, lineHeight: 1.1, letterSpacing: '-0.01em', ...style}}>{children}</span>
);

/** Time windows for n sequential steps inside [from, to] (fractions of the scene). */
const steps = (n: number, dur: number, from = 0.15, to = 0.85) => {
  const a = dur * from;
  const len = (dur * (to - from)) / Math.max(1, n);
  return Array.from({length: n}, (_, i) => a + i * len);
};

// ─────────────────────────────────────────────────────────────────────────────────────────────
/**
 * DecisionCard: an input (e.g. a customer message) arrives, then each check resolves to an
 * answer, then a timer badge proves the speed. `instant` = checks already resolved at start
 * (continue the same card in a later cutaway).
 */
export const DecisionCard: React.FC<
  Base & {input: string; inputLabel?: string; checks: {q: string; a: string; hot?: boolean}[]; timer?: string; instant?: number; tone?: Tone}
> = ({input, inputLabel = 'New message', checks, timer, instant = 0, tone = 'paper', durationInFrames}) => {
  const frame = useCurrentFrame();
  const safe = useSafe();
  const s = (safe.isShort ? 80 : 54) * safe.u;
  const live = checks.length - instant;
  const at = steps(Math.max(1, live), durationInFrames, instant ? 0.05 : 0.25, timer ? 0.72 : 0.9);
  const timerAt = durationInFrames * 0.76;
  const card = useSpringIn(0);
  return (
    <SceneBg tone={tone}>
      <Center gap={26}>
        <div style={{transform: `translateY(${(1 - card) * -60}px)`, opacity: Math.min(1, card * 2), alignSelf: 'stretch'}}>
          <BrandBox color="white" depth={16 * safe.u} padding={`${26 * safe.u}px ${32 * safe.u}px`} style={{display: 'block'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 14 * safe.u, marginBottom: 8 * safe.u}}>
              <span style={{width: 22 * safe.u, height: 22 * safe.u, borderRadius: '50%', background: colors.primary, border: `${4 * safe.u}px solid black`}} />
              <T size={s * 0.6} weight={700} color={colors.grey}>{inputLabel}</T>
            </div>
            <T size={s * 0.95} weight={700}>„{glue(input)}“</T>
          </BrandBox>
        </div>
        <div style={{display: 'flex', flexDirection: 'column', gap: 18 * safe.u, alignSelf: 'stretch'}}>
          {checks.map((c, i) => {
            const done = i < instant;
            const t0 = done ? -99 : at[i - instant];
            const qIn = done ? 1 : interpolate(frame, [t0, t0 + 6], [0, 1], {...clamp, easing: EXTREME});
            const aIn = done ? 1 : interpolate(frame, [t0 + 8, t0 + 13], [0, 1], {...clamp, easing: EXTREME});
            const scanning = !done && frame >= t0 + 4 && frame < t0 + 8;
            const nextAt = i + 1 < checks.length ? (i + 1 < instant ? -99 : at[i + 1 - instant]) : Infinity;
            const back = Number.isFinite(nextAt) ? interpolate(frame, [nextAt, nextAt + 6], [0, 1], clamp) : 0;
            return (
              <div key={i} style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 * safe.u, opacity: qIn * (1 - 0.45 * back), transform: `translateX(${(1 - qIn) * -80}px)`}}>
                <BrandBox color="paper" depth={8 * safe.u} stroke={5 * safe.u} padding={`${14 * safe.u}px ${20 * safe.u}px`}>
                  <T size={s * 0.72}>{glue(c.q)}</T>
                </BrandBox>
                <div style={{transform: `scale(${0.4 + 0.6 * aIn})`, opacity: aIn, minWidth: 30}}>
                  {scanning ? (
                    <T size={s * 0.8} color={colors.grey}>…</T>
                  ) : (
                    <BrandBox color={c.hot ? 'primary' : 'dark'} depth={10 * safe.u * aIn} stroke={5 * safe.u} padding={`${10 * safe.u}px ${16 * safe.u}px`}>
                      <T size={s * 0.72} weight={900}>{glue(c.a)}</T>
                    </BrandBox>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {timer ? (
          <div style={{opacity: interpolate(frame, [timerAt, timerAt + 5], [0, 1], clamp), transform: `scale(${interpolate(frame, [timerAt, timerAt + 8], [1.6, 1], {...clamp, easing: EXTREME})})`}}>
            <BrandBox color="primary" depth={18 * safe.u}>
              <T size={s * 1.2} weight={900}>⏱ {glue(timer)}</T>
            </BrandBox>
          </div>
        ) : null}
      </Center>
    </SceneBg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────────────────────
/** SortingPipeline: items stream into a processing box and get routed into labelled bins. */
export const SortingPipeline: React.FC<Base & {box: string; bins: string[]; items?: number; itemLabel?: string; tone?: Tone}> = ({
  box,
  bins,
  items = 9,
  itemLabel = '✉',
  tone = 'secondary',
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const safe = useSafe();
  const t = TONE[tone];
  const cx = width / 2;
  const boxY = safe.y + safe.h * 0.3;
  const binY = safe.y + safe.h * 0.6;
  const binW = Math.min(320 * safe.u, (safe.w - 40 * safe.u) / bins.length);
  const binX = (i: number) => cx + (i - (bins.length - 1) / 2) * (binW + 24 * safe.u);
  const s = (safe.isShort ? 72 : 50) * safe.u;
  const boxIn = useSpringIn(0);
  const span = durationInFrames * 0.75;
  const gap = span / items;
  const travel = Math.max(10, gap * 2.2);
  const counts = bins.map(() => 0);
  const flying: React.ReactNode[] = [];
  for (let k = 0; k < items; k++) {
    const t0 = 6 + k * gap;
    const p = (frame - t0) / travel;
    const bin = Math.floor(random(`bin${k}`) * bins.length);
    if (p >= 1) {
      counts[bin]++;
      continue;
    }
    if (p < 0) continue;
    // top → box (first half, accelerating in), box → bin (second half, decelerating out)
    const inBox = p < 0.5;
    const q = inBox ? EXTREME(p * 2) : EXTREME((p - 0.5) * 2);
    const x = inBox ? cx + (random(`x${k}`) - 0.5) * 200 * safe.u * (1 - q) : cx + (binX(bin) - cx) * q;
    const y = inBox ? safe.y + 40 * safe.u + (boxY - safe.y - 40 * safe.u) * q : boxY + (binY - boxY) * q;
    const vis = inBox ? (q > 0.85 ? 0 : 1) : q < 0.1 ? 0 : 1;
    flying.push(
      <div key={k} style={{position: 'absolute', left: x, top: y, transform: 'translate(-50%,-50%)', opacity: vis}}>
        <BrandBox color="white" depth={6 * safe.u} stroke={4 * safe.u} padding={`${4 * safe.u}px ${12 * safe.u}px`}>
          <T size={s * 0.8}>{itemLabel}</T>
        </BrandBox>
      </div>,
    );
  }
  const pulse = 1 + 0.04 * Math.sin(frame / 2.5);
  return (
    <SceneBg tone={tone}>
      {flying}
      <div style={{position: 'absolute', left: cx, top: boxY, transform: `translate(-50%,-50%) scale(${boxIn * pulse})`}}>
        <BrandBox color="primary" depth={30 * safe.u} padding={`${24 * safe.u}px ${60 * safe.u}px`}>
          <T size={s * 2} weight={900}>{glue(box)}</T>
        </BrandBox>
      </div>
      {bins.map((b, i) => {
        const bIn = interpolate(frame, [4 + i * 3, 12 + i * 3], [0, 1], {...clamp, easing: EXTREME});
        return (
          <div key={b} style={{position: 'absolute', left: binX(i), top: binY, width: binW, transform: `translate(-50%, 0) translateY(${(1 - bIn) * 80}px)`, opacity: bIn, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 * safe.u}}>
            <div style={{width: '100%', height: (safe.isShort ? 230 : 150) * safe.u, border: edge(6 * safe.u), borderTop: 'none', background: colors.paper, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 8 * safe.u}}>
              <T size={s * 1.3} weight={900}>{counts[i]}</T>
            </div>
            <BrandBox color="dark" depth={0} stroke={4 * safe.u} padding="0.1em 0.35em">
              <T size={s * 0.62} weight={800} color={colors.white}>{glue(b)}</T>
            </BrandBox>
          </div>
        );
      })}
      <div style={{position: 'absolute', left: 0, right: 0, bottom: safe.insets.bottom + 10 * safe.u, textAlign: 'center', color: t.fg}} />
    </SceneBg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────────────────────
/** Blockers: obstacles stack up, get struck through with a marker one by one, then the result lands. */
export const Blockers: React.FC<Base & {title?: string; blockers: string[]; result: string; tone?: Tone}> = ({title, blockers, result, tone = 'paper', durationInFrames}) => {
  const frame = useCurrentFrame();
  const safe = useSafe();
  const t = TONE[tone];
  const s = (safe.isShort ? 110 : 76) * safe.u;
  const appear = steps(blockers.length, durationInFrames, 0.05, 0.3);
  const strike = steps(blockers.length, durationInFrames, 0.35, 0.65);
  const resAt = durationInFrames * 0.68;
  return (
    <SceneBg tone={tone}>
      <Center gap={24}>
        {title ? (
          <Drop>
            {(ex) => (
              <BrandBox color="dark" extrude={ex} depth={12 * safe.u}>
                <T size={s * 0.7} weight={900}>{glue(title)}</T>
              </BrandBox>
            )}
          </Drop>
        ) : null}
        {blockers.map((b, i) => {
          const p = interpolate(frame, [appear[i], appear[i] + 6], [0, 1], {...clamp, easing: EXTREME});
          const k = interpolate(frame, [strike[i], strike[i] + 6], [0, 1], {...clamp, easing: EXTREME});
          return (
            <div key={b} style={{position: 'relative', opacity: p * (1 - 0.5 * k), transform: `translateY(${(1 - p) * -50}px) rotate(${(i % 2 ? 1 : -1) * 1.5}deg)`}}>
              <BrandBox color="white" depth={14 * safe.u * (1 - k)}>
                <T size={s}>{glue(b)}</T>
              </BrandBox>
              <div style={{position: 'absolute', left: '-6%', top: '46%', height: 12 * safe.u, width: `${112 * k}%`, background: colors.primary, transform: 'rotate(-4deg)', borderRadius: 6 * safe.u}} />
            </div>
          );
        })}
        <div style={{opacity: interpolate(frame, [resAt, resAt + 5], [0, 1], clamp), transform: `scale(${interpolate(frame, [resAt, resAt + 9], [1.5, 1], {...clamp, easing: EXTREME})})`, marginTop: 20 * safe.u}}>
          <BrandBox color="primary" depth={22 * safe.u}>
            <T size={s * 1.05} weight={900} color={t.fg === colors.white ? colors.line : undefined}>✓ {glue(result)}</T>
          </BrandBox>
        </div>
      </Center>
    </SceneBg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────────────────────
/**
 * GrowthCurve: an exponential curve draws itself; release dots bunch closer together as it
 * steepens (intervals shrinking). Optional end label (e.g. "every 7–9 days").
 */
export const GrowthCurve: React.FC<Base & {title?: string; label?: string; dots?: number; tone?: Tone}> = ({title, label, dots = 9, tone = 'secondary', durationInFrames}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const safe = useSafe();
  const t = TONE[tone];
  const s = (safe.isShort ? 100 : 66) * safe.u;
  const x0 = safe.x + 40 * safe.u;
  const x1 = width - safe.insets.right - 30 * safe.u;
  const y0 = safe.y + safe.h * 0.85;
  const y1 = safe.y + safe.h * (safe.isShort ? 0.25 : 0.18);
  const f = (u: number) => (Math.exp(4 * u) - 1) / (Math.exp(4) - 1);
  const P = (u: number) => [x0 + (x1 - x0) * u, y0 - (y0 - y1) * f(u)] as const;
  const draw = interpolate(frame, [4, durationInFrames * 0.7], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const pts = Array.from({length: 60}, (_, i) => P((i / 59) * draw));
  const d = `M${pts.map((p) => `${p[0]},${p[1]}`).join(' L')}`;
  // release dots evenly spaced in *value*, so they crowd together in time as the curve steepens
  const dotU = Array.from({length: dots}, (_, i) => Math.log(1 + ((i + 1) / dots) * (Math.exp(4) - 1)) / 4);
  const sw = 10 * safe.u;
  return (
    <SceneBg tone={tone}>
      <svg width={width} height={height} style={{position: 'absolute', inset: 0}}>
        <line x1={x0} y1={y0} x2={x1} y2={y0} stroke={t.fg} strokeWidth={sw * 0.6} />
        <line x1={x0} y1={y0} x2={x0} y2={y1 - 40 * safe.u} stroke={t.fg} strokeWidth={sw * 0.6} />
        <path d={d} fill="none" stroke={colors.line} strokeWidth={sw * 1.6} strokeLinecap="round" transform={`translate(${6 * safe.u},${6 * safe.u})`} />
        <path d={d} fill="none" stroke={colors.primary} strokeWidth={sw} strokeLinecap="round" />
        {dotU.map((u, i) =>
          u <= draw ? (
            <circle key={i} cx={P(u)[0]} cy={P(u)[1]} r={14 * safe.u} fill={colors.white} stroke={colors.line} strokeWidth={5 * safe.u} />
          ) : null,
        )}
      </svg>
      {title ? (
        <div style={{position: 'absolute', left: safe.x, top: safe.y + 10 * safe.u}}>
          <Drop>
            {(ex) => (
              <BrandBox color="dark" extrude={ex} depth={12 * safe.u}>
                <T size={s * 0.85} weight={900}>{glue(title)}</T>
              </BrandBox>
            )}
          </Drop>
        </div>
      ) : null}
      {label ? (
        <div style={{position: 'absolute', right: safe.insets.right + 10 * safe.u, top: y1 - 150 * safe.u, opacity: interpolate(frame, [durationInFrames * 0.6, durationInFrames * 0.66], [0, 1], clamp)}}>
          <BrandBox color="primary" depth={16 * safe.u}>
            <T size={s * 0.85} weight={900}>{glue(label)}</T>
          </BrandBox>
        </div>
      ) : null}
    </SceneBg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────────────────────
/**
 * ReleaseRace: new models drop on a timeline every interval; under each, a human "testing"
 * bar tries to fill but the next release lands before it finishes.
 */
export const ReleaseRace: React.FC<Base & {models?: string[]; interval: string; human?: string; tone?: Tone}> = ({
  models = ['Model A', 'Model B', 'Model C', 'Model D'],
  interval,
  human = 'Testujeme…',
  tone = 'paper',
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const safe = useSafe();
  const s = (safe.isShort ? 100 : 64) * safe.u;
  const at = steps(models.length, durationInFrames, 0.05, 0.85);
  const slot = at[1] - at[0];
  return (
    <SceneBg tone={tone}>
      <Center gap={22}>
        <BrandBox color="dark" depth={10 * safe.u}>
          <T size={s * 0.9} weight={900}>{glue(`A new model every ${interval}`)}</T>
        </BrandBox>
        {models.map((m, i) => {
          const p = interpolate(frame, [at[i], at[i] + 6], [0, 1], {...clamp, easing: EXTREME});
          const test = interpolate(frame, [at[i] + 6, at[i] + slot * 1.7], [0, 1], clamp);
          const cut = i < models.length - 1 && frame >= at[i + 1];
          const fill = cut ? Math.min(test, interpolate(at[i + 1], [at[i] + 6, at[i] + slot * 1.7], [0, 1], clamp)) : test;
          return (
            <div key={m} style={{alignSelf: 'stretch', display: 'flex', alignItems: 'center', gap: 18 * safe.u, opacity: p * (cut ? 0.55 : 1), transform: `translateX(${(1 - p) * 120}px)`}}>
              <BrandBox color={cut ? 'white' : 'primary'} depth={10 * safe.u * p} stroke={5 * safe.u} padding="0.12em 0.35em">
                <T size={s * 0.85} weight={900}>{glue(m)}</T>
              </BrandBox>
              <div style={{flex: 1, height: 70 * safe.u, border: edge(6 * safe.u), background: colors.white, position: 'relative'}}>
                <div style={{position: 'absolute', inset: 0, width: `${fill * 100}%`, background: `repeating-linear-gradient(45deg, ${colors.line} 0 ${5 * safe.u}px, ${colors.white} ${5 * safe.u}px ${14 * safe.u}px)`}} />
                <span style={{position: 'absolute', left: 12 * safe.u, top: '50%', transform: 'translateY(-50%)', fontFamily: fonts.body, fontWeight: 800, fontSize: s * 0.5, background: colors.white, padding: `0 ${6 * safe.u}px`}}>
                  {cut ? 'nestihli sme' : human}
                </span>
              </div>
            </div>
          );
        })}
      </Center>
    </SceneBg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────────────────────
/** Outgrow: a person and a column side by side; the column (AI) grows past the head and off-frame. */
export const Outgrow: React.FC<Base & {label?: string; human?: string; tone?: Tone}> = ({label = 'AI', human = 'my', tone = 'secondary', durationInFrames}) => {
  const frame = useCurrentFrame();
  const {height} = useVideoConfig();
  const safe = useSafe();
  const t = TONE[tone];
  const ground = safe.y + safe.h * 0.9;
  const personH = (safe.isShort ? 560 : 420) * safe.u;
  const g = interpolate(frame, [4, durationInFrames * 0.8], [0.15, 1.9], {...clamp, easing: Easing.in(Easing.cubic)});
  const colH = personH * g;
  const s = (safe.isShort ? 76 : 56) * safe.u;
  const pIn = useSpringIn(0);
  const passed = colH > personH * 1.05;
  return (
    <SceneBg tone={tone}>
      <div style={{position: 'absolute', left: 0, right: 0, top: ground, height: 8 * safe.u, background: t.fg}} />
      {/* person: head + body, outlined */}
      <div style={{position: 'absolute', left: `calc(50% - ${260 * safe.u}px)`, top: ground - personH * pIn, width: 220 * safe.u, height: personH, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        <div style={{width: 130 * safe.u, height: 130 * safe.u, borderRadius: '50%', background: colors.white, border: edge(7 * safe.u)}} />
        <div style={{marginTop: 12 * safe.u, width: 220 * safe.u, flex: 1, borderRadius: `${110 * safe.u}px ${110 * safe.u}px 0 0`, background: colors.white, border: edge(7 * safe.u), borderBottom: 'none'}} />
        <div style={{marginTop: 16 * safe.u}}>
          <BrandBox color="white" depth={8 * safe.u} stroke={5 * safe.u}>
            <T size={s * 0.8}>{glue(human)}</T>
          </BrandBox>
        </div>
      </div>
      {/* AI column */}
      <div style={{position: 'absolute', left: `calc(50% + ${40 * safe.u}px)`, top: ground - colH, width: 220 * safe.u, height: colH, background: colors.primary, border: edge(7 * safe.u), borderBottom: 'none', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 16 * safe.u}}>
        <T size={s * 1.1} weight={900}>{glue(label)}</T>
      </div>
      {/* head-height marker */}
      <div style={{position: 'absolute', left: safe.x, right: safe.insets.right, top: ground - personH, borderTop: `${5 * safe.u}px dashed ${t.fg}`, opacity: passed ? 1 : 0.4}} />
      {passed ? (
        <div style={{position: 'absolute', left: safe.x, top: ground - personH - 110 * safe.u}}>
          <Marker delay={0} frames={6}>
            <T size={s} weight={900} color={colors.line}>{glue('cez hlavu')}</T>
          </Marker>
        </div>
      ) : null}
    </SceneBg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────────────────────
/** PredictionCard: a checklist where fulfilled items get ticked and the open one pulses. */
export const PredictionCard: React.FC<Base & {title: string; items: {text: string; done?: boolean}[]; tone?: Tone}> = ({title, items, tone = 'paper', durationInFrames}) => {
  const frame = useCurrentFrame();
  const safe = useSafe();
  const s = (safe.isShort ? 108 : 64) * safe.u;
  const at = steps(items.length, durationInFrames, 0.12, 0.7);
  return (
    <SceneBg tone={tone}>
      <Center gap={20}>
        <Drop>
          {(ex) => (
            <BrandBox color="dark" extrude={ex} depth={12 * safe.u}>
              <T size={s * 0.8} weight={900}>{glue(title)}</T>
            </BrandBox>
          )}
        </Drop>
        <BrandBox color="white" depth={18 * safe.u} padding={`${20 * safe.u}px ${26 * safe.u}px`} style={{alignSelf: 'stretch'}}>
          <div style={{display: 'flex', flexDirection: 'column', gap: 22 * safe.u}}>
            {items.map((it, i) => {
              const p = interpolate(frame, [at[i], at[i] + 6], [0, 1], {...clamp, easing: EXTREME});
              const tick = interpolate(frame, [at[i] + 6, at[i] + 10], [0, 1], clamp);
              const pulse = it.done ? 1 : 1 + 0.06 * Math.sin(frame / 3);
              return (
                <div key={i} style={{display: 'flex', alignItems: 'center', gap: 18 * safe.u, opacity: p, transform: `translateX(${(1 - p) * -60}px)`}}>
                  <div style={{width: 58 * safe.u, height: 58 * safe.u, flexShrink: 0, border: edge(6 * safe.u), background: it.done ? colors.white : colors.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${pulse})`}}>
                    <T size={s} weight={900}>{it.done ? (tick > 0.5 ? '✓' : '') : '?'}</T>
                  </div>
                  {it.done ? (
                    <T size={s * 0.85} weight={700} style={{textAlign: 'left'}}>{glue(it.text)}</T>
                  ) : (
                    <Marker delay={at[i] + 8} frames={8}>
                      <T size={s * 0.85} weight={900} style={{textAlign: 'left'}}>{glue(it.text)}</T>
                    </Marker>
                  )}
                </div>
              );
            })}
          </div>
        </BrandBox>
      </Center>
    </SceneBg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────────────────────
/** Trajectory: from "today" a path heads toward a target; the solid part is where we are, dashed is where it leads. */
export const Trajectory: React.FC<Base & {from?: string; to: string; tone?: Tone}> = ({from = 'Dnes', to, tone = 'dark', durationInFrames}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const safe = useSafe();
  const t = TONE[tone];
  const s = (safe.isShort ? 84 : 60) * safe.u;
  const A = [safe.x + 90 * safe.u, safe.y + safe.h * 0.78];
  const B = [width - safe.insets.right - 250 * safe.u, safe.y + safe.h * 0.25];
  const C = [A[0] + (B[0] - A[0]) * 0.2, B[1] + (A[1] - B[1]) * 0.05];
  const d = `M${A[0]},${A[1]} Q${C[0]},${C[1]} ${B[0]},${B[1]}`;
  const solid = interpolate(frame, [4, durationInFrames * 0.45], [0, 0.55], {...clamp, easing: Easing.out(Easing.cubic)});
  const dashed = interpolate(frame, [durationInFrames * 0.4, durationInFrames * 0.75], [0.55, 1], clamp);
  const tIn = interpolate(frame, [durationInFrames * 0.55, durationInFrames * 0.62], [0, 1], {...clamp, easing: EXTREME});
  const warn = 1 + 0.08 * Math.sin(frame / 2.5);
  const sw = 12 * safe.u;
  return (
    <SceneBg tone={tone}>
      <svg width={width} height={height} style={{position: 'absolute', inset: 0}}>
        <path d={d} fill="none" stroke={t.fg} strokeWidth={sw * 0.6} strokeDasharray={`${18 * safe.u} ${16 * safe.u}`} pathLength={1000} strokeDashoffset={0} opacity={0.0001 + (dashed > 0.55 ? 1 : 0)} style={{clipPath: `inset(0 ${(1 - dashed) * 100}% 0 0)`}} />
        <path d={d} fill="none" stroke={colors.primary} strokeWidth={sw} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - solid} />
        <circle cx={A[0]} cy={A[1]} r={22 * safe.u} fill={colors.primary} stroke={colors.line} strokeWidth={6 * safe.u} />
      </svg>
      <div style={{position: 'absolute', left: A[0] - 40 * safe.u, top: A[1] + 40 * safe.u}}>
        <BrandBox color="white" depth={8 * safe.u} stroke={5 * safe.u}>
          <T size={s * 1.05} weight={900}>{glue(from)}</T>
        </BrandBox>
      </div>
      <div style={{position: 'absolute', left: B[0], top: B[1], transform: `translate(-50%, -50%) scale(${tIn * warn})`}}>
        <BrandBox color="primary" depth={20 * safe.u}>
          <T size={s} weight={900}>⚠ {glue(to)}</T>
        </BrandBox>
      </div>
    </SceneBg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────────────────────
/** Gauge: a speedometer whose needle moves from `from` to `to` (0–1), e.g. slowing development down. */
export const Gauge: React.FC<Base & {label: string; from?: number; to?: number; low?: string; high?: string; tone?: Tone}> = ({
  label,
  from = 0.92,
  to = 0.35,
  low = 'pomaly',
  high = 'naplno',
  tone = 'paper',
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const safe = useSafe();
  const s = (safe.isShort ? 100 : 64) * safe.u;
  const cx = width / 2;
  const lc = TONE[tone].fg;
  const cy = safe.y + safe.h * 0.62;
  const r = Math.min(safe.w * 0.42, 420 * safe.u);
  const v = interpolate(frame, [durationInFrames * 0.25, durationInFrames * 0.7], [from, to], {...clamp, easing: EXTREME});
  const shake = frame < durationInFrames * 0.25 ? Math.sin(frame * 1.7) * 0.01 : 0;
  const ang = Math.PI * (1 - (v + shake));
  const arc = (a0: number, a1: number) => `M${cx + Math.cos(Math.PI * (1 - a0)) * r},${cy - Math.sin(Math.PI * (1 - a0)) * r} A${r},${r} 0 0 1 ${cx + Math.cos(Math.PI * (1 - a1)) * r},${cy - Math.sin(Math.PI * (1 - a1)) * r}`;
  const sw = 34 * safe.u;
  return (
    <SceneBg tone={tone}>
      <svg width={width} height={height} style={{position: 'absolute', inset: 0}}>
        <path d={arc(0, 0.6)} fill="none" stroke={colors.white} strokeWidth={sw} />
        <path d={arc(0.6, 1)} fill="none" stroke={colors.primary} strokeWidth={sw} />
        <path d={arc(0, 1)} fill="none" stroke={colors.line} strokeWidth={6 * safe.u} transform={`translate(0 ${sw / 2})`} opacity={0.0} />
        {Array.from({length: 11}, (_, i) => {
          const a = Math.PI * (1 - i / 10);
          return <line key={i} x1={cx + Math.cos(a) * (r - sw)} y1={cy - Math.sin(a) * (r - sw)} x2={cx + Math.cos(a) * (r - sw * 1.6)} y2={cy - Math.sin(a) * (r - sw * 1.6)} stroke={colors.line} strokeWidth={6 * safe.u} />;
        })}
        <line x1={cx} y1={cy} x2={cx + Math.cos(ang) * (r - sw * 0.6)} y2={cy - Math.sin(ang) * (r - sw * 0.6)} stroke={colors.line} strokeWidth={16 * safe.u} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={30 * safe.u} fill={colors.primary} stroke={colors.line} strokeWidth={8 * safe.u} />
      </svg>
      <div style={{position: 'absolute', left: cx - r - 20 * safe.u, top: cy + 40 * safe.u}}>
        <T size={s * 0.7} weight={800} color={lc}>{glue(low)}</T>
      </div>
      <div style={{position: 'absolute', right: width - cx - r - 20 * safe.u, top: cy + 40 * safe.u}}>
        <T size={s * 0.7} weight={800} color={lc}>{glue(high)}</T>
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: cy + 140 * safe.u, display: 'flex', justifyContent: 'center'}}>
        <Drop delay={Math.round(durationInFrames * 0.5)} from="bottom">
          {(ex) => (
            <BrandBox color={tone === 'dark' || tone === 'secondary' ? 'primary' : 'dark'} extrude={ex} depth={14 * safe.u}>
              <T size={s * 1.05} weight={900}>{glue(label)}</T>
            </BrandBox>
          )}
        </Drop>
      </div>
    </SceneBg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────────────────────
/**
 * IntervalTimeline: a vertical timeline where each new release lands sooner than the last —
 * the gaps visibly shrink (and the landings accelerate). `gaps` labels each interval
 * (e.g. years → months → weeks → days); the last gap is highlighted.
 */
export const IntervalTimeline: React.FC<Base & {title?: string; gaps: string[]; start?: string; end?: string; tone?: Tone}> = ({
  title,
  gaps,
  start = 'kedysi',
  end = 'dnes',
  tone = 'paper',
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const {width} = useVideoConfig();
  const safe = useSafe();
  const t = TONE[tone];
  const s = (safe.isShort ? 100 : 64) * safe.u;
  const n = gaps.length + 1;
  const r = 0.62;
  const top = safe.y + (title ? 190 : 60) * safe.u;
  const span = safe.h - (title ? 260 : 120) * safe.u;
  const total = (1 - Math.pow(r, gaps.length)) / (1 - r);
  const ys = Array.from({length: n}, (_, i) => top + (span * (1 - Math.pow(r, i))) / (1 - r) / total);
  // landings accelerate too: time gaps shrink with the same ratio
  const t0 = durationInFrames * 0.08;
  const tSpan = durationInFrames * 0.62;
  const ts = Array.from({length: n}, (_, i) => t0 + (tSpan * (1 - Math.pow(r, i))) / (1 - r) / total);
  const x = width * (safe.isShort ? 0.3 : 0.4);
  const sw = 10 * safe.u;
  const lineP = interpolate(frame, [0, ts[n - 1]], [0, 1], {...clamp, easing: Easing.out(Easing.quad)});
  return (
    <SceneBg tone={tone}>
      {title ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: safe.y + 20 * safe.u, display: 'flex', justifyContent: 'center'}}>
          <Drop>
            {(ex) => (
              <BrandBox color="dark" extrude={ex} depth={12 * safe.u}>
                <T size={s * 0.8} weight={900}>{glue(title)}</T>
              </BrandBox>
            )}
          </Drop>
        </div>
      ) : null}
      <div style={{position: 'absolute', left: x - sw / 2, top: ys[0], width: sw, height: (ys[n - 1] - ys[0]) * lineP, background: t.fg}} />
      {ys.map((y, i) => {
        const p = interpolate(frame, [ts[i], ts[i] + 5], [0, 1], {...clamp, easing: EXTREME});
        const last = i === n - 1;
        return (
          <React.Fragment key={i}>
            <div style={{position: 'absolute', left: x, top: y, transform: `translate(-50%,-50%) scale(${p})`, width: 46 * safe.u, height: 46 * safe.u, borderRadius: '50%', background: last ? colors.primary : colors.white, border: edge(7 * safe.u)}} />
            <div style={{position: 'absolute', right: width - x + 44 * safe.u, top: y, transform: 'translateY(-50%)', opacity: p}}>
              <T size={s * 0.5} weight={800} color={t.fg}>{i === 0 ? glue(start) : last ? glue(end) : ''}</T>
            </div>
            {i > 0 ? (
              <div
                style={{
                  position: 'absolute',
                  left: x + 50 * safe.u,
                  top: ys[i - 1] + 18 * safe.u,
                  height: y - ys[i - 1] - 36 * safe.u,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 18 * safe.u,
                  opacity: p,
                  transform: `translateX(${(1 - p) * 60}px)`,
                }}
              >
                <div style={{alignSelf: 'stretch', width: 18 * safe.u, border: `${6 * safe.u}px solid ${t.fg}`, borderLeft: 'none'}} />
                <BrandBox color={last ? 'primary' : 'white'} depth={(last ? 16 : 8) * safe.u} stroke={5 * safe.u} padding="0.08em 0.3em">
                  <T size={s * (last ? 1 : 0.8)} weight={900}>{glue(gaps[i - 1])}</T>
                </BrandBox>
              </div>
            ) : null}
          </React.Fragment>
        );
      })}
    </SceneBg>
  );
};
