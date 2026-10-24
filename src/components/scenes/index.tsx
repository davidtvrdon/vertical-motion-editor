/**
 * Scenes are FULL-FRAME animated cutaways (the "animation" alternative to b-roll).
 * Used from plan.cuts[] with {type: "scene", scene: "<Name>", props: {...}}.
 * Each receives its props plus `durationInFrames`. Keep text inside the safe area.
 * Document new scenes in .claude/skills/vertical-motion-editor/references/components.md
 */
import React from 'react';
import {AbsoluteFill, Audio, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {colors, dropShadow, edge, fonts, glue, hatchDiagonal, LOCALE, textOutline, theme} from '../../brand';
import {clamp, useProgress, useSpringIn} from '../../lib/anim';
import {useSafe} from '../../lib/safe';
import {BoxColor, BrandBox} from '../BrandBox';

import {Base, Center, Drop, fmt, SceneBg, Tone, TONE} from './common';
import {BigQuestion, ChatMock, FlowDiagram} from './explainers';
import {Crowd, Hub, LaggardRace, RankSwap, Verdict} from './stories';
import {Acquisition, Balance, Battery, BeforeAfter, CalendarDate, EventTimeline, LayerStack, MoneyFlow, Newspaper, PhoneNotification, PriceTag, SearchBar, SocialPost, Terminal, WorldMap} from './worlds';
import {Blockers, DecisionCard, Gauge, GrowthCurve, IntervalTimeline, Outgrow, PredictionCard, ReleaseRace, SortingPipeline, Trajectory} from './schematics';
import {LockedGrid, PortPlug, SignalBars, Thermometer} from './devices';
import {ImageWipe, LookAlike, SiteBuild, SiteWall} from './web';
import {Callouts, Hero, Lineup, PhotoStack, ScreenClip, ZoomLens} from './media';
import {Marker} from '../Marker';

export {SceneBg};


/** One huge number counting up + label. "400× cheaper", "$699". */
export const BigNumber: React.FC<Base & {value: number; from?: number; prefix?: string; suffix?: string; label?: string; decimals?: number; locale?: string; tone?: Tone}> = ({
  value,
  from = 0,
  prefix = '',
  suffix = '',
  label,
  decimals = 0,
  locale = LOCALE,
  tone = 'paper',
  durationInFrames,
}) => {
  const safe = useSafe();
  const p = useProgress(3, Math.max(8, Math.min(30, durationInFrames * 0.35)));
  const t = TONE[tone];
  // shrink long values ("50 rokov", "1 199 €") so they stay on one line
  const chars = `${prefix}${fmt(value, decimals, locale)}${suffix}`.length;
  const size = (safe.isShort ? 210 : 230) * safe.u * Math.min(1, (safe.isShort ? 5.2 : 9) / chars);
  return (
    <SceneBg tone={tone}>
      <Center gap={70}>
        <Drop>
          {(ex) => (
            <BrandBox color={t.box} extrude={ex} depth={34 * safe.u} stroke={9 * safe.u} padding="0.05em 0.25em">
              <span style={{fontSize: size, fontWeight: 900, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.04em', whiteSpace: 'nowrap'}}>
                {prefix}
                {fmt(from + (value - from) * p, decimals, locale)}
                {suffix}
              </span>
            </BrandBox>
          )}
        </Drop>
        {label ? (
          <Drop delay={10} from="bottom">
            {(ex) => (
              <BrandBox color={t.alt} extrude={ex} depth={14 * safe.u}>
                <span style={{fontSize: 64 * safe.u, fontWeight: 800}}>{glue(label)}</span>
              </BrandBox>
            )}
          </Drop>
        ) : null}
      </Center>
    </SceneBg>
  );
};

/** Words slam in one after another. Use for the core statement of a segment. */
/**
 * Words slam in one after another. `highlightStyle`: 'box' (brand box) or 'marker' (felt-marker
 * swipe behind the word, the Vox move). Use marker on paper/dark tones, box on primary/secondary.
 */
export const KineticTitle: React.FC<Base & {text: string; highlight?: string[]; highlightStyle?: 'box' | 'marker'; tone?: Tone}> = ({
  text,
  highlight = [],
  highlightStyle = 'box',
  tone = 'primary',
  durationInFrames,
}) => {
  const safe = useSafe();
  const frame = useCurrentFrame();
  const words = text.split(/\s+/).filter(Boolean);
  const per = Math.max(3, Math.min(8, Math.floor((durationInFrames * 0.55) / words.length)));
  const t = TONE[tone];
  const size = (safe.isShort ? 130 : 120) * safe.u * (words.length > 6 ? 0.75 : 1);
  const hl = new Set(highlight.map((h) => h.toLowerCase()));
  return (
    <SceneBg tone={tone}>
      <Center>
        <div style={{display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: `${size * 0.12}px ${size * 0.25}px`, maxWidth: safe.w}}>
          {words.map((w, i) => {
            const local = frame - i * per;
            const s = interpolate(local, [0, 5], [0, 1], clamp);
            const isHl = hl.has(w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, ''));
            const style: React.CSSProperties = {
              display: 'inline-block',
              transform: `scale(${2.2 - 1.2 * s})`,
              opacity: s,
              fontFamily: fonts.display,
              fontWeight: 900,
              fontSize: size,
              lineHeight: 1,
              letterSpacing: '-0.03em',
              color: t.fg,
            };
            if (isHl && highlightStyle === 'marker') {
              return (
                <span key={i} style={{...style, color: tone === 'dark' ? colors.white : colors.line}}>
                  <Marker delay={i * per + 3} seed={i + 1} color={tone === 'primary' ? colors.white : colors.primary}>
                    {w}
                  </Marker>
                </span>
              );
            }
            return isHl ? (
              <div key={i} style={{...style, color: undefined}}>
                <BrandBox color={t.alt === 'white' ? 'white' : 'dark'} depth={16 * safe.u} padding="0.02em 0.18em">
                  <span style={{fontSize: size * 0.95, fontWeight: 900}}>{w}</span>
                </BrandBox>
              </div>
            ) : (
              <span key={i} style={style}>
                {w}
              </span>
            );
          })}
        </div>
      </Center>
    </SceneBg>
  );
};

type Side = {label: string; value?: string; image?: string};

/** A vs B. Two boxes slide in from the sides, "VS" drops in the middle. */
export const Versus: React.FC<Base & {left: Side; right: Side; title?: string; tone?: Tone}> = ({left, right, title, tone = 'paper'}) => {
  const safe = useSafe();
  const vs = useSpringIn(14, {damping: 9});
  const size = (safe.isShort ? 88 : 64) * safe.u;
  const card = (side: Side, color: BoxColor, delay: number, from: 'left' | 'right') => (
    <Drop delay={delay} from={from}>
      {(ex) => (
        <BrandBox color={color} extrude={ex} depth={20 * safe.u} padding={24 * safe.u} style={{display: 'block'}}>
          <div style={{width: (safe.isShort ? 780 : 560) * safe.u, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 * safe.u}}>
            {side.image ? <Img src={staticFile(side.image)} style={{height: 260 * safe.u, maxWidth: '100%', objectFit: 'contain'}} /> : null}
            <span style={{fontSize: size, fontWeight: 900}}>{side.label}</span>
            {side.value ? <span style={{fontSize: size * 0.7, fontWeight: 700}}>{side.value}</span> : null}
          </div>
        </BrandBox>
      )}
    </Drop>
  );
  return (
    <SceneBg tone={tone}>
      <Center gap={safe.isShort ? 26 : 40}>
        {title ? (
          <Drop>
            {(ex) => (
              <BrandBox color="dark" extrude={ex} depth={12 * safe.u}>
                <span style={{fontSize: size * 0.9, fontWeight: 900}}>{title}</span>
              </BrandBox>
            )}
          </Drop>
        ) : null}
        <div style={{display: 'flex', flexDirection: safe.isShort ? 'column' : 'row', alignItems: 'center', gap: 30 * safe.u}}>
          {card(left, 'primary', 2, 'left')}
          <div
            style={{
              fontFamily: fonts.display,
              fontWeight: 900,
              fontSize: (safe.isShort ? 150 : 110) * safe.u,
              color: colors.white,
              ...textOutline(10 * safe.u),
              transform: `scale(${vs}) rotate(${(1 - vs) * -40}deg)`,
            }}
          >
            VS
          </div>
          {card(right, 'white', 8, 'right')}
        </div>
      </Center>
    </SceneBg>
  );
};

/** Animated bar chart. `highlight` = index of the bar drawn in red. */
export const BarChart: React.FC<Base & {title?: string; bars: {label: string; value: number}[]; unit?: string; highlight?: number; tone?: Tone; locale?: string}> = ({
  title,
  bars,
  unit = '',
  highlight,
  tone = 'paper',
  locale = LOCALE,
  durationInFrames,
}) => {
  const safe = useSafe();
  const frame = useCurrentFrame();
  const max = Math.max(...bars.map((b) => b.value), 1);
  const chartH = (safe.isShort ? 820 : 520) * safe.u;
  const barW = Math.min(180 * safe.u, (safe.w * 0.85) / bars.length - 30 * safe.u);
  const t = TONE[tone];
  const span = Math.max(10, durationInFrames * 0.5);
  return (
    <SceneBg tone={tone}>
      <Center gap={50}>
        {title ? (
          <Drop>
            {(ex) => (
              <BrandBox color="dark" extrude={ex} depth={12 * safe.u}>
                <span style={{fontSize: 76 * safe.u, fontWeight: 900}}>{title}</span>
              </BrandBox>
            )}
          </Drop>
        ) : null}
        <div style={{display: 'flex', alignItems: 'flex-end', gap: 30 * safe.u, height: chartH, borderBottom: `${8 * safe.u}px solid ${t.fg}`, padding: `0 ${20 * safe.u}px`}}>
          {bars.map((b, i) => {
            const p = interpolate(frame, [4 + (i * span) / bars.length / 2, 4 + (i * span) / bars.length / 2 + span / 2], [0, 1], {...clamp});
            const eased = 1 - Math.pow(1 - p, 3);
            const h = (b.value / max) * (chartH - 170 * safe.u) * eased;
            const isHl = highlight === i;
            return (
              <div key={i} style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 * safe.u, width: barW}}>
                <span style={{fontFamily: fonts.display, fontWeight: 900, fontSize: 56 * safe.u, color: t.fg, opacity: p > 0.2 ? 1 : 0}}>
                  {fmt(b.value * eased, 0, locale)}
                  {unit}
                </span>
                <div
                  style={{
                    width: '100%',
                    height: h,
                    border: edge(6 * safe.u),
                    borderBottom: 'none',
                    background: isHl ? colors.primary : tone === 'dark' ? colors.white : hatchDiagonal(4, 12, colors.line, colors.white),
                  }}
                />
              </div>
            );
          })}
        </div>
        <div style={{display: 'flex', gap: 30 * safe.u, padding: `0 ${20 * safe.u}px`, marginTop: -30 * safe.u}}>
          {bars.map((b, i) => (
            <span key={i} style={{width: barW, fontFamily: fonts.display, fontWeight: 800, fontSize: 44 * safe.u, color: t.fg, textAlign: 'center', lineHeight: 1.1}}>
              {b.label}
            </span>
          ))}
        </div>
      </Center>
    </SceneBg>
  );
};

