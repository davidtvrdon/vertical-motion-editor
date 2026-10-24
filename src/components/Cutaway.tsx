import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {colors, dropShadow} from '../brand';
import {clamp} from '../lib/anim';
import type {Cut, Look} from '../types';
import {FootageLook, SceneLook} from './Look';
import {InsetOverride, useSafe} from '../lib/safe';
import {SceneBg, SCENES} from './scenes';
import {RAW_SCENES} from './scenes/media';
import {BackdropContext} from './scenes/common';

const IN = 8;
const OUT = 6;

/** Collage colour system: map luminance onto two brand colours (like After Effects' Tint). */
const TintFilter: React.FC<{id: string; mode: 'duo' | 'primary'}> = ({id, mode}) => {
  // darks → the dark colour, highlights → paper ('duo') or the primary colour ('primary')
  const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const hi = rgb(mode === 'duo' ? colors.paper : colors.primary);
  const lo = rgb(colors.dark);
  return (
    <svg width={0} height={0} style={{position: 'absolute'}}>
      <filter id={id} colorInterpolationFilters="sRGB">
        <feColorMatrix type="saturate" values="0" />
        <feComponentTransfer>
          <feFuncR type="table" tableValues={`${lo[0]} ${hi[0]}`} />
          <feFuncG type="table" tableValues={`${lo[1]} ${hi[1]}`} />
          <feFuncB type="table" tableValues={`${lo[2]} ${hi[2]}`} />
        </feComponentTransfer>
      </filter>
    </svg>
  );
};

const Media: React.FC<{cut: Cut; durationInFrames: number}> = ({cut, durationInFrames}) => {
  const tintId = `t${React.useId().replace(/:/g, '')}`;
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = frame / Math.max(1, durationInFrames);
  const motion = cut.motion ?? (cut.type === 'image' ? 'in' : 'none');
  const move =
    motion === 'in'
      ? `scale(${1 + 0.12 * p})`
      : motion === 'out'
        ? `scale(${1.12 - 0.12 * p})`
        : motion === 'left'
          ? `scale(1.15) translateX(${4 - 8 * p}%)`
          : motion === 'right'
            ? `scale(1.15) translateX(${-4 + 8 * p}%)`
            : 'none';

  if (cut.type === 'scene') {
    const Scene = SCENES[cut.scene ?? ''];
    if (!Scene) {
      return (
        <AbsoluteFill style={{background: colors.primary, color: colors.line, fontSize: 60, padding: 80}}>
          Unknown scene: {cut.scene}
        </AbsoluteFill>
      );
    }
    return (
      <BackdropContext.Provider value={cut.bg}>
        <Scene {...(cut.props ?? {})} durationInFrames={durationInFrames} />
      </BackdropContext.Provider>
    );
  }
  if (!cut.src) {
    return <AbsoluteFill style={{background: colors.line}} />;
  }
  const panX = cut.pan ? (cut.pan[0] + (cut.pan[1] - cut.pan[0]) * Easing.inOut(Easing.cubic)(Math.min(1, p))) * 100 : undefined;
  const style: React.CSSProperties = {width: '100%', height: '100%', objectFit: 'cover', objectPosition: panX != null ? `${panX}% 50%` : undefined, transform: move, filter: cut.tint ? `url(#${tintId})` : undefined};
  const tint = cut.tint ? <TintFilter id={tintId} mode={cut.tint} /> : null;
  if (cut.fit === 'contain') {
    const inner: React.CSSProperties = {maxWidth: '88%', maxHeight: '70%', objectFit: 'contain', transform: move, filter: dropShadow(16)};
    return (
      <SceneBg tone="paper">
        <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
          {cut.type === 'image' ? (
            <Img src={staticFile(cut.src)} style={inner} />
          ) : (
            <OffthreadVideo src={staticFile(cut.src)} muted trimBefore={Math.round((cut.trim ?? 0) * fps)} playbackRate={cut.rate ?? 1} style={inner} />
          )}
        </AbsoluteFill>
      </SceneBg>
    );
  }
  if (cut.type === 'image') {
    return (
      <AbsoluteFill style={{background: colors.line, overflow: 'hidden'}}>
        {tint}
        <Img src={staticFile(cut.src)} style={style} />
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{background: colors.line, overflow: 'hidden'}}>
      {tint}
      <OffthreadVideo
        src={staticFile(cut.src)}
        muted
        trimBefore={Math.round((cut.trim ?? 0) * fps)}
        playbackRate={cut.rate ?? 1}
        style={style}
      />
    </AbsoluteFill>
  );
};

