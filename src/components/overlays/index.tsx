/**
 * Overlays sit ON TOP of the talking head (and captions sit on top of overlays).
 * Every overlay positions itself inside the platform safe area via useSafe().
 * Each receives its plan props plus `durationInFrames`.
 * Document new overlays in .claude/skills/vertical-motion-editor/references/components.md
 */
import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {colors, dropShadow, fonts, glue, LOCALE, textOutline} from '../../brand';
import {clamp, useExit, useProgress, useSpringIn} from '../../lib/anim';
import {useSafe} from '../../lib/safe';
import {BoxColor, BrandBox} from '../BrandBox';

type Base = {durationInFrames: number};
type Pos = 'top' | 'upper' | 'center' | 'lower' | 'seam';
/** 'seam' boxes hang above the split-screen seam: shift up by their own height. */
const seamShift = (p: Pos) => (p === 'seam' ? 'translateY(-100%)' : p === 'center' ? 'translateY(-50%)' : undefined);

/** Box that drops in from above, lands, then extrudes. */
const DropIn: React.FC<{durationInFrames: number; delay?: number; children: (extrude: number) => React.ReactNode; style?: React.CSSProperties}> = ({
  durationInFrames,
  delay = 0,
  children,
  style,
}) => {
  const s = useSpringIn(delay);
  const ex = useSpringIn(delay + 5, {damping: 12});
  const exit = useExit(durationInFrames);
  return (
    <div
      style={{
        transform: `translateY(${(1 - s) * -60}px) scale(${0.9 + 0.1 * s})`,
        opacity: Math.min(1, s * 2) * exit,
        ...style,
      }}
    >
      {children(ex)}
    </div>
  );
};

/** Big hook headline for the first 1–3 s of a short. 1–2 lines, ≤ 6 words. */
export const HookTitle: React.FC<Base & {text: string; highlight?: string; color?: BoxColor; position?: Pos}> = ({
  text,
  highlight,
  color = 'primary',
  position = 'top',
  durationInFrames,
}) => {
  const safe = useSafe();
  const size = (safe.isShort ? 92 : 84) * safe.u;
  text = glue(text);
  highlight = highlight ? glue(highlight) : highlight;
  const parts = highlight && text.includes(highlight) ? text.split(highlight) : [text];
  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          top: safe.anchorY(position),
          left: safe.x,
          width: safe.w,
          display: 'flex',
          justifyContent: 'center',
          transform: seamShift(position),
        }}
      >
        <DropIn durationInFrames={durationInFrames}>
          {(ex) => (
            <BrandBox color={color} extrude={ex} depth={20 * safe.u} padding="0.15em 0.35em" faceStyle={{textAlign: 'center', maxWidth: safe.w - 40}}>
              <span style={{fontSize: size, fontWeight: 900}}>
                {parts.length === 2 ? (
                  <>
                    {parts[0]}
                    <span style={{color: color === 'dark' ? colors.primary : colors.white, whiteSpace: 'nowrap', ...textOutline(4 * safe.u)}}>{highlight}</span>
                    {parts[1]}
                  </>
                ) : (
                  text
                )}
              </span>
            </BrandBox>
          )}
        </DropIn>
      </div>
    </AbsoluteFill>
  );
};

