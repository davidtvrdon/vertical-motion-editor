/**
 * World scenes: familiar objects and places for recurring tech-news moments (a phone buzzing,
 * a price tag, a calendar, a map, a newspaper, a terminal…). Each one is its own visual
 * language so consecutive videos don't look alike. Same rules as the other scene files:
 * build-up in steps, one focal point at a time, extreme ease in/out, big text for phones.
 */
import React from 'react';
import {Easing, interpolate, random, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {colors, edge, fonts, glue, hardShadow, LOCALE, theme} from '../../brand';
import {clamp, useSpringIn} from '../../lib/anim';
import {useSafe} from '../../lib/safe';
import {BrandBox} from '../BrandBox';
import {Marker} from '../Marker';
import {ScreenTreatment, Scribble} from '../Scribble';
import {Base, Center, Drop, fmt, SceneBg, Tone, TONE} from './common';

const EXTREME = Easing.bezier(0.85, 0, 0.15, 1);
const T: React.FC<{size: number; weight?: number; color?: string; children: React.ReactNode; style?: React.CSSProperties}> = ({size, weight = 800, color, children, style}) => (
  <span style={{fontFamily: fonts.display, fontSize: size, fontWeight: weight, color, lineHeight: 1.1, letterSpacing: '-0.01em', ...style}}>{children}</span>
);
const useS = (short: number, long: number) => {
  const safe = useSafe();
  return (safe.isShort ? short : long) * safe.u;
};
/** 0→1 over [a, a+len] frames with the extreme curve */
const useStep = () => {
  const frame = useCurrentFrame();
  return (a: number, len = 6) => interpolate(frame, [a, a + len], [0, 1], {...clamp, easing: EXTREME});
};
const Title: React.FC<{text?: string; color?: 'dark' | 'white' | 'primary'; size: number}> = ({text, color = 'dark', size}) => {
  const safe = useSafe();
  if (!text) return null;
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: safe.y + 16 * safe.u, display: 'flex', justifyContent: 'center', zIndex: 5}}>
      <Drop>
        {(ex) => (
          <BrandBox color={color} extrude={ex} depth={12 * safe.u}>
            <T size={size} weight={900}>{glue(text)}</T>
          </BrandBox>
        )}
      </Drop>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────────────────────
