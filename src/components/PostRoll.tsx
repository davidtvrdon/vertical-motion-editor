import React from 'react';
import {AbsoluteFill, Audio, Img, interpolate, OffthreadVideo, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {colors, dropShadow, fonts, glue, theme} from '../brand';
import {clamp} from '../lib/anim';
import type {EditPlan} from '../types';
import {BrandBox} from './BrandBox';
import {Drop, SceneBg, Tone} from './scenes/common';

/**
 * Outro / end card, appended after the edit via `plan.postRoll` (see Edit.tsx) and previewable as the `PostRoll`
 * composition. What it shows comes from the brand (brand.json → outro): the style, call to action, social platforms,
 * and optionally your own image / video / sound.
 *
 *   logo-card    logo (or brand name) · call to action · handle · platform badges
 *   follow-card  small logo · big call to action · one row per platform with its handle
 *   minimal      call to action + handle on the brand background
 *   custom       your own image or video (outro.file), optionally with the call to action on top
 */

type PostRollSettings = NonNullable<EditPlan['postRoll']>;

/** Seconds the outro lasts (plan override → brand default). */
export const postRollSeconds = (pr?: PostRollSettings) => (pr ? Math.max(0.5, pr.duration ?? theme.outro.duration) : 0);

/** Entrance spring with a little overshoot, delay in seconds. */
const useIn = (delaySec: number, config: {damping?: number; stiffness?: number; mass?: number} = {}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({frame: frame - Math.round(delaySec * fps), fps, config: {damping: 12, stiffness: 200, mass: 0.7, ...config}});
};

const NAMES: Record<string, string> = {
  youtube: 'YouTube', instagram: 'Instagram', tiktok: 'TikTok', x: 'X', linkedin: 'LinkedIn', facebook: 'Facebook', spotify: 'Spotify', apple: 'Apple Podcasts', website: 'Website',
};

/** Simplified platform glyphs, drawn here (no brand files shipped). */
const Glyph: React.FC<{kind: string}> = ({kind}) => {
  const stroke = {stroke: colors.line, strokeWidth: 8, strokeLinejoin: 'round' as const};
  const W = '#FFFFFF';
  switch (kind) {
    case 'youtube':
      return (
        <svg viewBox="0 0 220 220" width="100%" height="100%">
          <rect x="10" y="48" width="200" height="132" rx="38" fill="#FF1F3D" {...stroke} />
          <path d="M92 80 L92 148 L152 114 Z" fill={W} {...stroke} strokeWidth={6} />
        </svg>
      );
    case 'instagram':
      return (
        <svg viewBox="0 0 220 220" width="100%" height="100%">
          <rect x="10" y="10" width="200" height="200" rx="58" fill="#E1306C" {...stroke} />
          <rect x="52" y="52" width="116" height="116" rx="34" fill="none" stroke={W} strokeWidth="13" />
          <circle cx="110" cy="110" r="27" fill="none" stroke={W} strokeWidth="13" />
          <circle cx="146" cy="74" r="8" fill={W} />
        </svg>
      );
    case 'tiktok':
      return (
        <svg viewBox="0 0 220 220" width="100%" height="100%">
          <rect x="10" y="10" width="200" height="200" rx="52" fill="#111" {...stroke} />
          <path d="M120 54 V130 a30 30 0 1 1 -22 -29" fill="none" stroke="#25F4EE" strokeWidth="15" strokeLinecap="round" transform="translate(-5 2)" />
          <path d="M120 54 V130 a30 30 0 1 1 -22 -29" fill="none" stroke="#FE2C55" strokeWidth="15" strokeLinecap="round" transform="translate(5 -2)" />
          <path d="M120 54 V130 a30 30 0 1 1 -22 -29" fill="none" stroke={W} strokeWidth="15" strokeLinecap="round" />
          <path d="M120 54 c4 22 18 32 40 34" fill="none" stroke={W} strokeWidth="15" strokeLinecap="round" />
        </svg>
      );
    case 'x':
      return (
        <svg viewBox="0 0 220 220" width="100%" height="100%">
          <rect x="10" y="10" width="200" height="200" rx="52" fill="#111" {...stroke} />
          <path d="M62 60 L158 160 M158 60 L62 160" stroke={W} strokeWidth="18" strokeLinecap="round" />
        </svg>
      );
    case 'linkedin':
      return (
        <svg viewBox="0 0 220 220" width="100%" height="100%">
          <rect x="10" y="10" width="200" height="200" rx="40" fill="#0A66C2" {...stroke} />
          <rect x="52" y="90" width="22" height="70" fill={W} />
          <circle cx="63" cy="64" r="13" fill={W} />
          <path d="M92 90 h21 v10 c6 -10 16 -12 26 -12 c22 0 28 14 28 34 v38 h-22 v-34 c0 -10 -3 -17 -13 -17 c-11 0 -17 7 -17 18 v33 h-23 z" fill={W} />
        </svg>
      );
    case 'facebook':
      return (
        <svg viewBox="0 0 220 220" width="100%" height="100%">
          <circle cx="110" cy="110" r="100" fill="#1877F2" {...stroke} />
          <path d="M118 188 V122 h24 l4 -28 h-28 v-17 c0 -8 3 -13 14 -13 h15 V39 c-3 0 -12 -1 -22 -1 c-22 0 -36 13 -36 37 v19 h-24 v28 h24 v66 z" fill={W} />
        </svg>
      );
    case 'spotify':
      return (
        <svg viewBox="0 0 220 220" width="100%" height="100%">
          <circle cx="110" cy="110" r="100" fill="#1ED760" {...stroke} />
          <path d="M50 80 Q112 60 176 92" fill="none" stroke={colors.line} strokeWidth="16" strokeLinecap="round" />
          <path d="M60 117 Q112 102 164 125" fill="none" stroke={colors.line} strokeWidth="13" strokeLinecap="round" />
          <path d="M70 148 Q112 138 152 155" fill="none" stroke={colors.line} strokeWidth="10" strokeLinecap="round" />
        </svg>
      );
    case 'apple': {
      // everything is built around one centre (110, 100): two broadcast arcs open at the bottom, a head and a body
      const C = {x: 110, y: 100};
      const arc = (r: number, gap = 60) => {
        const a0 = ((90 + gap / 2) * Math.PI) / 180;
        const a1 = ((90 - gap / 2) * Math.PI) / 180;
        const p = (a: number) => `${(C.x + r * Math.cos(a)).toFixed(2)} ${(C.y + r * Math.sin(a)).toFixed(2)}`;
        return `M${p(a0)} A${r} ${r} 0 1 1 ${p(a1)}`;
      };
      return (
        <svg viewBox="0 0 220 220" width="100%" height="100%">
          <rect x="10" y="10" width="200" height="200" rx="52" fill="#A14BE0" {...stroke} />
          <path d={arc(56, 60)} fill="none" stroke={W} strokeWidth="11" strokeLinecap="round" />
          <path d={arc(35, 90)} fill="none" stroke={W} strokeWidth="11" strokeLinecap="round" />
          <circle cx={C.x} cy={C.y - 6} r="13" fill={W} />
          <path d="M110 118 c-9.5 0 -14.5 6 -13.5 16 l4 27 c1 5 4 8 9.5 8 s8.5 -3 9.5 -8 l4 -27 c1 -10 -4 -16 -13.5 -16 z" fill={W} />
        </svg>
      );
    }
    default:
      // website / unknown: a globe in the brand colours
      return (
        <svg viewBox="0 0 220 220" width="100%" height="100%">
          <circle cx="110" cy="110" r="100" fill={colors.primary} {...stroke} />
          <ellipse cx="110" cy="110" rx="42" ry="100" fill="none" stroke={colors.onPrimary} strokeWidth="9" />
          <path d="M14 110 H206 M30 62 H190 M30 158 H190" stroke={colors.onPrimary} strokeWidth="9" fill="none" />
        </svg>
      );
  }
};

const Badge: React.FC<{kind: string; label: string; delay: number; u: number; fg: string}> = ({kind, label, delay, u, fg}) => {
  const s = useIn(delay);
  const size = 190 * u;
  return (
    <div style={{width: 300 * u, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 * u, opacity: Math.min(1, s * 3), transform: `scale(${0.4 + 0.6 * s}) translateY(${(1 - s) * 40 * u}px)`}}>
      <div style={{width: size, height: size, filter: dropShadow(12 * u)}}>
        <Glyph kind={kind} />
      </div>
      <span style={{fontSize: 36 * u, fontWeight: 800, color: fg, letterSpacing: '-0.01em', textAlign: 'center', lineHeight: 1.1, fontFamily: fonts.display}}>{label}</span>
    </div>
  );
};

/** One row per platform: glyph + handle in a box. */
const HandleRow: React.FC<{kind: string; label: string; delay: number; u: number}> = ({kind, label, delay, u}) => {
  const s = useIn(delay);
  return (
    <div style={{opacity: Math.min(1, s * 3), transform: `translateX(${(1 - s) * -120 * u}px)`}}>
      <BrandBox color="white" depth={14 * u} stroke={6 * u} padding="0.12em 0.4em 0.12em 0.2em">
        <span style={{display: 'flex', alignItems: 'center', gap: 22 * u}}>
          <span style={{width: 92 * u, height: 92 * u, display: 'block'}}>
            <Glyph kind={kind} />
          </span>
          <span style={{fontSize: 58 * u, fontWeight: 800, whiteSpace: 'nowrap'}}>{label}</span>
        </span>
      </BrandBox>
    </div>
  );
};

const toneFg = (tone: Tone) => (tone === 'paper' ? colors.line : tone === 'primary' ? colors.onPrimary : colors.white);

const LogoOrName: React.FC<{u: number; scale?: number; progress: number}> = ({u, scale = 1, progress}) => {
  if (theme.logo) {
    const ratio = theme.logo.w / theme.logo.h;
    const maxW = 860 * u * scale;
    const maxH = 400 * u * scale;
    const w = Math.min(maxW, maxH * ratio);
    return (
      <Img
        src={staticFile(theme.logo.file)}
        style={{width: w, height: 'auto', opacity: Math.min(1, progress * 4), transform: `translateY(${(1 - progress) * -520 * u}px) rotate(${(1 - progress) * -6}deg) scale(${0.85 + 0.15 * progress})`}}
      />
    );
  }
  const name = theme.brand.name;
  if (!name) return null;
  return (
    <div style={{opacity: Math.min(1, progress * 4), transform: `translateY(${(1 - progress) * -420 * u}px) scale(${0.85 + 0.15 * progress})`}}>
      <BrandBox color="primary" depth={34 * u} stroke={9 * u} padding="0.04em 0.3em 0.1em">
        <span style={{fontSize: (name.length > 10 ? 120 : 190) * u * scale, fontWeight: 800, letterSpacing: '-0.03em', whiteSpace: 'nowrap'}}>{name}</span>
      </BrandBox>
    </div>
  );
};

const platformsOf = (pr: PostRollSettings) => (pr.platforms ?? theme.outro.platforms).map((p) => ({kind: p.kind, label: p.handle || NAMES[p.kind] || p.kind}));

export const PostRoll: React.FC<{durationInFrames: number; settings?: PostRollSettings}> = ({durationInFrames, settings = {}}) => {
  const {fps, width, height} = useVideoConfig();
  const style = settings.style ?? theme.outro.style;
  const cta = settings.cta ?? theme.outro.cta;
  const tone = theme.outro.tone as Tone;
  const fg = toneFg(tone);
  // content is laid out for 9:16; on 16:9 it shrinks to fit the height
  const k = width > height ? 0.62 : 1;
  const u = (Math.min(width, height) / 1080) * k;
  const logo = useIn(0, {damping: 13, stiffness: 150, mass: 0.9});
  const handleIn = useIn(0.6);
  const platforms = platformsOf(settings);
  const handle = theme.brand.handle || theme.brand.website;
  const sound = settings.sound === false ? null : (settings.sound ?? theme.outro.sound);
  const ctaColor = tone === 'primary' ? 'dark' : 'primary';

  const ctaBox = cta ? (
    <Drop delay={Math.round(0.4 * fps)} from="bottom">
      {(ex) => (
        <BrandBox color={ctaColor} extrude={ex} depth={26 * u} stroke={8 * u}>
          <span style={{fontSize: 80 * u, fontWeight: 800, letterSpacing: '-0.02em', whiteSpace: 'nowrap'}}>{glue(cta)}</span>
        </BrandBox>
      )}
    </Drop>
  ) : null;

  const handleLine = handle ? (
    <div style={{fontSize: 54 * u, fontWeight: 700, color: fg, fontFamily: fonts.display, opacity: Math.min(1, handleIn * 3)}}>{handle}</div>
  ) : null;

  let body: React.ReactNode;
  if (style === 'custom' && theme.outro.file) {
    const media =
      theme.outro.fileKind === 'video' ? (
        <OffthreadVideo src={staticFile(theme.outro.file)} style={{width: '100%', height: '100%', objectFit: 'contain'}} />
      ) : (
        <Img src={staticFile(theme.outro.file)} style={{width: '100%', height: '100%', objectFit: 'contain'}} />
      );
    body = (
      <>
        <AbsoluteFill>{media}</AbsoluteFill>
        {cta ? <AbsoluteFill style={{alignItems: 'center', justifyContent: 'flex-end', paddingBottom: height * 0.26}}>{ctaBox}</AbsoluteFill> : null}
      </>
    );
  } else if (style === 'follow-card') {
    body = (
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', transform: `translateY(${-40 * u}px)`}}>
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 50 * u}}>
          <LogoOrName u={u} scale={0.55} progress={logo} />
          {cta ? (
            <div style={{fontSize: 128 * u, lineHeight: 1, fontWeight: 800, letterSpacing: '-0.03em', color: fg, textAlign: 'center', maxWidth: 940 * u, transform: `scale(${0.7 + 0.3 * logo})`, opacity: Math.min(1, logo * 3), fontFamily: fonts.display}}>
              {glue(cta)}
            </div>
          ) : null}
          <div style={{display: 'flex', flexDirection: 'column', gap: 26 * u, alignItems: 'flex-start'}}>
            {platforms.map((p, i) => (
              <HandleRow key={p.kind + i} kind={p.kind} label={p.label} delay={0.5 + i * 0.12} u={u} />
            ))}
          </div>
        </div>
      </AbsoluteFill>
    );
  } else if (style === 'minimal') {
    body = (
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40 * u}}>
          {ctaBox ?? <LogoOrName u={u} progress={logo} />}
          {handleLine}
        </div>
      </AbsoluteFill>
    );
  } else {
    // logo-card
    body = (
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', transform: `translateY(${-60 * u}px)`}}>
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 50 * u}}>
          <LogoOrName u={u} progress={logo} />
          {ctaBox}
          {handleLine}
          {platforms.length ? (
            <div style={{display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 20 * u, maxWidth: 1000 * u}}>
              {platforms.map((p, i) => (
                <Badge key={p.kind + i} kind={p.kind} label={p.label} delay={0.75 + i * 0.12} u={u} fg={fg} />
              ))}
            </div>
          ) : null}
        </div>
      </AbsoluteFill>
    );
  }

  return (
    <SceneBg tone={tone}>
      {sound ? <Audio src={staticFile(sound)} volume={(f) => interpolate(f, [durationInFrames - 8, durationInFrames], [1, 0], clamp)} /> : null}
      {body}
    </SceneBg>
  );
};