/** Full-screen numbered list. */
export const ListScene: React.FC<Base & {title?: string; items: string[]; tone?: Tone}> = ({title, items, tone = 'primary', durationInFrames}) => {
  const safe = useSafe();
  const frame = useCurrentFrame();
  const stagger = Math.max(4, Math.min(14, Math.floor((durationInFrames * 0.6) / Math.max(1, items.length))));
  return (
    <SceneBg tone={tone}>
      <Center gap={34}>
        {title ? (
          <Drop>
            {(ex) => (
              <BrandBox color="dark" extrude={ex} depth={14 * safe.u}>
                <span style={{fontSize: (safe.isShort ? 100 : 76) * safe.u, fontWeight: 900}}>{title}</span>
              </BrandBox>
            )}
          </Drop>
        ) : null}
        {items.map((it, i) => {
          // Vox list focus: once the next item lands, earlier ones step back (dim + shrink),
          // so the eye always sits on the newest point.
          const nextAt = 6 + (i + 1) * stagger;
          const back = i < items.length - 1 ? interpolate(frame, [nextAt, nextAt + 6], [0, 1], clamp) : 0;
          return (
            <div key={i} style={{opacity: 1 - 0.6 * back, transform: `scale(${1 - 0.08 * back})`}}>
              <Drop delay={6 + i * stagger} from="left">
                {(ex) => (
                  <BrandBox color={i % 2 ? 'paper' : 'white'} extrude={ex * (1 - back)} depth={12 * safe.u}>
                    <span style={{fontSize: (safe.isShort ? 76 : 56) * safe.u, fontWeight: 800}}>
                      <span style={{color: colors.primary, ...textOutline(3 * safe.u)}}>{i + 1}</span> {it}
                    </span>
                  </BrandBox>
                )}
              </Drop>
            </div>
          );
        })}
      </Center>
    </SceneBg>
  );
};