/** A single keyword / short phrase popping as a brand box. The workhorse overlay. */
export const KeywordPop: React.FC<Base & {text: string; sub?: string; color?: BoxColor; position?: Pos; align?: 'left' | 'center' | 'right'; tilt?: number}> = ({
  text,
  sub,
  color = 'primary',
  position = 'top',
  align = 'center',
  tilt = -3,
  durationInFrames,
}) => {
  const safe = useSafe();
  const size = (safe.isShort ? 84 : 72) * safe.u;
  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          top: safe.anchorY(position),
          left: safe.x,
          width: safe.w,
          transform: seamShift(position),
          display: 'flex',
          flexDirection: 'column',
          alignItems: {left: 'flex-start', center: 'center', right: 'flex-end'}[align],
          gap: 18 * safe.u,
        }}
      >
        <DropIn durationInFrames={durationInFrames} style={{transformOrigin: 'center', rotate: `${tilt}deg`}}>
          {(ex) => (
            <BrandBox color={color} extrude={ex} depth={18 * safe.u}>
              <span style={{fontSize: size, fontWeight: 900}}>{glue(text)}</span>
            </BrandBox>
          )}
        </DropIn>
        {sub ? (
          <DropIn durationInFrames={durationInFrames} delay={6}>
            {(ex) => (
              <BrandBox color="white" extrude={ex} depth={10 * safe.u} stroke={5 * safe.u}>
                <span style={{fontSize: size * 0.45, fontWeight: 700}}>{glue(sub)}</span>
              </BrandBox>
            )}
          </DropIn>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

/** Name + role. Long form: bottom-left. Short: upper safe area. */
export const LowerThird: React.FC<Base & {name: string; title?: string}> = ({name, title, durationInFrames}) => {
  const safe = useSafe();
  const size = 58 * safe.u;
  const slide = useSpringIn(0);
  const slide2 = useSpringIn(5);
  const exit = useExit(durationInFrames);
  const top = safe.isShort ? safe.anchorY('top') : undefined;
  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          left: safe.x,
          top,
          bottom: safe.isShort ? undefined : safe.insets.bottom + 90 * safe.u,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 10 * safe.u,
          opacity: exit,
        }}
      >
        <div style={{transform: `translateX(${(1 - slide) * -120}%)`}}>
          <BrandBox color="primary" extrude={slide} depth={14 * safe.u}>
            <span style={{fontSize: size, fontWeight: 900}}>{name}</span>
          </BrandBox>
        </div>
        {title ? (
          <div style={{transform: `translateX(${(1 - slide2) * -120}%)`}}>
            <BrandBox color="white" extrude={slide2} depth={8 * safe.u} stroke={5 * safe.u}>
              <span style={{fontSize: size * 0.55, fontWeight: 700}}>{title}</span>
            </BrandBox>
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

const formatNumber = (n: number, decimals: number, locale: string) =>
  n.toLocaleString(locale, {minimumFractionDigits: decimals, maximumFractionDigits: decimals});

/** Counting number badge, e.g. "699 €", "400×", "2,4 mil. €". */
export const StatBadge: React.FC<
  Base & {value: number; from?: number; prefix?: string; suffix?: string; label?: string; decimals?: number; locale?: string; position?: Pos; color?: BoxColor}
> = ({value, from = 0, prefix = '', suffix = '', label, decimals = 0, locale = LOCALE, position = 'top', color = 'primary', durationInFrames}) => {
  const safe = useSafe();
  const p = useProgress(3, Math.max(8, Math.min(26, durationInFrames * 0.35)));
  const size = (safe.isShort ? 130 : 110) * safe.u;
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', top: safe.anchorY(position), left: safe.x, width: safe.w, transform: seamShift(position), display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 * safe.u}}>
        <DropIn durationInFrames={durationInFrames}>
          {(ex) => (
            <BrandBox color={color} extrude={ex} depth={22 * safe.u}>
              <span style={{fontSize: size, fontWeight: 900, fontVariantNumeric: 'tabular-nums'}}>
                {prefix}
                {formatNumber(from + (value - from) * p, decimals, locale)}
                {suffix}
              </span>
            </BrandBox>
          )}
        </DropIn>
        {label ? (
          <DropIn durationInFrames={durationInFrames} delay={8}>
            {(ex) => (
              <BrandBox color="white" extrude={ex} depth={10 * safe.u} stroke={5 * safe.u}>
                <span style={{fontSize: size * 0.34, fontWeight: 700}}>{label}</span>
              </BrandBox>
            )}
          </DropIn>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

/** Product picture-in-picture card: image in a brand frame + name (+ price/spec). */
export const ProductCard: React.FC<Base & {image: string; name: string; detail?: string; side?: 'left' | 'right'; position?: Pos}> = ({
  image,
  name,
  detail,
  side = 'right',
  position = 'top',
  durationInFrames,
}) => {
  const safe = useSafe();
  const s = useSpringIn(0);
  const exit = useExit(durationInFrames);
  const cardW = (safe.isShort ? 480 : 520) * safe.u;
  const top = safe.isShort ? safe.anchorY(position) : safe.y + 40 * safe.u;
  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          top,
          [side]: safe.insets[side] + 10 * safe.u,
          width: cardW,
          transform: `translateX(${(1 - s) * (side === 'right' ? 130 : -130)}%) rotate(${side === 'right' ? 2 : -2}deg)`,
          opacity: exit,
        }}
      >
        <BrandBox color="white" extrude={s} depth={22 * safe.u} padding={14 * safe.u} style={{display: 'block'}}>
          <div style={{width: '100%', aspectRatio: '4 / 3', background: colors.white, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'}}>
            <Img src={staticFile(image)} style={{maxWidth: '100%', maxHeight: '100%', objectFit: 'contain'}} />
          </div>
          <div style={{marginTop: 12 * safe.u, background: colors.primary, border: `${5 * safe.u}px solid black`, padding: `${8 * safe.u}px ${16 * safe.u}px`}}>
            <div style={{fontFamily: fonts.display, fontWeight: 900, fontSize: 46 * safe.u, lineHeight: 1.05}}>{name}</div>
            {detail ? <div style={{fontFamily: fonts.body, fontWeight: 700, fontSize: 30 * safe.u, marginTop: 4 * safe.u}}>{detail}</div> : null}
          </div>
        </BrandBox>
      </div>
    </AbsoluteFill>
  );
};

/** Numbered list that builds item by item (items appear every `stagger` frames). */
export const ListOverlay: React.FC<Base & {title?: string; items: string[]; stagger?: number; position?: Pos}> = ({
  title,
  items,
  stagger = 12,
  position = 'top',
  durationInFrames,
}) => {
  const safe = useSafe();
  const size = (safe.isShort ? 54 : 46) * safe.u;
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', top: safe.anchorY(position), left: safe.x + 10 * safe.u, width: safe.w, display: 'flex', flexDirection: 'column', gap: 18 * safe.u, alignItems: 'flex-start'}}>
        {title ? (
          <DropIn durationInFrames={durationInFrames}>
            {(ex) => (
              <BrandBox color="dark" extrude={ex} depth={12 * safe.u}>
                <span style={{fontSize: size * 1.1, fontWeight: 900}}>{title}</span>
              </BrandBox>
            )}
          </DropIn>
        ) : null}
        {items.map((it, i) => (
          <DropIn key={i} durationInFrames={durationInFrames} delay={(title ? 8 : 0) + i * stagger}>
            {(ex) => (
              <BrandBox color={i % 2 ? 'white' : 'primary'} extrude={ex} depth={12 * safe.u} stroke={5 * safe.u}>
                <span style={{fontSize: size, fontWeight: 800}}>
                  {i + 1}. {it}
                </span>
              </BrandBox>
            )}
          </DropIn>
        ))}
      </div>
    </AbsoluteFill>
  );
};

/** Emoji / symbol sticker that bounces in. Good for reactions ("🤯", "✅", "❌"). */
export const Sticker: React.FC<Base & {text: string; x?: number; y?: number; size?: number}> = ({text, x = 0.8, y = 0.12, size = 150, durationInFrames}) => {
  const safe = useSafe();
  const s = useSpringIn(0, {damping: 8, stiffness: 200});
  const exit = useExit(durationInFrames);
  const frame = useCurrentFrame();
  const wobble = Math.sin(frame / 6) * 4;
  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          left: safe.x + safe.w * x,
          top: safe.y + safe.h * y,
          fontSize: size * safe.u,
          transform: `translate(-50%, -50%) scale(${s * exit}) rotate(${wobble}deg)`,
          filter: dropShadow(6),
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

/** Thin progress bar along the top of the safe area (retention device for shorts). */
export const ProgressBar: React.FC<Base> = ({durationInFrames}) => {
  const safe = useSafe();
  const frame = useCurrentFrame();
  const p = interpolate(frame, [0, durationInFrames], [0, 1], clamp);
  const h = 14 * safe.u;
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', top: safe.y - h - 16 * safe.u, left: safe.x, width: safe.w, height: h, border: `${4 * safe.u}px solid black`, background: colors.white}}>
        <div style={{width: `${p * 100}%`, height: '100%', background: colors.primary}} />
      </div>
    </AbsoluteFill>
  );
};

/** Call to action, e.g. "Watch the full video" / "Follow for more". */
export const CTA: React.FC<Base & {text: string; sub?: string; position?: Pos}> = ({text, sub, position = 'center', durationInFrames}) => (
  <KeywordPop text={text} sub={sub} color="dark" position={position} tilt={0} durationInFrames={durationInFrames} />
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const OVERLAYS: Record<string, React.FC<any>> = {
  HookTitle,
  KeywordPop,
  LowerThird,
  StatBadge,
  ProductCard,
  ListOverlay,
  Sticker,
  ProgressBar,
  CTA,
};