/** Scenes keep the caption band (bottom of the safe area) free, so captions never collide with graphics. */
const CaptionBand: React.FC<{on?: boolean; children: React.ReactNode}> = ({on, children}) => {
  const safe = useSafe();
  if (!on) return <>{children}</>;
  const band = safe.isShort ? safe.h * 0.035 + 190 * safe.u : 110 * safe.u;
  return <InsetOverride insets={{bottom: safe.insets.bottom + band}}>{children}</InsetOverride>;
};

/** A full-frame insert that covers the talking head (b-roll clip, image or animated scene). */
export const Cutaway: React.FC<{cut: Cut; durationInFrames: number; look?: Required<Look> | null; captionBand?: boolean}> = ({cut, durationInFrames, look, captionBand}) => {
  const frame = useCurrentFrame();
  const t = cut.transition ?? 'cut';
  const inP = interpolate(frame, [0, IN], [0, 1], {...clamp, easing: Easing.bezier(0.05, 0.9, 0.1, 1)});
  const outP = interpolate(frame, [durationInFrames - OUT, durationInFrames], [0, 1], {...clamp, easing: Easing.bezier(0.9, 0, 0.95, 0.1)});

  let wrap: React.CSSProperties = {};
  let flash = 0;
  if (t === 'whip') {
    const x = (1 - inP) * 100 - outP * 100;
    const blur = Math.abs((1 - inP) + outP) > 0.02 ? 18 * Math.max(1 - inP, outP) : 0;
    wrap = {transform: `translateX(${x}%)`, filter: blur ? `blur(${blur}px)` : undefined};
  } else if (t === 'slide') {
    wrap = {transform: `translateY(${(1 - inP) * 100}%)`};
  } else if (t === 'zoom') {
    wrap = {transform: `scale(${1.35 - 0.35 * inP + 0.2 * outP})`, opacity: Math.min(inP * 1.5, 1 - outP)};
  } else if (t === 'flash') {
    flash = interpolate(frame, [0, 5], [1, 0], clamp);
  } else if (t === 'box') {
    const inset = (1 - inP) * 42;
    const outInset = outP * 42;
    const i = Math.max(inset, outInset);
    wrap = {clipPath: `inset(${i}% ${i}% ${i}% ${i}% round ${i > 0.5 ? 12 : 0}px)`};
  }

  return (
    <AbsoluteFill>
      <AbsoluteFill style={wrap}>
        {cut.raw || (cut.type === 'scene' && RAW_SCENES.has(cut.scene ?? '')) ? (
          <CaptionBand on={captionBand && cut.type === 'scene'}>
            <Media cut={cut} durationInFrames={durationInFrames} />
          </CaptionBand>
        ) : look && cut.type === 'scene' ? (
          <SceneLook look={look}>
            <CaptionBand on={captionBand}>
              <Media cut={cut} durationInFrames={durationInFrames} />
            </CaptionBand>
          </SceneLook>
        ) : look ? (
          <FootageLook look={look}>
            <Media cut={cut} durationInFrames={durationInFrames} />
          </FootageLook>
        ) : (
          <CaptionBand on={captionBand && cut.type === 'scene'}>
            <Media cut={cut} durationInFrames={durationInFrames} />
          </CaptionBand>
        )}
      </AbsoluteFill>
      {flash > 0 ? <AbsoluteFill style={{background: 'white', opacity: flash}} /> : null}
    </AbsoluteFill>
  );
};