/** Product hero: image on brand background, brand box with name, optional detail/price. */
export const ProductShowcase: React.FC<Base & {image: string; name: string; detail?: string; price?: string; tone?: Tone}> = ({image, name, detail, price, tone = 'paper', durationInFrames}) => {
  const safe = useSafe();
  const frame = useCurrentFrame();
  const s = useSpringIn(0, {damping: 16});
  const drift = interpolate(frame, [0, durationInFrames], [1, 1.06]);
  const imgH = (safe.isShort ? 760 : 560) * safe.u;
  return (
    <SceneBg tone={tone}>
      <Center gap={34}>
        <div style={{transform: `scale(${(0.8 + 0.2 * s) * drift})`, opacity: s}}>
          <Img src={staticFile(image)} style={{maxHeight: imgH, maxWidth: safe.w * (safe.isShort ? 0.95 : 0.6), objectFit: 'contain', filter: dropShadow(18)}} />
        </div>
        <Drop delay={8} from="bottom">
          {(ex) => (
            <BrandBox color="primary" extrude={ex} depth={20 * safe.u}>
              <span style={{fontSize: 80 * safe.u, fontWeight: 900}}>{name}</span>
            </BrandBox>
          )}
        </Drop>
        {detail || price ? (
          <Drop delay={14} from="bottom">
            {(ex) => (
              <BrandBox color="white" extrude={ex} depth={10 * safe.u}>
                <span style={{fontSize: 46 * safe.u, fontWeight: 700}}>
                  {detail}
                  {detail && price ? ' · ' : ''}
                  {price ? <b style={{fontWeight: 900}}>{price}</b> : null}
                </span>
              </BrandBox>
            )}
          </Drop>
        ) : null}
      </Center>
    </SceneBg>
  );
};

