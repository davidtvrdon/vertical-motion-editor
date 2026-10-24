/**
 * Scenes built around the user's own product media (press-kit photos, screen recordings, product clips).
 * They show the picture exactly as delivered: no tint, grain or recolouring (RAW_SCENES skip the scene look),
 * because press kits usually forbid altering the media. Framing, cropping to a lens, scaling and
 * placing it on a card is fine; filters are not.
 *
 * Every media prop is a path inside the project folder (`assets/...`). Pass `aspect` (width / height of the
 * file) for the photos so the card fits exactly; the default is 4/3.
 */
import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {colors, fonts, glue, hardShadow, edge} from '../../brand';
import {clamp, useProgress, useSpringIn} from '../../lib/anim';
import {useSafe} from '../../lib/safe';
import {BrandBox} from '../BrandBox';
import {Base, SceneBg, Tone} from './common';

/** Scenes that must not get the documentary look (grain, texture, aberration). */
export const RAW_SCENES = new Set(['Hero', 'PhotoStack', 'Callouts', 'ZoomLens', 'ScreenClip', 'Lineup']);

const Area: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => {
  const safe = useSafe();
  return (
    <div style={{position: 'absolute', left: safe.x, top: safe.y, width: safe.w, height: safe.h, ...style}}>{children}</div>
  );
};

const Title: React.FC<{text?: string; delay?: number}> = ({text, delay = 0}) => {
  const safe = useSafe();
  const s = useSpringIn(delay);
  if (!text) return null;
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: 0, display: 'flex', justifyContent: 'center', transform: `translateY(${(1 - s) * -80}px)`, opacity: Math.min(1, s * 2)}}>
      <BrandBox color="dark" depth={12 * safe.u} extrude={s}>
        <span style={{fontSize: 56 * safe.u, fontWeight: 900}}>{glue(text)}</span>
      </BrandBox>
    </div>
  );
};

const Label: React.FC<{text: string; delay?: number; color?: 'primary' | 'white' | 'dark'; size?: number}> = ({text, delay = 0, color = 'primary', size = 46}) => {
  const safe = useSafe();
  const s = useSpringIn(delay);
  return (
    <div style={{transform: `scale(${0.8 + 0.2 * s})`, opacity: Math.min(1, s * 2)}}>
      <BrandBox color={color} depth={10 * safe.u} extrude={s} padding="0.12em 0.4em">
        <span style={{fontSize: size * safe.u, fontWeight: 900, whiteSpace: 'nowrap'}}>{glue(text)}</span>
      </BrandBox>
    </div>
  );
};

/** Hard-shadowed card holding a photo (contain, so nothing of the product is cropped). */
const PhotoCard: React.FC<{src: string; width: number; aspect: number; fit?: 'contain' | 'cover'; radius?: number; style?: React.CSSProperties; children?: React.ReactNode}> = ({
  src,
  width,
  aspect,
  fit = 'contain',
  radius = 18,
  style,
  children,
}) => {
  const safe = useSafe();
  return (
    <div
      style={{
        position: 'relative',
        width,
        height: width / aspect,
        background: colors.white,
        border: edge(8 * safe.u),
        borderRadius: radius * safe.u,
        boxShadow: hardShadow(16 * safe.u),
        boxSizing: 'content-box',
        ...style,
      }}
    >
      <div style={{position: 'absolute', inset: 0, borderRadius: Math.max(0, radius - 6) * safe.u, overflow: 'hidden'}}>
        <Img src={staticFile(src)} style={{width: '100%', height: '100%', objectFit: fit}} />
      </div>
      {children}
    </div>
  );
};


/* ------------------------------------------------------------------------------------------------ */

/**
 * The "show the thing" shot: one product photo edge to edge (or whole, on paper) with a slow push or a pan
 * across a wide picture, and ONE big label. Prefer this over any diagram when a photo of the subject exists.
 * `pan` = [x0, x1] (0-1 of the photo width) slides the visible window across a wide photo, e.g. from the device
 * on the left to the person on the right.
 */
