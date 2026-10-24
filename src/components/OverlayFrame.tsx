/**
 * Places every on-face overlay so it never covers a talking head.
 *
 * - Single face: the overlay's real box is measured (at a settled frame), then it is moved and,
 *   if needed, scaled into the free band above the head (or below the chin) — computed from the
 *   face track (analyze_faces.py → plan.layout.faces) and the punch-in zoom at that moment.
 * - Split-screen: overlays are NOT drawn (both people stay visible, the host stays in the upper half). Put
 *   the graphic on a full-frame cutaway instead. `props.panel: true` brings back the old behaviour: a panel
 *   over the *listener's* half (plan.layout.speakers). `props.free: true` draws the overlay as is, anywhere
 *   (use it on top of a full-frame cut).
 * Without face data the overlay renders exactly as before.
 */
import React, {useLayoutEffect, useRef, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender, Easing, Freeze, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {InsetOverride, useSafe} from '../lib/safe';
import type {Backdrop, EditPlan, Look, Overlay} from '../types';
import {SceneLook} from './Look';
import {BackdropContext, SceneBg, type Tone} from './scenes/common';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const EXTREME = Easing.bezier(0.85, 0, 0.15, 1);

export const splitAt = (plan: EditPlan, s: number, e: number) => (plan.layout?.splitScreen ?? []).find((r) => s < r.end && e > r.start);

/** Who is talking at time t during split-screen ('top' | 'bottom'), if known. */
export const speakerAt = (plan: EditPlan, t: number) => {
  const sp = plan.layout?.speakers ?? [];
  const hit = sp.find((x) => t >= x.start && t < x.end);
  if (hit) return hit.who;
  // nearest segment of the same split
  const r = (plan.layout?.splitScreen ?? []).find((x) => t >= x.start && t < x.end);
  const inSplit = r ? sp.filter((x) => x.start < r.end && x.end > r.start) : [];
  return inSplit.length ? inSplit.reduce((a, b) => (Math.abs(b.start - t) < Math.abs(a.start - t) ? b : a)).who : undefined;
};

/** Hair-top / chin of the main face (px, unzoomed output frame) over the [s, e] window. */
export const faceSpan = (plan: EditPlan, s: number, e: number, H: number) => {
  const faces = plan.layout?.faces ?? [];
  if (!faces.length) return null;
  let pick = faces.filter(([t]) => t >= s - 0.3 && t <= e + 0.3);
  if (!pick.length) {
    const mid = (s + e) / 2;
    const near = faces.reduce((a, b) => (Math.abs(b[0] - mid) < Math.abs(a[0] - mid) ? b : a));
    if (Math.abs(near[0] - mid) > 2) return null;
    pick = [near];
  }
  let hair = Infinity;
  let chin = -Infinity;
  for (const [, , y, , h] of pick) {
    hair = Math.min(hair, (y - h * 0.16) * H); // hair above the detected box (forehead → crown)
    chin = Math.max(chin, (y + h * 1.02) * H);
  }
  return {hair, chin};
};

export type Room = {start: number; end: number; scale: number; y: number; hair: number; band: [number, number]};

/** Rough height (px at u=1) an overlay needs, from its component and text, so the card shrinks only as much as needed. */
export const overlayNeed = (o?: Overlay) => {
  if (!o) return 300;
  const p = (o.props ?? {}) as Record<string, unknown>;
  const len = (v: unknown) => (typeof v === 'string' ? v.length : 0);
  switch (o.component) {
    case 'HookTitle':
      return 60 + 101 * Math.max(1, Math.ceil(len(p.text) / 15)) * 0.7; // hooks may shrink a little
    case 'KeywordPop':
      return 150 + (len(p.text) > 17 ? 115 : 0) + (p.sub ? 75 : 0);
    case 'StatBadge':
      return 270;
    case 'Sticker':
      return 170;
    case 'ListOverlay':
      return 120 + 95 * (Array.isArray(p.items) ? p.items.length : 3);
    case 'ProductCard':
      return 330;
    default:
      return 260;
  }
};

/**
 * Make room for an on-face overlay: shrink the talking head into a card (scale, top y) just enough
 * that a band of ~300u opens above the hair while the chin stays above the caption band.
 * Returns null when there is no face data; scale 1 when the framing already leaves enough room.
 */
export const roomFor = (plan: EditPlan, s: number, e: number, W: number, H: number, insets: {top: number; bottom: number}, o?: Overlay): Room | null => {
  const f = faceSpan(plan, s, e, H);
  if (!f) return null;
  const u = Math.min(W, H) / 1080;
  const m = 18 * u;
  const want = overlayNeed(o) * u;
  const safeH = H - insets.top - insets.bottom;
  const capTop = H - (insets.bottom + safeH * 0.035) - 120 * u;
  if (f.hair - insets.top - m >= want * 0.9) return {start: s, end: e, scale: 1, y: 0, hair: f.hair, band: [insets.top + 6 * u, f.hair - m]};
  const sc = Math.max(0.6, Math.min(1, (capTop - m - insets.top - m - want) / Math.max(1, f.chin - f.hair)));
  const y = Math.max(0, capTop - m - f.chin * sc);
  return {start: s, end: e, scale: sc, y, hair: f.hair, band: [insets.top + 6 * u, y + f.hair * sc - m]};
};

const SKIP_ROOM = new Set(['ProgressBar', 'CTA', 'LowerThird']);

/** Room windows for every on-face overlay of a short (not during split-screen); merged when close. */
export const roomWindows = (plan: EditPlan, W: number, H: number, insets: {top: number; bottom: number}): Room[] => {
  if (plan.format !== 'short') return [];
  const out: Room[] = [];
  for (const o of plan.overlays ?? []) {
    if (SKIP_ROOM.has(o.component) || splitAt(plan, o.start, o.end)) continue;
    const r = roomFor(plan, o.start, o.end, W, H, insets, o);
    if (!r || r.scale >= 0.999) continue;
    const prev = out[out.length - 1];
    if (prev && r.start - prev.end < 0.6) {
      prev.end = Math.max(prev.end, r.end);
      prev.scale = Math.min(prev.scale, r.scale);
      prev.y = Math.max(prev.y, r.y);
      prev.hair = Math.min(prev.hair, r.hair);
    } else out.push({...r});
  }
  // the band each overlay gets = above the hair of the (possibly merged) card
  const u = Math.min(W, H) / 1080;
  for (const r of out) r.band = [insets.top + 6 * u, r.y + r.hair * r.scale - 18 * u];
  return out;
};

/** Measure the overlay once at a settled frame, then fit it into a free band away from the face. */
const FaceFit: React.FC<{band: [number, number]; durationInFrames: number; children: React.ReactNode}> = ({band, durationInFrames, children}) => {
  const {width: W} = useVideoConfig();
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{top: number; bottom: number} | null>(null);
  const [handle] = useState(() => delayRender('measure overlay'));
  useLayoutEffect(() => {
    const el = ref.current;
    if (el) {
      const root = el.getBoundingClientRect();
      const sc = root.width / W || 1;
      let top = Infinity;
      let bottom = -Infinity;
      el.querySelectorAll('*').forEach((n) => {
        const r = (n as HTMLElement).getBoundingClientRect();
        if (r.width < 2 || r.height < 2) return;
        if (r.width >= root.width * 0.97 && r.height >= root.height * 0.9) return; // full-frame wrappers
        top = Math.min(top, (r.top - root.top) / sc);
        bottom = Math.max(bottom, (r.bottom - root.top) / sc);
      });
      if (Number.isFinite(top)) setBox({top, bottom});
    }
    continueRender(handle);
    // measure once: the settled layout doesn't change between frames
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  let style: React.CSSProperties = {};
  if (box) {
    const [a, b] = band;
    const boxH = box.bottom - box.top;
    if (box.top < a || box.bottom > b) {
      const k = Math.max(0.45, Math.min(1, (b - a) / boxH));
      const newTop = a + Math.max(0, (b - a - k * boxH) / 2);
      style = {transform: `translateY(${newTop - box.top}px) scale(${k})`, transformOrigin: `${W / 2}px ${box.top}px`};
    }
  }
  return (
    <AbsoluteFill>
      <AbsoluteFill ref={ref} style={{visibility: 'hidden', pointerEvents: 'none'}}>
        <Freeze frame={Math.min(durationInFrames - 1, 14)}>{children}</Freeze>
      </AbsoluteFill>
      <AbsoluteFill style={style}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

const PANEL_TONES: Record<string, Tone[]> = {
  primary: ['paper', 'secondary', 'dark'],
  white: ['primary', 'secondary', 'dark'],
  dark: ['paper', 'primary', 'secondary'],
};
const PANEL_BG: Backdrop[] = ['grid', 'dots', 'rays', 'shapes', 'classic'];

/** A graphic that takes over the listener's half of a split-screen. */
const HalfPanel: React.FC<{half: 'top' | 'bottom'; tone: Tone; bg: Backdrop; look: Required<Look> | null; durationInFrames: number; children: React.ReactNode}> = ({
  half,
  tone,
  bg,
  look,
  durationInFrames,
  children,
}) => {
  const frame = useCurrentFrame();
  const {height: H} = useVideoConfig();
  const safe = useSafe();
  const inP = interpolate(frame, [0, 7], [0, 1], {...clamp, easing: EXTREME});
  const outP = interpolate(frame, [durationInFrames - 6, durationInFrames], [0, 1], {...clamp, easing: EXTREME});
  const y0 = half === 'top' ? 0 : H / 2;
  const clip = `inset(${y0}px ${(1 - inP) * 100}% ${H - y0 - H / 2}px ${outP * 100}%)`;
  // the caption sits on this panel's side of the seam, so keep ~150u clear there
  const cap = 150 * safe.u;
  const insets = half === 'top' ? {top: safe.insets.top, bottom: H / 2 + cap} : {top: H / 2 + cap, bottom: safe.insets.bottom};
  const body = (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: 0, right: 0, top: y0, height: H / 2, overflow: 'hidden'}}>
        <BackdropContext.Provider value={bg}>
          <SceneBg tone={tone} />
        </BackdropContext.Provider>
      </div>
      <InsetOverride insets={insets}>{children}</InsetOverride>
    </AbsoluteFill>
  );
  return <AbsoluteFill style={{clipPath: clip}}>{look ? <SceneLook look={look}>{body}</SceneLook> : body}</AbsoluteFill>;
};

const SKIP = new Set(['ProgressBar']);

export const OverlayFrame: React.FC<{plan: EditPlan; overlay: Overlay; index: number; durationInFrames: number; look: Required<Look> | null; render: (propsOverride?: Record<string, unknown>) => React.ReactNode}> = ({
  plan,
  overlay: o,
  index,
  durationInFrames,
  look,
  render,
}) => {
  const {width: W, height: H} = useVideoConfig();
  const safe = useSafe();
  if (plan.format !== 'short' || SKIP.has(o.component)) return <>{render()}</>;
  const props = (o.props ?? {}) as Record<string, unknown>;
  // `free`: draw it exactly where the component puts it (e.g. a hook title over a full-frame photo cut)
  if (props.free) return <>{render()}</>;
  const split = splitAt(plan, o.start, o.end);
  // A split-screen keeps both people in view: graphics go on full-frame cutaways, not on a half. `panel: true` opts in.
  if (split && !props.panel) return null;
  if (split) {
    const who = speakerAt(plan, Math.max(o.start, split.start));
    if (!who) return <>{render()}</>;
    const half = who === 'top' ? 'bottom' : 'top';
    const color = String((o.props ?? {}).color ?? 'primary');
    const tones = PANEL_TONES[color] ?? PANEL_TONES.primary;
    return (
      <HalfPanel half={half} tone={tones[index % tones.length]} bg={PANEL_BG[index % PANEL_BG.length]} look={look} durationInFrames={durationInFrames}>
        {render({position: 'center', tilt: 0})}
      </HalfPanel>
    );
  }
  if (SKIP_ROOM.has(o.component)) return <>{render()}</>;
  const card = roomWindows(plan, W, H, safe.insets).find((r) => o.start < r.end && o.end > r.start);
  const room = card ?? roomFor(plan, o.start, o.end, W, H, safe.insets, o);
  if (!room) return <>{render()}</>;
  return (
    <FaceFit band={room.band} durationInFrames={durationInFrames}>
      {render()}
    </FaceFit>
  );
};