/** Quote card: big quote marks, text, author. */
export const QuoteCard: React.FC<Base & {quote: string; author?: string; tone?: Tone}> = ({quote, author, tone = 'dark'}) => {
  const safe = useSafe();
  const t = TONE[tone];
  const s = useSpringIn(0);
  return (
    <SceneBg tone={tone}>
      <Center gap={30}>
        <div style={{fontFamily: fonts.display, fontWeight: 900, fontSize: 260 * safe.u, lineHeight: 0.6, color: colors.primary, ...textOutline(8 * safe.u), transform: `scale(${s})`}}>“</div>
        <div style={{fontFamily: fonts.display, fontWeight: 800, fontSize: (quote.length > 80 ? 64 : 84) * safe.u * (safe.isShort ? 1.1 : 1), color: t.fg, lineHeight: 1.15, maxWidth: safe.w * 0.95, opacity: s}}>{quote}</div>
        {author ? (
          <Drop delay={10} from="bottom">
            {(ex) => (
              <BrandBox color="primary" extrude={ex} depth={12 * safe.u}>
                <span style={{fontSize: 44 * safe.u, fontWeight: 800}}>{author}</span>
              </BrandBox>
            )}
          </Drop>
        ) : null}
      </Center>
    </SceneBg>
  );
};