export const Hero: React.FC<Base & {src: string; label?: string; sub?: string; fit?: 'cover' | 'contain'; pan?: [number, number]; focusY?: number; aspect?: number; tone?: Tone; labelAt?: 'bottom' | 'top'}> = ({
  src,
  label,
  sub,
  fit = 'cover',
  pan,
  focusY = 0.5,
  aspect = 1.5,
  tone = 'paper',
  labelAt = 'bottom',
  durationInFrames,
}) => {
  const safe = useSafe();
  const {width, height} = useVideoConfig();
  const frame = useCurrentFrame();
  const p = Math.min(1, frame / Math.max(1, durationInFrames - 1));
  const e = Easing.inOut(Easing.cubic)(p);
  const px = pan ? pan[0] + (pan[1] - pan[0]) * e : 0.5;
  const plate = (
    <div style={{position: 'absolute', left: safe.x, right: width - safe.x - safe.w, ...(labelAt === 'bottom' ? {bottom: height - safe.y - safe.h + 20 * safe.u} : {top: safe.y}), display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 14 * safe.u}}>
      {label ? <Label text={label} delay={8} color="primary" size={64} /> : null}
      {sub ? <Label text={sub} delay={14} color="white" size={44} /> : null}
    </div>
  );
  if (fit === 'contain') {
    const w = safe.w;
    return (
      <SceneBg tone={tone}>
        <Area>
          <div style={{position: 'absolute', left: 0, top: (safe.h - w / aspect) / 2 - 40 * safe.u, transform: `scale(${1 + 0.05 * e})`}}>
            <PhotoCard src={src} width={w - 24 * safe.u} aspect={aspect} />
          </div>
        </Area>
        {plate}
      </SceneBg>
    );
  }
  return (
    <AbsoluteFill style={{background: colors.line, overflow: 'hidden'}}>
      <Img src={staticFile(src)} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${px * 100}% ${focusY * 100}%`, transform: `scale(${1 + 0.1 * (pan ? 0 : e)})`}} />
      {plate}
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------------------------------------ */

type Photo = {src: string; label?: string; aspect?: number; fit?: 'contain' | 'cover'};

/** 2–4 prints tossed onto the table one after another, each with a tape strip and its own label. */
export const PhotoStack: React.FC<Base & {photos: Photo[]; title?: string; aspect?: number; tone?: Tone}> = ({photos, title, aspect = 4 / 3, tone = 'paper'}) => {
  const safe = useSafe();
  const n = Math.min(4, photos.length);
  const pw = safe.w * (n <= 2 ? 0.7 : n === 3 ? 0.62 : 0.54);
  const rot = [-5, 4, -3, 5];
  return (
    <SceneBg tone={tone}>
      <Area>
        <Title text={title} />
        {photos.slice(0, n).map((p, i) => {
          const a = p.aspect ?? aspect;
          const ph = pw / a + 16 * safe.u;
          const top = (title ? 110 * safe.u : 0) + (n === 1 ? 0 : (i * (safe.h - ph - (title ? 110 * safe.u : 0) - 70 * safe.u)) / (n - 1));
          const side = i % 2 === 0 ? -1 : 1;
          const s = useSpringIn(6 + i * 9, {damping: 13});
          const x = (safe.w - pw) / 2 + side * safe.w * 0.1;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: x,
                top,
                transform: `translateX(${side * (1 - s) * 900}px) rotate(${rot[i] * (0.4 + 0.6 * s) + side * (1 - s) * 18}deg)`,
                opacity: Math.min(1, s * 3),
              }}
            >
              <PhotoCard src={p.src} width={pw} aspect={a} fit={p.fit ?? 'contain'} radius={6}>
                <div style={{position: 'absolute', left: '50%', top: -26 * safe.u, width: 150 * safe.u, height: 46 * safe.u, marginLeft: -75 * safe.u, background: 'rgba(244,241,236,0.82)', border: `3px solid rgba(0,0,0,0.25)`, transform: 'rotate(-3deg)'}} />
                {p.label ? (
                  <div style={{position: 'absolute', left: side > 0 ? '-8%' : 'auto', right: side > 0 ? 'auto' : '-8%', bottom: -34 * safe.u}}>
                    <Label text={p.label} delay={14 + i * 9} color={i % 2 === 0 ? 'primary' : 'white'} size={44} />
                  </div>
                ) : null}
              </PhotoCard>
            </div>
          );
        })}
      </Area>
    </SceneBg>
  );
};

/* ------------------------------------------------------------------------------------------------ */

type Callout = {x: number; y: number; label: string; dx?: number; dy?: number};

/** One photo, labelled parts: a pulsing ring on the spot, a leader line and a label that lands one after another. */
export const Callouts: React.FC<Base & {src: string; aspect?: number; callouts: Callout[]; title?: string; tone?: Tone}> = ({src, aspect = 4 / 3, callouts, title, tone = 'secondary'}) => {
  const safe = useSafe();
  const frame = useCurrentFrame();
  const enter = useSpringIn(0, {damping: 15});
  const cw = Math.min(safe.w * 0.92, (safe.h - (title ? 140 * safe.u : 40 * safe.u)) * aspect * 0.86);
  const ch = cw / aspect;
  const top = (safe.h - ch) / 2 + (title ? 50 * safe.u : 0);
  const left = (safe.w - cw) / 2;
  const t0 = 14;
  return (
    <SceneBg tone={tone}>
      <Area>
        <Title text={title} />
        <div style={{position: 'absolute', left, top, transform: `scale(${0.88 + 0.12 * enter})`, opacity: Math.min(1, enter * 2)}}>
          <PhotoCard src={src} width={cw} aspect={aspect}>
            {callouts.map((c, i) => {
              const d = t0 + i * 16;
              const p = interpolate(frame, [d, d + 8], [0, 1], clamp);
              const lp = interpolate(frame, [d + 4, d + 14], [0, 1], clamp);
              const px = c.x * cw;
              const py = c.y * ch;
              const ox = (c.dx ?? (c.x < 0.5 ? 0.2 : -0.2)) * cw;
              const oy = (c.dy ?? (c.y < 0.5 ? -0.22 : 0.22)) * ch;
              const lx = Math.min(cw * 0.9, Math.max(cw * 0.1, px + ox));
              const ly = Math.min(ch * 0.94, Math.max(ch * 0.06, py + oy));
              const pulse = 1 + 0.12 * Math.sin((frame - d) / 4);
              const R = 26 * safe.u;
              return (
                <React.Fragment key={i}>
                  <svg width={cw} height={ch} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
                    <line x1={px} y1={py} x2={px + (lx - px) * lp} y2={py + (ly - py) * lp} stroke={colors.line} strokeWidth={6 * safe.u} strokeLinecap="round" />
                    <circle cx={px} cy={py} r={R * pulse * p} fill="rgba(211,72,61,0.28)" stroke={colors.primary} strokeWidth={7 * safe.u} />
                    <circle cx={px} cy={py} r={7 * safe.u * p} fill={colors.line} />
                  </svg>
                  <div style={{position: 'absolute', left: lx, top: ly, transform: 'translate(-50%, -50%)', opacity: lp > 0.6 ? 1 : 0}}>
                    <Label text={c.label} delay={d + 8} color={i % 2 === 0 ? 'primary' : 'white'} size={42} />
                  </div>
                </React.Fragment>
              );
            })}
          </PhotoCard>
        </div>
      </Area>
    </SceneBg>
  );
};

/* ------------------------------------------------------------------------------------------------ */

/** A loupe grows on one spot of a photo and shows it magnified: "look at this detail". */
export const ZoomLens: React.FC<Base & {src: string; aspect?: number; focus: {x: number; y: number}; zoom?: number; label?: string; tone?: Tone}> = ({src, aspect = 4 / 3, focus, zoom = 2.6, label, tone = 'paper', durationInFrames}) => {
  const safe = useSafe();
  const enter = useSpringIn(0, {damping: 15});
  const grow = useProgress(10, Math.max(24, durationInFrames * 0.45));
  const cw = Math.min(safe.w * 0.94, (safe.h - 180 * safe.u) * aspect * 0.9);
  const ch = cw / aspect;
  const top = (safe.h - ch) / 2 - 20 * safe.u;
  const left = (safe.w - cw) / 2;
  const D = cw * 0.52 * grow;
  const px = focus.x * cw;
  const py = focus.y * ch;
  // keep the loupe inside the card, but magnify the point under the focus, not the lens centre
  const lx = Math.min(cw - D / 2 - 6, Math.max(D / 2 + 6, px));
  const ly = Math.min(ch - D / 2 - 6, Math.max(D / 2 + 6, py));
  const z = 1 + (zoom - 1) * grow;
  return (
    <SceneBg tone={tone}>
      <Area>
        <div style={{position: 'absolute', left, top, transform: `scale(${0.9 + 0.1 * enter})`, opacity: Math.min(1, enter * 2)}}>
          <PhotoCard src={src} width={cw} aspect={aspect}>
            <div
              style={{
                position: 'absolute',
                left: lx - D / 2,
                top: ly - D / 2,
                width: D,
                height: D,
                borderRadius: '50%',
                overflow: 'hidden',
                border: edge(10 * safe.u),
                boxShadow: hardShadow(12 * safe.u),
                background: colors.white,
                boxSizing: 'content-box',
                marginLeft: -10 * safe.u,
                marginTop: -10 * safe.u,
              }}
            >
              <Img
                src={staticFile(src)}
                style={{position: 'absolute', width: cw * z, height: ch * z, left: D / 2 - px * z, top: D / 2 - py * z, objectFit: 'contain', maxWidth: 'none'}}
              />
            </div>
            {/* handle */}
            <div style={{position: 'absolute', left: lx + (D / 2) * 0.62, top: ly + (D / 2) * 0.62, width: 150 * safe.u * grow, height: 28 * safe.u, background: colors.line, borderRadius: 14 * safe.u, transformOrigin: '0 50%', transform: 'rotate(45deg)'}} />
          </PhotoCard>
        </div>
        {label ? (
          <div style={{position: 'absolute', left: 0, right: 0, top: top + ch + 70 * safe.u, display: 'flex', justifyContent: 'center'}}>
            <Label text={label} delay={Math.round(durationInFrames * 0.4)} size={52} />
          </div>
        ) : null}
      </Area>
    </SceneBg>
  );
};

/* ------------------------------------------------------------------------------------------------ */

/** A product video (screen recording, promo clip) playing inside a card with a label. */
export const ScreenClip: React.FC<Base & {src: string; trim?: number; rate?: number; aspect?: number; label?: string; tone?: Tone}> = ({src, trim = 0, rate = 1, aspect = 1856 / 1560, label, tone = 'secondary'}) => {
  const safe = useSafe();
  const {fps} = useVideoConfig();
  const enter = useSpringIn(0, {damping: 14});
  const cw = Math.min(safe.w * 0.94, (safe.h - 220 * safe.u) * aspect);
  const ch = cw / aspect;
  const top = (safe.h - ch) / 2 - 30 * safe.u;
  return (
    <SceneBg tone={tone}>
      <Area>
        <div style={{position: 'absolute', left: (safe.w - cw) / 2, top, transform: `translateY(${(1 - enter) * 120}px) rotate(${(1 - enter) * -4}deg)`, opacity: Math.min(1, enter * 2)}}>
          <div
            style={{
              width: cw,
              height: ch,
              border: edge(8 * safe.u),
              borderRadius: 26 * safe.u,
              boxShadow: hardShadow(16 * safe.u),
              boxSizing: 'content-box',
              overflow: 'hidden',
              background: colors.white,
            }}
          >
            <OffthreadVideo src={staticFile(src)} muted trimBefore={Math.round(trim * fps)} playbackRate={rate} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
          </div>
        </div>
        {label ? (
          <div style={{position: 'absolute', left: 0, right: 0, top: top + ch + 70 * safe.u, display: 'flex', justifyContent: 'center'}}>
            <Label text={label} delay={8} size={50} />
          </div>
        ) : null}
      </Area>
    </SceneBg>
  );
};

/* ------------------------------------------------------------------------------------------------ */

/** A film strip of product shots sliding by: the one in focus grows and gets its label, the rest wait at the sides. */
export const Lineup: React.FC<Base & {photos: Photo[]; title?: string; aspect?: number; tone?: Tone}> = ({photos, title, aspect = 4 / 3, tone = 'dark', durationInFrames}) => {
  const safe = useSafe();
  const frame = useCurrentFrame();
  const n = photos.length;
  const enter = useSpringIn(0, {damping: 16});
  const cw = safe.w * 0.78;
  const gap = 40 * safe.u;
  // which photo is in focus: equal time slices, the last one is held to the end
  const slice = Math.max(14, (durationInFrames - 6) / n);
  const SLIDE = 9;
  const f0 = Math.max(0, frame - 4);
  const k = Math.min(n - 1, Math.floor(f0 / slice));
  const q = f0 - k * slice;
  const eased = k === 0 ? 0 : k - 1 + interpolate(q, [0, SLIDE], [0, 1], {...clamp, easing: Easing.bezier(0.7, 0, 0.2, 1)});
  return (
    <SceneBg tone={tone}>
      <Area>
        <Title text={title} />
        <div style={{position: 'absolute', left: 0, right: 0, top: (safe.h - cw / aspect) / 2 - 10 * safe.u, opacity: Math.min(1, enter * 2)}}>
          {photos.map((p, i) => {
            const a = p.aspect ?? aspect;
            const d = i - eased;
            const near = Math.max(0, 1 - Math.abs(d));
            const scale = 0.72 + 0.28 * near;
            const x = safe.w / 2 + d * (cw * 0.62 + gap) - cw / 2;
            return (
              <div key={i} style={{position: 'absolute', left: x, top: 0, width: cw, transform: `scale(${scale})`, transformOrigin: '50% 50%', opacity: 0.45 + 0.55 * near}}>
                <PhotoCard src={p.src} width={cw} aspect={a} fit={p.fit ?? 'contain'} />
              </div>
            );
          })}
        </div>
        <div style={{position: 'absolute', left: 0, right: 0, top: (safe.h - cw / aspect) / 2 + cw / aspect + 70 * safe.u, display: 'flex', justifyContent: 'center'}}>
          {photos.map((p, i) => {
            const near = Math.max(0, 1 - Math.abs(i - eased) * 2.2);
            return p.label ? (
              <div key={i} style={{position: 'absolute', opacity: near, transform: `translateY(${(1 - near) * 30}px)`}}>
                <BrandBox color="primary" depth={10 * safe.u} padding="0.12em 0.4em">
                  <span style={{fontSize: 52 * safe.u, fontWeight: 900, fontFamily: fonts.display, whiteSpace: 'nowrap'}}>{glue(p.label)}</span>
                </BrandBox>
              </div>
            ) : null;
          })}
        </div>
      </Area>
    </SceneBg>
  );
};