/** PhoneNotification: a phone rises into frame; notifications drop in and stack, newest on top. */
export const PhoneNotification: React.FC<Base & {notifications: {app?: string; title: string; text?: string}[]; time?: string; tone?: Tone}> = ({
  notifications,
  time = '9:41',
  tone = 'secondary',
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const safe = useSafe();
  const s = useS(85, 48);
  const step = useStep();
  const phoneH = safe.isShort ? Math.min(safe.h * 0.98, 1250 * safe.u) : safe.h * 0.86;
  const phoneW = Math.min(phoneH * 0.52, safe.w * 0.9);
  const rise = spring({frame, fps: 30, config: {damping: 16, stiffness: 120}});
  const at = (i: number) => durationInFrames * (0.18 + (0.55 * i) / Math.max(1, notifications.length));
  const cardH = s * 2.9;
  return (
    <SceneBg tone={tone}>
      <div
        style={{
          position: 'absolute',
          left: (width - phoneW) / 2,
          top: safe.y + (safe.h - phoneH) / 2 + (1 - rise) * height * 0.6,
          width: phoneW,
          height: phoneH,
          borderRadius: phoneW * 0.12,
          border: edge(10 * safe.u),
          background: `linear-gradient(170deg, ${colors.secondaryDark} 0%, ${colors.dark} 100%)`,
          boxShadow: hardShadow(18 * safe.u),
          overflow: 'hidden',
        }}
      >
        <ScreenTreatment lines={0.1}>
          <div style={{height: phoneH, position: 'relative'}}>
            <div style={{position: 'absolute', left: '50%', top: 16 * safe.u, width: phoneW * 0.3, height: 26 * safe.u, borderRadius: 20 * safe.u, background: colors.line, transform: 'translateX(-50%)'}} />
            <div style={{textAlign: 'center', marginTop: phoneH * 0.08}}>
              <T size={s * 2.3} weight={300} color={colors.white}>{time}</T>
            </div>
            {notifications.map((n, i) => {
              const p = step(at(i), 7);
              const newer = notifications.filter((_, j) => j > i && frame >= at(j)).length;
              const newerP = notifications.reduce((acc, _, j) => (j > i ? acc + step(at(j), 7) : acc), 0);
              const y = phoneH * 0.3 + newerP * (cardH + 14 * safe.u);
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: phoneW * 0.05,
                    right: phoneW * 0.05,
                    top: y - (1 - p) * 180 * safe.u,
                    opacity: p * (1 - 0.25 * Math.min(1, newer)),
                    background: 'rgba(244,241,236,0.96)',
                    borderRadius: 26 * safe.u,
                    padding: `${14 * safe.u}px ${18 * safe.u}px`,
                    display: 'flex',
                    gap: 14 * safe.u,
                    alignItems: 'flex-start',
                    border: edge(4 * safe.u),
                  }}
                >
                  <div style={{width: s * 1.1, height: s * 1.1, flexShrink: 0, borderRadius: 14 * safe.u, background: colors.primary, border: edge(3 * safe.u), display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                    <T size={s * 0.6} weight={900} color={colors.white}>{(n.app ?? n.title).slice(0, 1).toUpperCase()}</T>
                  </div>
                  <div style={{display: 'flex', flexDirection: 'column', gap: 4 * safe.u, minWidth: 0}}>
                    {n.app ? <T size={s * 0.42} weight={700} color={colors.grey}>{n.app.toUpperCase()}</T> : null}
                    <T size={s * 0.62} weight={900}>{glue(n.title)}</T>
                    {n.text ? <T size={s * 0.5} weight={500}>{glue(n.text)}</T> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </ScreenTreatment>
      </div>
    </SceneBg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────────────────────
/** EventTimeline: a vertical line draws down; dated events land one by one; the last one is marked. */
export const EventTimeline: React.FC<Base & {events: {date: string; label: string}[]; title?: string; highlight?: number; tone?: Tone}> = ({
  events,
  title,
  highlight,
  tone = 'paper',
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const {width} = useVideoConfig();
  const safe = useSafe();
  const t = TONE[tone];
  const s = useS(115, 70);
  const step = useStep();
  const hi = highlight ?? events.length - 1;
  const top = safe.y + (title ? 190 : 60) * safe.u;
  const span = safe.h - (title ? 260 : 120) * safe.u;
  const gap = span / Math.max(1, events.length);
  const x = (width - safe.w) / 2 + safe.w * (safe.isShort ? 0.08 : 0.3);
  const at = (i: number) => durationInFrames * (0.1 + (0.6 * i) / Math.max(1, events.length));
  const line = interpolate(frame, [0, at(events.length - 1) + 6], [0, 1], clamp);
  return (
    <SceneBg tone={tone}>
      <Title text={title} size={s * 0.8} />
      <div style={{position: 'absolute', left: x - 5 * safe.u, top, width: 10 * safe.u, height: (events.length - 0.5) * gap * line, background: t.fg}} />
      {events.map((e, i) => {
        const p = step(at(i));
        const y = top + i * gap + gap * 0.1;
        const isHi = i === hi;
        return (
          <div key={i} style={{position: 'absolute', left: x - 22 * safe.u, top: y, display: 'flex', alignItems: 'center', gap: 22 * safe.u, opacity: p, transform: `translateX(${(1 - p) * 80}px)`}}>
            <div style={{width: 44 * safe.u, height: 44 * safe.u, borderRadius: '50%', background: isHi ? colors.primary : colors.white, border: edge(7 * safe.u), flexShrink: 0}} />
            <div style={{display: 'flex', flexDirection: 'column', gap: 8 * safe.u, alignItems: 'flex-start'}}>
              <BrandBox color={isHi ? 'primary' : 'dark'} depth={8 * safe.u} stroke={4 * safe.u} padding="0.08em 0.3em">
                <T size={s * 0.62} weight={900}>{glue(e.date)}</T>
              </BrandBox>
              {isHi ? (
                <Marker delay={Math.round(at(i) + 6)} frames={8}>
                  <T size={s * 0.78} weight={900} color={colors.line}>{glue(e.label)}</T>
                </Marker>
              ) : (
                <T size={s * 0.72} weight={800} color={t.fg}>{glue(e.label)}</T>
              )}
            </div>
          </div>
        );
      })}
    </SceneBg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────────────────────
/** MoneyFlow: coins stream from payer to receiver along an arc while the amount counts up. */
export const MoneyFlow: React.FC<Base & {from: string; to: string; amount: number; prefix?: string; suffix?: string; decimals?: number; label?: string; coin?: string; tone?: Tone; locale?: string}> = ({
  from,
  to,
  amount,
  prefix = '',
  suffix = '',
  decimals = 0,
  label,
  coin = '€',
  tone = 'secondary',
  locale = LOCALE,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const {width} = useVideoConfig();
  const safe = useSafe();
  const t = TONE[tone];
  const s = useS(125, 80);
  const inA = useSpringIn(0);
  const inB = useSpringIn(4);
  // endpoints: top→bottom on shorts, left→right on long
  const A = safe.isShort ? [width / 2, safe.y + safe.h * 0.1] : [safe.x + safe.w * 0.14, safe.y + safe.h * 0.5];
  const B = safe.isShort ? [width / 2, safe.y + safe.h * 0.86] : [safe.x + safe.w * 0.86, safe.y + safe.h * 0.5];
  const C = safe.isShort ? [width / 2 + safe.w * 0.55, (A[1] + B[1]) / 2] : [(A[0] + B[0]) / 2, safe.y + safe.h * 0.02];
  const q = (u: number) => [(1 - u) ** 2 * A[0] + 2 * (1 - u) * u * C[0] + u * u * B[0], (1 - u) ** 2 * A[1] + 2 * (1 - u) * u * C[1] + u * u * B[1]];
  const t0 = durationInFrames * 0.12;
  const t1 = durationInFrames * 0.78;
  const count = interpolate(frame, [t0, t1], [0, amount], {...clamp, easing: Easing.out(Easing.cubic)});
  const coins = 14;
  return (
    <SceneBg tone={tone}>
      {Array.from({length: coins}, (_, k) => {
        const start = t0 + (k / coins) * (t1 - t0 - 10);
        const u = interpolate(frame, [start, start + 14], [0, 1], {...clamp, easing: Easing.inOut(Easing.quad)});
        if (u <= 0 || u >= 1) return null;
        const [x, y] = q(u);
        const wob = (random(`c${k}`) - 0.5) * 60 * safe.u;
        return (
          <div key={k} style={{position: 'absolute', left: x + wob * Math.sin(u * Math.PI), top: y, transform: `translate(-50%,-50%) rotate(${u * 540}deg)`, width: s * 0.9, height: s * 0.9, borderRadius: '50%', background: colors.white, border: edge(6 * safe.u), display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <T size={s * 0.5} weight={900} color={colors.primary}>{coin}</T>
          </div>
        );
      })}
      {[
        [A, from, inA, 'white'],
        [B, to, inB, 'primary'],
      ].map(([P, txt, p, c], i) => (
        <div key={i} style={{position: 'absolute', left: (P as number[])[0], top: (P as number[])[1], transform: `translate(-50%,-50%) scale(${p as number})`}}>
          <BrandBox color={c as 'white' | 'primary'} depth={18 * safe.u}>
            <T size={s * 0.85} weight={900}>{glue(txt as string)}</T>
          </BrandBox>
        </div>
      ))}
      <div style={{position: 'absolute', left: 0, right: 0, top: safe.isShort ? safe.y + safe.h * 0.42 : safe.y + safe.h * 0.72, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 * safe.u}}>
        <T size={s * 1.35} weight={900} color={t.fg} style={{fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap'}}>
          {prefix}
          {fmt(count, decimals, locale)}
          {suffix}
        </T>
        {label ? <T size={s * 0.55} weight={800} color={t.fg}>{glue(label)}</T> : null}
      </div>
    </SceneBg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────────────────────
/** Balance: arguments drop into two pans; the beam tips toward the heavier side. */
export const Balance: React.FC<Base & {left: {label: string; items?: string[]}; right: {label: string; items?: string[]}; heavier?: 'left' | 'right'; title?: string; tone?: Tone}> = ({
  left,
  right,
  heavier = 'right',
  title,
  tone = 'paper',
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const {width} = useVideoConfig();
  const safe = useSafe();
  const t = TONE[tone];
  const s = useS(125, 72);
  const step = useStep();
  const cx = width / 2;
  const pivotY = safe.y + safe.h * (safe.isShort ? 0.4 : 0.3);
  const arm = Math.min(safe.w * 0.4, 420 * safe.u);
  const tip = interpolate(frame, [durationInFrames * 0.62, durationInFrames * 0.78], [0, heavier === 'right' ? 1 : -1], {...clamp, easing: Easing.out(Easing.back(2))});
  const ang = tip * 12;
  const rad = (ang * Math.PI) / 180;
  const sides = [
    {side: left, dir: -1},
    {side: right, dir: 1},
  ];
  const itemsAll = [...(left.items ?? []).map((x) => ({x, d: -1})), ...(right.items ?? []).map((x) => ({x, d: 1}))];
  const at = (i: number) => durationInFrames * (0.12 + (0.45 * i) / Math.max(1, itemsAll.length));
  return (
    <SceneBg tone={tone}>
      <Title text={title} size={s * 0.85} />
      {/* stand */}
      <div style={{position: 'absolute', left: cx - 10 * safe.u, top: pivotY, width: 20 * safe.u, height: safe.h * 0.5, background: t.fg}} />
      <div style={{position: 'absolute', left: cx - 160 * safe.u, top: pivotY + safe.h * 0.5, width: 320 * safe.u, height: 26 * safe.u, background: t.fg}} />
      {/* beam */}
      <div style={{position: 'absolute', left: cx - arm, top: pivotY - 10 * safe.u, width: arm * 2, height: 20 * safe.u, background: colors.line, transform: `rotate(${ang}deg)`, transformOrigin: '50% 50%', border: `${3 * safe.u}px solid ${t.fg}`}} />
      <div style={{position: 'absolute', left: cx - 24 * safe.u, top: pivotY - 24 * safe.u, width: 48 * safe.u, height: 48 * safe.u, borderRadius: '50%', background: colors.primary, border: edge(6 * safe.u)}} />
      {sides.map(({side, dir}) => {
        const ex = cx + dir * arm * Math.cos(rad);
        const ey = pivotY + dir * arm * Math.sin(rad);
        const hang = 160 * safe.u;
        const panW = Math.min(arm * 0.95, 400 * safe.u);
        const items = itemsAll.map((it, i) => ({...it, i})).filter((it) => it.d === dir);
        return (
          <React.Fragment key={dir}>
            <div style={{position: 'absolute', left: ex - 3 * safe.u, top: ey, width: 6 * safe.u, height: hang, background: t.fg}} />
            <div style={{position: 'absolute', left: ex - panW / 2, top: ey + hang, width: panW, display: 'flex', flexDirection: 'column-reverse', alignItems: 'center', gap: 8 * safe.u, transform: 'translateY(-100%)'}}>
              {items.map((it, k) => {
                const p = step(at(it.i), 7);
                return (
                  <div key={k} style={{opacity: p, transform: `translateY(${(1 - p) * -260}px) rotate(${(k % 2 ? 2 : -2) * p}deg)`}}>
                    <BrandBox color="white" depth={6 * safe.u} stroke={4 * safe.u} padding="0.08em 0.3em">
                      <T size={s * 0.5} weight={900}>{glue(it.x)}</T>
                    </BrandBox>
                  </div>
                );
              })}
            </div>
            <div style={{position: 'absolute', left: ex - panW / 2, top: ey + hang, width: panW, height: 22 * safe.u, background: dir === (heavier === 'right' ? 1 : -1) ? colors.primary : colors.white, border: edge(6 * safe.u), borderRadius: `0 0 ${40 * safe.u}px ${40 * safe.u}px`}} />
            <div style={{position: 'absolute', left: ex - panW / 2, top: ey + hang + 50 * safe.u, width: panW, textAlign: 'center'}}>
              <T size={s * 0.72} weight={900} color={t.fg}>{glue(side.label)}</T>
            </div>
          </React.Fragment>
        );
      })}
    </SceneBg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────────────────────
/** SearchBar: a query types itself into a search field, then result cards slide in. */
export const SearchBar: React.FC<Base & {query: string; results?: string[]; engine?: string; tone?: Tone}> = ({query, results = [], engine, tone = 'paper', durationInFrames}) => {
  const frame = useCurrentFrame();
  const safe = useSafe();
  const s = useS(100, 64);
  const step = useStep();
  const typeEnd = durationInFrames * 0.45;
  const n = Math.round(interpolate(frame, [4, typeEnd], [0, query.length], clamp));
  const caret = Math.floor(frame / 8) % 2 === 0 && n < query.length + 1;
  const at = (i: number) => typeEnd + 6 + i * 6;
  return (
    <SceneBg tone={tone}>
      <Center gap={24}>
        {engine ? <T size={s * 1.3} weight={900} style={{letterSpacing: '-0.03em'}}>{engine}</T> : null}
        <div style={{alignSelf: 'stretch', display: 'flex', alignItems: 'center', gap: 18 * safe.u, background: colors.white, border: edge(7 * safe.u), borderRadius: 999, padding: `${20 * safe.u}px ${30 * safe.u}px`, boxShadow: hardShadow(12 * safe.u)}}>
          <svg width={s * 0.9} height={s * 0.9} viewBox="0 0 24 24">
            <circle cx="10" cy="10" r="6.5" fill="none" stroke={colors.line} strokeWidth="3" />
            <line x1="15" y1="15" x2="21" y2="21" stroke={colors.primary} strokeWidth="3.5" strokeLinecap="round" />
          </svg>
          <T size={s * 0.8} weight={700}>
            {query.slice(0, n)}
            <span style={{opacity: caret ? 1 : 0, color: colors.accent}}>|</span>
          </T>
        </div>
        <div style={{alignSelf: 'stretch', display: 'flex', flexDirection: 'column', gap: 14 * safe.u, marginTop: 16 * safe.u}}>
          {results.map((r, i) => {
            const p = step(at(i));
            const next = i + 1 < results.length ? at(i + 1) : Infinity;
            const dim = Number.isFinite(next) ? interpolate(frame, [next, next + 6], [0, 0.35], clamp) : 0;
            return (
              <div key={i} style={{opacity: p * (1 - dim), transform: `translateY(${(1 - p) * 40}px)`, background: colors.paper, borderLeft: `${10 * safe.u}px solid ${colors.primary}`, padding: `${12 * safe.u}px ${20 * safe.u}px`, border: edge(4 * safe.u)}}>
                <T size={s * 0.62} weight={800}>{glue(r)}</T>
              </div>
            );
          })}
        </div>
      </Center>
    </SceneBg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────────────────────
/** PriceTag: a hanging tag swings in; the old price gets struck out and the new one stamps in. */
export const PriceTag: React.FC<Base & {product: string; newPrice: string; oldPrice?: string; note?: string; tone?: Tone}> = ({product, newPrice, oldPrice, note, tone = 'secondary', durationInFrames}) => {
  const frame = useCurrentFrame();
  const {width} = useVideoConfig();
  const safe = useSafe();
  const t = TONE[tone];
  const s = useS(110, 70);
  const swing = spring({frame, fps: 30, config: {damping: 7, stiffness: 90}});
  const rot = (1 - swing) * 38 - 4;
  const strikeAt = durationInFrames * 0.4;
  const stampAt = durationInFrames * 0.55;
  const strike = interpolate(frame, [strikeAt, strikeAt + 6], [0, 1], clamp);
  const stamp = interpolate(frame, [stampAt, stampAt + 7], [0, 1], {...clamp, easing: EXTREME});
  const tagW = Math.min(safe.w * 0.8, 760 * safe.u);
  const anchorY = safe.y + (safe.isShort ? 60 : 20) * safe.u;
  return (
    <SceneBg tone={tone}>
      <div style={{position: 'absolute', left: width / 2 - 14 * safe.u, top: anchorY - 14 * safe.u, width: 28 * safe.u, height: 28 * safe.u, borderRadius: '50%', background: t.fg}} />
      <div style={{position: 'absolute', left: width / 2 - tagW / 2, top: anchorY, width: tagW, transform: `rotate(${rot}deg)`, transformOrigin: '50% 0'}}>
        <div style={{width: 6 * safe.u, height: 150 * safe.u, background: t.fg, margin: '0 auto'}} />
        <div style={{position: 'relative', background: colors.paper, border: edge(8 * safe.u), borderRadius: `${60 * safe.u}px ${60 * safe.u}px ${24 * safe.u}px ${24 * safe.u}px`, padding: `${60 * safe.u}px ${40 * safe.u}px ${40 * safe.u}px`, boxShadow: hardShadow(16 * safe.u), display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 * safe.u}}>
          <div style={{position: 'absolute', top: 18 * safe.u, left: '50%', width: 34 * safe.u, height: 34 * safe.u, borderRadius: '50%', border: edge(6 * safe.u), transform: 'translateX(-50%)', background: t.bg}} />
          <T size={s * 0.72} weight={900} style={{textAlign: 'center'}}>{glue(product)}</T>
          {oldPrice ? (
            <div style={{position: 'relative'}}>
              <T size={s * 0.95} weight={800} color={colors.grey}>{glue(oldPrice)}</T>
              <div style={{position: 'absolute', left: '-8%', top: '48%', height: 12 * safe.u, width: `${116 * strike}%`, background: colors.primary, transform: 'rotate(-6deg)', borderRadius: 6 * safe.u}} />
            </div>
          ) : null}
          <div style={{opacity: stamp, transform: `scale(${2 - stamp}) rotate(-3deg)`}}>
            <BrandBox color="primary" depth={20 * safe.u}>
              <T size={s * 1.4} weight={900} style={{whiteSpace: 'nowrap'}}>{glue(newPrice)}</T>
            </BrandBox>
          </div>
          {note ? <T size={s * 0.5} weight={700} color={colors.grey}>{glue(note)}</T> : null}
        </div>
      </div>
    </SceneBg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────────────────────
/** CalendarDate: tear-off pages flip until the target day, which gets circled by hand. */
export const CalendarDate: React.FC<Base & {day: number | string; month: string; label?: string; flips?: number; tone?: Tone}> = ({day, month, label, flips = 5, tone = 'paper', durationInFrames}) => {
  const frame = useCurrentFrame();
  const {width} = useVideoConfig();
  const safe = useSafe();
  const s = useS(100, 64);
  const calW = Math.min(safe.w * 0.72, 620 * safe.u);
  const calH = calW * 1.05;
  const left = width / 2 - calW / 2;
  const top = safe.y + safe.h * (safe.isShort ? 0.18 : 0.08);
  const flipEnd = durationInFrames * 0.4;
  const dayNum = typeof day === 'number' ? day : parseInt(day, 10);
  const pages = Array.from({length: flips}, (_, i) => (Number.isFinite(dayNum) ? String(Math.max(1, dayNum - flips + i)) : '·'));
  const pageAt = (i: number) => 4 + (i * (flipEnd - 4)) / flips;
  const circleAt = Math.round(flipEnd + 6);
  const labelIn = interpolate(frame, [circleAt + 8, circleAt + 14], [0, 1], {...clamp, easing: EXTREME});
  const face = (txt: string) => (
    <div style={{position: 'absolute', inset: 0, background: colors.white, border: edge(8 * safe.u), display: 'flex', flexDirection: 'column'}}>
      <div style={{background: colors.primary, borderBottom: `${8 * safe.u}px solid ${colors.line}`, padding: `${18 * safe.u}px 0`, textAlign: 'center'}}>
        <T size={s * 0.72} weight={900} color={colors.white}>{glue(month.toUpperCase())}</T>
      </div>
      <div style={{flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <T size={calH * 0.48} weight={900} style={{letterSpacing: '-0.05em'}}>{txt}</T>
      </div>
    </div>
  );
  return (
    <SceneBg tone={tone}>
      <div style={{position: 'absolute', left, top, width: calW, height: calH, boxShadow: hardShadow(18 * safe.u), perspective: 1600}}>
        {face(String(day))}
        {pages.map((p, i) => {
          const a = pageAt(i);
          const f = interpolate(frame, [a, a + 4], [0, 1], {...clamp, easing: Easing.in(Easing.quad)});
          if (f >= 1) return null;
          return (
            <div key={i} style={{position: 'absolute', inset: 0, transformOrigin: '50% 0', transform: `rotateX(${f * 100}deg)`, opacity: 1 - f * 0.4, zIndex: flips - i}}>
              {face(p)}
            </div>
          );
        })}
      </div>
      <Scribble marks={[{kind: 'circle', x: left + calW * 0.14, y: top + calH * 0.3, w: calW * 0.72, h: calH * 0.62}]} delay={circleAt} frames={9} width={16} />
      {label ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: top + calH + 70 * safe.u, display: 'flex', justifyContent: 'center', opacity: labelIn, transform: `translateY(${(1 - labelIn) * 40}px)`}}>
          <BrandBox color="dark" depth={14 * safe.u}>
            <T size={s * 0.8} weight={900}>{glue(label)}</T>
          </BrandBox>
        </div>
      ) : null}
    </SceneBg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────────────────────
/** Rough continents as ellipses in 0..1 map space (dot-matrix look, not a precise map). */
const CONTINENTS: [number, number, number, number][] = [
  [0.2, 0.3, 0.13, 0.16], [0.14, 0.2, 0.07, 0.07], [0.28, 0.46, 0.05, 0.06], // North America
  [0.31, 0.7, 0.06, 0.16], // South America
  [0.5, 0.25, 0.05, 0.07], // Europe
  [0.52, 0.58, 0.08, 0.17], // Africa
  [0.7, 0.3, 0.17, 0.13], [0.74, 0.46, 0.06, 0.07], [0.64, 0.46, 0.04, 0.07], // Asia, SE Asia, India
  [0.85, 0.74, 0.06, 0.06], // Australia
];
const PLACES: Record<string, [number, number]> = {
  usa: [0.21, 0.35], 'silicon valley': [0.13, 0.36], canada: [0.2, 0.2], brazil: [0.33, 0.66], europe: [0.5, 0.26], kanada: [0.2, 0.2], brazília: [0.33, 0.66], europa: [0.5, 0.26], 'európa': [0.5, 0.26],
  slovensko: [0.52, 0.27], slovakia: [0.52, 0.27], 'veľká británia': [0.47, 0.22], 'united kingdom': [0.47, 0.22], uk: [0.47, 0.22], germany: [0.5, 0.24], nemecko: [0.5, 0.24], france: [0.48, 0.28], francúzsko: [0.48, 0.28], estonia: [0.53, 0.19], estónsko: [0.53, 0.19],
  čína: [0.73, 0.33], china: [0.73, 0.33], japan: [0.82, 0.33], japonsko: [0.82, 0.33], korea: [0.79, 0.33], kórea: [0.79, 0.33], taiwan: [0.77, 0.4], india: [0.65, 0.44], israel: [0.56, 0.37], izrael: [0.56, 0.37],
  'saudi arabia': [0.58, 0.41], 'saudská arábia': [0.58, 0.41], africa: [0.52, 0.58], afrika: [0.52, 0.58], australia: [0.85, 0.74], austrália: [0.85, 0.74], russia: [0.66, 0.18], rusko: [0.66, 0.18],
};
/** WorldMap: dot-matrix world; pins drop on places with radio-wave pulses; optional connecting arcs. */
export const WorldMap: React.FC<Base & {pins: {label: string; place?: string; x?: number; y?: number}[]; title?: string; connect?: boolean; tone?: Tone}> = ({
  pins,
  title,
  connect = false,
  tone = 'secondary',
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const {width} = useVideoConfig();
  const safe = useSafe();
  const t = TONE[tone];
  const s = useS(100, 60);
  const step = useStep();
  // on shorts, zoom the map around the pins' centroid so they stay large
  const pts = pins.map((p) => (p.place ? PLACES[p.place.toLowerCase()] : undefined) ?? [p.x ?? 0.5, p.y ?? 0.5]);
  // shorts: zoom so the pins span ~70 % of the safe width (labels need room), centred on their midpoint
  const xs = pts.map((p) => p[0]);
  const spanX = Math.max(0.12, Math.max(...xs) - Math.min(...xs));
  const mapW = safe.isShort ? Math.min(width * 2.2, Math.max(width, (safe.w * 0.7) / spanX)) : safe.w;
  const mapH = mapW * 0.55;
  const cxm = (Math.max(...xs) + Math.min(...xs)) / 2;
  const ox = safe.isShort ? width / 2 - cxm * mapW : (width - mapW) / 2;
  const oy = safe.y + (safe.h - mapH) / 2 + (title ? 40 : 0) * safe.u;
  const cols = 64;
  const rows = 35;
  const dots: React.ReactNode[] = [];
  const reveal = interpolate(frame, [0, 14], [0, 1], clamp);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const u = (c + 0.5) / cols;
      const v = (r + 0.5) / rows;
      const inside = CONTINENTS.some(([ex, ey, rx, ry]) => ((u - ex) / rx) ** 2 + ((v - ey) / ry) ** 2 <= 1);
      if (!inside || random(`m${r}-${c}`) > reveal * 1.05) continue;
      dots.push(<circle key={`${r}-${c}`} cx={ox + u * mapW} cy={oy + v * mapH} r={(mapW / cols) * 0.3} fill={t.fg} opacity={0.55} />);
    }
  }
  const at = (i: number) => durationInFrames * (0.2 + (0.5 * i) / Math.max(1, pins.length));
  return (
    <SceneBg tone={tone}>
      <svg width={width} height={oy + mapH + 200} style={{position: 'absolute', left: 0, top: 0}}>
        {dots}
        {connect
          ? pts.slice(1).map((p, i) => {
              const a = pts[i];
              const x1 = ox + a[0] * mapW;
              const y1 = oy + a[1] * mapH;
              const x2 = ox + p[0] * mapW;
              const y2 = oy + p[1] * mapH;
              const d = `M${x1},${y1} Q${(x1 + x2) / 2},${Math.min(y1, y2) - 160 * safe.u} ${x2},${y2}`;
              const pr = interpolate(frame, [at(i + 1) - 6, at(i + 1) + 2], [0, 1], clamp);
              return <path key={i} d={d} fill="none" stroke={colors.primary} strokeWidth={8 * safe.u} strokeDasharray="1 1" pathLength={1} strokeDashoffset={1 - pr} strokeLinecap="round" />;
            })
          : null}
        {pts.map((p, i) => {
          const x = ox + p[0] * mapW;
          const y = oy + p[1] * mapH;
          const since = frame - at(i);
          if (since < 0) return null;
          return [0, 1, 2].map((k) => {
            const w = ((since + k * 12) % 36) / 36;
            return <circle key={`${i}-${k}`} cx={x} cy={y} r={20 * safe.u + w * 90 * safe.u} fill="none" stroke={colors.primary} strokeWidth={5 * safe.u} opacity={(1 - w) * 0.8} />;
          });
        })}
      </svg>
      {pins.map((p, i) => {
        const x = ox + pts[i][0] * mapW;
        const y = oy + pts[i][1] * mapH;
        const pp = step(at(i), 7);
        return (
          <div key={i} style={{position: 'absolute', left: x, top: y, transform: `translate(-50%, -100%) translateY(${(1 - pp) * -140}px)`, opacity: pp, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
            <BrandBox color={i === pins.length - 1 ? 'primary' : 'white'} depth={10 * safe.u} stroke={5 * safe.u} padding="0.08em 0.3em">
              <T size={s * 0.7} weight={900}>{glue(p.label)}</T>
            </BrandBox>
            <div style={{width: 6 * safe.u, height: 40 * safe.u, background: colors.line}} />
            <div style={{width: 26 * safe.u, height: 26 * safe.u, borderRadius: '50%', background: colors.primary, border: edge(5 * safe.u), marginTop: -8 * safe.u, transform: 'translateY(50%)'}} />
          </div>
        );
      })}
      <Title text={title} size={s * 1.1} />
    </SceneBg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────────────────────
/** LayerStack: layers drop onto each other bottom-up (chip → model → app); one is highlighted. */
export const LayerStack: React.FC<Base & {layers: string[]; title?: string; highlight?: number; tone?: Tone}> = ({layers, title, highlight, tone = 'dark', durationInFrames}) => {
  const frame = useCurrentFrame();
  const {width} = useVideoConfig();
  const safe = useSafe();
  const t = TONE[tone];
  const s = useS(105, 64);
  const hi = highlight ?? layers.length - 1;
  const layerH = Math.min(170 * safe.u, (safe.h * 0.7) / Math.max(1, layers.length));
  const w = Math.min(safe.w * 0.86, 820 * safe.u);
  const bottom = safe.y + safe.h * 0.86;
  const at = (i: number) => durationInFrames * (0.08 + (0.6 * i) / Math.max(1, layers.length));
  return (
    <SceneBg tone={tone}>
      <Title text={title} color={tone === 'dark' ? 'white' : 'dark'} size={s * 0.85} />
      {layers.map((l, i) => {
        const p = spring({frame: frame - at(i), fps: 30, config: {damping: 11, stiffness: 150}});
        const y = bottom - (i + 1) * (layerH + 16 * safe.u);
        const isHi = i === hi;
        const shrink = 1 - i * 0.06;
        return (
          <div key={i} style={{position: 'absolute', left: width / 2 - (w * shrink) / 2, top: y - (1 - p) * 900 * safe.u, width: w * shrink, height: layerH, opacity: frame >= at(i) ? 1 : 0, transform: 'perspective(1400px) rotateX(18deg)'}}>
            <div style={{position: 'absolute', inset: 0, background: isHi ? colors.primary : i % 2 ? colors.white : colors.paper, border: edge(7 * safe.u), boxShadow: `0 ${16 * safe.u}px 0 ${colors.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              <T size={s * 0.85} weight={900}>{glue(l)}</T>
            </div>
          </div>
        );
      })}
      <div style={{position: 'absolute', left: width / 2 - w / 2 - 30 * safe.u, top: bottom, width: w + 60 * safe.u, height: 10 * safe.u, background: t.fg, opacity: 0.6}} />
    </SceneBg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────────────────────
/** BeforeAfter: a red wipe bar sweeps across, replacing the "before" panel with the "after" one. */
export const BeforeAfter: React.FC<Base & {before: {title: string; lines?: string[]}; after: {title: string; lines?: string[]}; labels?: [string, string]; tone?: Tone}> = ({
  before,
  after,
  labels = ['Before', 'Now'],
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const safe = useSafe();
  const s = useS(130, 84);
  const wipe = interpolate(frame, [durationInFrames * 0.38, durationInFrames * 0.6], [0, 1], {...clamp, easing: EXTREME});
  const panel = (side: {title: string; lines?: string[]}, label: string, bg: string, fg: string, chip: 'white' | 'dark') => (
    <div style={{position: 'absolute', inset: 0, background: bg}}>
      <Center gap={26}>
        <BrandBox color={chip} depth={10 * safe.u}>
          <T size={s * 0.6} weight={900}>{glue(label)}</T>
        </BrandBox>
        <T size={s * 1.15} weight={900} color={fg} style={{textAlign: 'center'}}>{glue(side.title)}</T>
        {(side.lines ?? []).map((l, i) => (
          <T key={i} size={s * 0.68} weight={700} color={fg} style={{textAlign: 'center'}}>{glue(l)}</T>
        ))}
      </Center>
    </div>
  );
  const x = wipe * width;
  return (
    <SceneBg tone="paper">
      {panel(before, labels[0], colors.paper, colors.dark, 'dark')}
      <div style={{position: 'absolute', inset: 0, clipPath: `inset(0 ${width - x}px 0 0)`}}>{panel(after, labels[1], colors.primary, colors.white, 'white')}</div>
      {wipe > 0 && wipe < 1 ? <div style={{position: 'absolute', left: x - 12 * safe.u, top: 0, width: 24 * safe.u, height, background: colors.line}} /> : null}
    </SceneBg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────────────────────
/** Newspaper: a front page spins in (classic movie newspaper), settles, and a stamp thumps down. */
export const Newspaper: React.FC<Base & {headline: string; paper?: string; sub?: string; date?: string; stamp?: string}> = ({headline, paper = 'THE DAILY', sub, date, stamp, durationInFrames}) => {
  const frame = useCurrentFrame();
  const {width} = useVideoConfig();
  const safe = useSafe();
  const s = useS(96, 60);
  const spin = interpolate(frame, [0, durationInFrames * 0.3], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const stampAt = durationInFrames * 0.55;
  const st = interpolate(frame, [stampAt, stampAt + 6], [0, 1], {...clamp, easing: EXTREME});
  const pw = Math.min(safe.w * 0.94, 900 * safe.u);
  const ph = Math.min(safe.h * 0.9, pw * 1.35);
  return (
    <SceneBg tone="dark">
      <div style={{position: 'absolute', left: width / 2 - pw / 2, top: safe.y + (safe.h - ph) / 2, width: pw, height: ph, background: colors.paper, border: edge(6 * safe.u), boxShadow: hardShadow(20 * safe.u), transform: `rotate(${(1 - spin) * 720 - 2}deg) scale(${0.1 + 0.9 * spin})`, padding: `${26 * safe.u}px ${30 * safe.u}px`, display: 'flex', flexDirection: 'column', gap: 16 * safe.u, overflow: 'hidden'}}>
        <div style={{textAlign: 'center', borderBottom: `${6 * safe.u}px double ${colors.line}`, paddingBottom: 10 * safe.u}}>
          <T size={s * 0.9} weight={900} style={{letterSpacing: '0.02em'}}>{paper}</T>
        </div>
        {date ? (
          <div style={{display: 'flex', justifyContent: 'space-between', borderBottom: `${3 * safe.u}px solid ${colors.line}`, paddingBottom: 6 * safe.u}}>
            <T size={s * 0.34} weight={700}>{date}</T>
            <T size={s * 0.34} weight={700}>{theme.brand.name || 'No. 1'}</T>
          </div>
        ) : null}
        <T size={s * 1.12} weight={900} style={{lineHeight: 1.02}}>{glue(headline)}</T>
        {sub ? <T size={s * 0.5} weight={600} style={{fontStyle: 'italic'}}>{glue(sub)}</T> : null}
        <div style={{flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 18 * safe.u, marginTop: 10 * safe.u}}>
          {[0, 1, 2].map((c) => (
            <div key={c} style={{display: 'flex', flexDirection: 'column', gap: 10 * safe.u}}>
              {Array.from({length: 14}, (_, k) => (
                <div key={k} style={{height: 10 * safe.u, background: colors.dark, opacity: 0.25, width: `${70 + random(`np${c}${k}`) * 30}%`}} />
              ))}
            </div>
          ))}
        </div>
      </div>
      {stamp ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: safe.y + safe.h * 0.52, display: 'flex', justifyContent: 'center', opacity: st, transform: `scale(${2.2 - 1.2 * st}) rotate(-8deg)`}}>
          <div style={{border: `${10 * safe.u}px solid ${colors.primary}`, padding: `${6 * safe.u}px ${26 * safe.u}px`, background: 'rgba(244,241,236,0.85)'}}>
            <T size={s * 1.1} weight={900} color={colors.accent} style={{letterSpacing: '0.04em'}}>{glue(stamp.toUpperCase())}</T>
          </div>
        </div>
      ) : null}
    </SceneBg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────────────────────
/** Battery: fill level animates from→to with a percentage; red when low, bolt when charging. */
export const Battery: React.FC<Base & {from?: number; to: number; label?: string; suffix?: string; tone?: Tone}> = ({from = 100, to, label, suffix = ' %', tone = 'secondary', durationInFrames}) => {
  const frame = useCurrentFrame();
  const {width} = useVideoConfig();
  const safe = useSafe();
  const t = TONE[tone];
  const s = useS(110, 70);
  const v = interpolate(frame, [durationInFrames * 0.12, durationInFrames * 0.7], [from, to], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const bw = safe.isShort ? Math.min(safe.w * 0.5, 480 * safe.u) : safe.h * 0.3;
  const bh = bw * 1.9;
  const low = v < 20;
  const charging = to > from;
  const blink = low && Math.floor(frame / 6) % 2 === 0 ? 0.55 : 1;
  const top = safe.y + safe.h * 0.12;
  return (
    <SceneBg tone={tone}>
      <div style={{position: 'absolute', left: width / 2 - bw * 0.18, top: top - 40 * safe.u, width: bw * 0.36, height: 50 * safe.u, background: colors.line, borderRadius: `${12 * safe.u}px ${12 * safe.u}px 0 0`}} />
      <div style={{position: 'absolute', left: width / 2 - bw / 2, top, width: bw, height: bh, border: edge(12 * safe.u), borderRadius: 36 * safe.u, background: colors.white, overflow: 'hidden', boxShadow: hardShadow(16 * safe.u)}}>
        <div style={{position: 'absolute', left: 14 * safe.u, right: 14 * safe.u, bottom: 14 * safe.u, height: `calc(${Math.max(0, v)}% - ${28 * safe.u * (v / 100)}px)`, background: low ? colors.primary : colors.dark, opacity: blink, borderRadius: 18 * safe.u}} />
        {charging ? <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: bw * 0.5}}>⚡</div> : null}
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: top + bh + 50 * safe.u, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 * safe.u}}>
        <T size={s * 1.2} weight={900} color={low ? colors.primary : t.fg} style={{fontVariantNumeric: 'tabular-nums'}}>
          {Math.round(v)}
          {suffix}
        </T>
        {label ? (
          <BrandBox color="dark" depth={12 * safe.u}>
            <T size={s * 0.6} weight={900}>{glue(label)}</T>
          </BrandBox>
        ) : null}
      </div>
    </SceneBg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────────────────────
/** Terminal: a dark console types commands ($) and prints their output line by line. */
export const Terminal: React.FC<Base & {lines: {t: 'cmd' | 'out'; text: string}[]; title?: string}> = ({lines, title = 'terminal', durationInFrames}) => {
  const frame = useCurrentFrame();
  const safe = useSafe();
  const s = useS(72, 46);
  // time budget: commands type (1 frame per 1.5 chars), outputs appear at once
  const budget = durationInFrames * 0.8;
  const cost = lines.map((l) => (l.t === 'cmd' ? Math.max(6, l.text.length / 1.5) : 4));
  const k = budget / cost.reduce((a, b) => a + b, 0);
  let acc = 4;
  const starts = cost.map((c) => {
    const st = acc;
    acc += c * Math.min(1, k);
    return st;
  });
  const caret = Math.floor(frame / 8) % 2 === 0;
  return (
    <SceneBg tone="secondary">
      <Center>
        <div style={{alignSelf: 'stretch', border: edge(7 * safe.u), borderRadius: 18 * safe.u, overflow: 'hidden', boxShadow: hardShadow(16 * safe.u)}}>
          <div style={{background: colors.paper, borderBottom: `${6 * safe.u}px solid ${colors.line}`, padding: `${12 * safe.u}px ${18 * safe.u}px`, display: 'flex', alignItems: 'center', gap: 12 * safe.u}}>
            {[colors.primary, colors.grey, colors.grey].map((c, i) => (
              <span key={i} style={{width: 22 * safe.u, height: 22 * safe.u, borderRadius: '50%', background: c, border: edge(3 * safe.u)}} />
            ))}
            <T size={s * 0.6} weight={700} style={{marginLeft: 12 * safe.u}}>{title}</T>
          </div>
          <ScreenTreatment lines={0.22}>
            <div style={{background: colors.dark, padding: `${24 * safe.u}px ${26 * safe.u}px`, minHeight: safe.h * 0.42, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left', gap: 12 * safe.u, fontFamily: 'ui-monospace, "DejaVu Sans Mono", monospace'}}>
              {lines.map((l, i) => {
                if (frame < starts[i]) return null;
                const typed = l.t === 'cmd' ? Math.round(interpolate(frame, [starts[i], starts[i] + cost[i] * Math.min(1, k)], [0, l.text.length], clamp)) : l.text.length;
                const active = i === lines.length - 1 || frame < starts[i + 1];
                return (
                  <div key={i} style={{fontSize: s * 0.78, lineHeight: 1.3, color: l.t === 'cmd' ? colors.white : '#8FE3A0', whiteSpace: 'pre-wrap', wordBreak: 'break-word'}}>
                    {l.t === 'cmd' ? <span style={{color: colors.primary, fontWeight: 900}}>$ </span> : null}
                    {l.text.slice(0, typed)}
                    {active && l.t === 'cmd' && caret ? <span style={{background: colors.white}}>&nbsp;</span> : null}
                  </div>
                );
              })}
            </div>
          </ScreenTreatment>
        </div>
      </Center>
    </SceneBg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────────────────────
/** Acquisition: the target slides into the buyer and gets absorbed; the price stamps in. */
export const Acquisition: React.FC<Base & {buyer: string; target: string; price?: string; tone?: Tone}> = ({buyer, target, price, tone = 'paper', durationInFrames}) => {
  const frame = useCurrentFrame();
  const {width} = useVideoConfig();
  const safe = useSafe();
  const t = TONE[tone];
  const s = useS(120, 76);
  const inB = useSpringIn(0);
  const inT = useSpringIn(6);
  const eat = interpolate(frame, [durationInFrames * 0.35, durationInFrames * 0.55], [0, 1], {...clamp, easing: EXTREME});
  const gulp = 1 + 0.12 * Math.sin(Math.min(1, Math.max(0, (frame - durationInFrames * 0.55) / 8)) * Math.PI);
  const priceAt = durationInFrames * 0.62;
  const pr = interpolate(frame, [priceAt, priceAt + 6], [0, 1], {...clamp, easing: EXTREME});
  const buyerY = safe.y + safe.h * (safe.isShort ? 0.34 : 0.4);
  const targetY0 = safe.y + safe.h * (safe.isShort ? 0.7 : 0.75);
  const ty = targetY0 + (buyerY - targetY0) * eat;
  const tx = safe.isShort ? width / 2 : width / 2 + (1 - eat) * safe.w * 0.28;
  return (
    <SceneBg tone={tone}>
      <div style={{position: 'absolute', left: tx, top: safe.isShort ? ty : buyerY, transform: `translate(-50%,-50%) scale(${(0.3 + 0.7 * inT) * (1 - 0.85 * eat)})`, opacity: 1 - eat * 0.9}}>
        <BrandBox color="white" depth={16 * safe.u}>
          <T size={s * 0.9} weight={900}>{glue(target)}</T>
        </BrandBox>
      </div>
      <div style={{position: 'absolute', left: safe.isShort ? width / 2 : width / 2 - (1 - eat) * safe.w * 0.2, top: buyerY, transform: `translate(-50%,-50%) scale(${(0.3 + 0.7 * inB) * gulp})`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 44 * safe.u}}>
        <BrandBox color="primary" depth={26 * safe.u} padding={`${24 * safe.u}px ${44 * safe.u}px`}>
          <T size={s * 1.3} weight={900}>{glue(buyer)}</T>
        </BrandBox>
        <div style={{opacity: eat}}>
          <T size={s * 0.62} weight={900} color={t.fg}>{glue(`+ ${target}`)}</T>
        </div>
      </div>
      {price ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: buyerY + 260 * safe.u, display: 'flex', justifyContent: 'center', opacity: pr, transform: `scale(${1.8 - 0.8 * pr}) rotate(-4deg)`}}>
          <BrandBox color="dark" depth={16 * safe.u}>
            <T size={s * 0.95} weight={900}>{glue(price)}</T>
          </BrandBox>
        </div>
      ) : null}
    </SceneBg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────────────────────
/** SocialPost: a post card (name, handle, text revealed word by word) with climbing counters. */
export const SocialPost: React.FC<Base & {name: string; handle?: string; text: string; likes?: number; reposts?: number; tone?: Tone; locale?: string}> = ({
  name,
  handle,
  text,
  likes = 0,
  reposts = 0,
  tone = 'secondary',
  locale = LOCALE,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const safe = useSafe();
  const s = useS(92, 58);
  const card = useSpringIn(0);
  const words = text.split(' ');
  const shown = Math.round(interpolate(frame, [6, durationInFrames * 0.55], [0, words.length], clamp));
  const cnt = (n: number) => fmt(Math.round(interpolate(frame, [durationInFrames * 0.45, durationInFrames * 0.85], [0, n], {...clamp, easing: Easing.out(Easing.cubic)})), 0, locale);
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const pop = interpolate(frame, [durationInFrames * 0.85, durationInFrames * 0.9], [1.4, 1], clamp);
  return (
    <SceneBg tone={tone}>
      <Center>
        <div style={{alignSelf: 'stretch', background: colors.white, border: edge(7 * safe.u), borderRadius: 26 * safe.u, padding: `${28 * safe.u}px ${30 * safe.u}px`, boxShadow: hardShadow(16 * safe.u), transform: `translateY(${(1 - card) * 200}px) rotate(${(1 - card) * -6}deg)`, opacity: Math.min(1, card * 2), display: 'flex', flexDirection: 'column', gap: 20 * safe.u}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 18 * safe.u}}>
            <div style={{width: s * 1.5, height: s * 1.5, borderRadius: '50%', background: colors.primary, border: edge(5 * safe.u), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>
              <T size={s * 0.6} weight={900} color={colors.white}>{initials}</T>
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: 2 * safe.u}}>
              <T size={s * 0.72} weight={900}>{glue(name)}</T>
              {handle ? <T size={s * 0.5} weight={600} color={colors.grey}>{handle}</T> : null}
            </div>
          </div>
          <T size={s * 0.86} weight={600} style={{lineHeight: 1.25, textAlign: 'left'}}>
            {words.map((w, i) => (
              <span key={i} style={{opacity: i < shown ? 1 : 0}}>{w} </span>
            ))}
          </T>
          <div style={{display: 'flex', gap: 40 * safe.u, borderTop: `${3 * safe.u}px solid ${colors.line}`, paddingTop: 16 * safe.u}}>
            <T size={s * 0.6} weight={800} style={{fontVariantNumeric: 'tabular-nums'}}>
              🔁 {cnt(reposts)}
            </T>
            <T size={s * 0.6} weight={800} color={colors.accent} style={{fontVariantNumeric: 'tabular-nums', display: 'inline-block', transform: `scale(${pop})`}}>
              ♥ {cnt(likes)}
            </T>
          </div>
        </div>
      </Center>
    </SceneBg>
  );
};