/** Chapter divider for long form. `sound` is an optional audio file in the project (e.g. brand/outro/sound.wav). */
export const ChapterCard: React.FC<Base & {title: string; number?: number | string; tone?: Tone; sound?: string}> = ({title, number, tone = 'primary', sound}) => {
  const safe = useSafe();
  return (
    <SceneBg tone={tone}>
      {sound ? <Audio src={staticFile(sound)} volume={0.9} /> : null}
      <Center gap={24}>
        {number !== undefined ? (
          <Drop>
            {(ex) => (
              <BrandBox color="dark" extrude={ex} depth={14 * safe.u}>
                <span style={{fontSize: 60 * safe.u, fontWeight: 900}}>{typeof number === 'number' ? String(number).padStart(2, '0') : number}</span>
              </BrandBox>
            )}
          </Drop>
        ) : null}
        <Drop delay={6}>
          {(ex) => (
            <BrandBox color="white" extrude={ex} depth={26 * safe.u} stroke={8 * safe.u}>
              <span style={{fontSize: 110 * safe.u, fontWeight: 900}}>{title}</span>
            </BrandBox>
          )}
        </Drop>
      </Center>
    </SceneBg>
  );
};

/**
 * Logo reveal: the brand's logo (or its name, typeset in a box) drops in and extrudes, with an optional tagline.
 * Uses brand.json: logo, brandName, tagline. `sound` is an optional audio file in the project.
 */
export const LogoSting: React.FC<Base & {text?: string; tagline?: string; tone?: Tone; sound?: string}> = ({text, tagline = theme.brand.tagline, tone = 'paper', sound}) => {
  const safe = useSafe();
  const name = text ?? (theme.brand.name || 'Your brand');
  return (
    <SceneBg tone={tone}>
      {sound ? <Audio src={staticFile(sound)} /> : null}
      <Center gap={40}>
        <Drop>
          {(ex) =>
            theme.logo && text === undefined ? (
              <Img src={staticFile(theme.logo.file)} style={{width: Math.min(safe.w * 0.8, 760 * safe.u), height: 'auto', transform: `scale(${0.8 + 0.2 * ex})`}} />
            ) : (
              <BrandBox color="primary" extrude={ex} depth={60 * safe.u} stroke={10 * safe.u} padding="0.02em 0.28em 0.08em">
                <span style={{fontSize: (name.length > 10 ? 150 : 250) * safe.u, fontWeight: 800, letterSpacing: '-0.03em'}}>{name}</span>
              </BrandBox>
            )
          }
        </Drop>
        {tagline ? (
          <Drop delay={16} from="bottom">
            {(ex) => (
              <BrandBox color="dark" extrude={ex} depth={10 * safe.u}>
                <span style={{fontSize: 48 * safe.u, fontWeight: 700}}>{tagline}</span>
              </BrandBox>
            )}
          </Drop>
        ) : null}
      </Center>
    </SceneBg>
  );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const SCENES: Record<string, React.FC<any>> = {
  BigNumber,
  ChatMock,
  FlowDiagram,
  BigQuestion,
  DecisionCard,
  SortingPipeline,
  Blockers,
  GrowthCurve,
  ReleaseRace,
  Outgrow,
  PredictionCard,
  Trajectory,
  Gauge,
  IntervalTimeline,
  Crowd,
  Verdict,
  RankSwap,
  Hub,
  LaggardRace,
  PhoneNotification,
  EventTimeline,
  MoneyFlow,
  Balance,
  SearchBar,
  PriceTag,
  CalendarDate,
  WorldMap,
  LayerStack,
  BeforeAfter,
  Newspaper,
  Battery,
  Terminal,
  Acquisition,
  SocialPost,
  KineticTitle,
  Versus,
  BarChart,
  ListScene,
  ProductShowcase,
  QuoteCard,
  ChapterCard,
  LogoSting,
  Hero,
  PhotoStack,
  Callouts,
  ZoomLens,
  ScreenClip,
  Lineup,
  LockedGrid,
  SignalBars,
  PortPlug,
  Thermometer,
  LookAlike,
  SiteWall,
  SiteBuild,
  ImageWipe,
};
