import React from 'react';
import {AbsoluteFill, Audio, Img, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Captions} from './components/Captions';
import {Cutaway} from './components/Cutaway';
import {OVERLAYS} from './components/overlays';
import {OverlayFrame, roomWindows} from './components/OverlayFrame';
import {BackdropContext, SceneBg} from './components/scenes/common';
import {PostRoll, postRollSeconds} from './components/PostRoll';
import {SafeZoneGuide} from './components/SafeZoneGuide';
import {TalkingHead} from './components/TalkingHead';
import {resolveLook} from './components/Look';
import {AUTO_BACKDROPS} from './components/scenes/backdrops';
import {insetsFor, LayoutProvider} from './lib/safe';
import type {Cut, EditPlan, Sfx} from './types';

/** Transitions that get an automatic whoosh when audio.autoSfx is on. */
const WHOOSH = new Set(['whip', 'slide', 'zoom', 'box']);

/** Whoosh sits at 70 % of sfxVolume: audible on the cut, never on top of the voice (user preference). */
const WHOOSH_LEVEL = 0.7;

const autoSfx = (plan: EditPlan): Sfx[] => {
  if (!plan.audio?.autoSfx) return [];
  const v = plan.audio.sfxVolume ?? 0.3;
  const list: Sfx[] = [];
  for (const c of plan.cuts ?? []) {
    if (WHOOSH.has(c.transition ?? 'cut')) list.push({at: Math.max(0, c.start - 0.12), src: 'brand/sfx/whoosh.wav', volume: v * WHOOSH_LEVEL});
    if (c.transition === 'flash') list.push({at: c.start, src: 'brand/sfx/thud.wav', volume: v});
  }
  // Overlay "pop" is opt-in only: the user dislikes the boing on every graphic.
  if (plan.audio.overlaySfx) {
    for (const o of plan.overlays ?? []) {
      if (o.component === 'ProgressBar') continue;
      list.push({at: o.start, src: 'brand/sfx/pop.wav', volume: v * 0.8});
    }
  }
  return list;
};

/**
 * Fixed channel logo / watermark: same place and size all video long, never zoomed. It sits above the face
 * and b-roll but BELOW scene cutaways, so motion graphics cover it exactly as they slide/box in
 * and out (no popping at transition frames). Off on the outro card.
 */
const BrandLogo: React.FC<{plan: EditPlan}> = ({plan}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const logo = plan.logo;
  if (!logo) return null;
  const outro = plan.layout?.outro;
  if (outro != null && frame / fps >= outro) return null;
  return <Img src={staticFile(logo.src)} style={{position: 'absolute', left: logo.x, top: logo.y, width: logo.w, height: logo.h ?? 'auto'}} />;
};

const Timecode: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, width} = useVideoConfig();
  return (
    <div style={{position: 'absolute', right: 0, top: 0, padding: '6px 14px', background: 'rgba(0,0,0,0.75)', color: '#fff', font: `700 ${Math.round(width / 28)}px monospace`}}>
      {(frame / fps).toFixed(1)}s
    </div>
  );
};

/**
 * Layer order (bottom → top):
 * talking head → b-roll / image cutaways → channel logo → scene cutaways → overlays → captions → debug.
 */
export const Edit: React.FC<EditPlan> = (plan) => {
  const {fps} = useVideoConfig();
  const f = (s: number) => Math.round(s * fps);
  const words = plan.captions?.words ?? [];
  const sfx = [...(plan.audio?.sfx ?? []), ...autoSfx(plan)];
  const look = resolveLook(plan.look);
  const {width: W, height: H} = useVideoConfig();
  const rooms = roomWindows(plan, W, H, insetsFor(plan.format, plan.platform));
  // scene backgrounds: explicit cut.bg wins; with sceneBg 'auto' the rest rotate, starting at a
  // per-video offset (from the duration) so consecutive videos open on different backgrounds
  const sceneCuts = (plan.cuts ?? []).map((c, i) => ({c, i})).filter(({c}) => c.type === 'scene');
  const offset = Math.floor((plan.duration ?? 0) * 7) % AUTO_BACKDROPS.length;
  const bgFor = new Map<number, Cut['bg']>();
  sceneCuts.forEach(({c, i}, k) => bgFor.set(i, c.bg ?? (plan.sceneBg === 'auto' ? AUTO_BACKDROPS[(offset + k) % AUTO_BACKDROPS.length] : undefined)));

  // a post-roll is appended after the edit: the edit (and its audio) stops at plan.duration
  const mainFrames = f(plan.duration);
  const postFrames = plan.postRoll ? Math.max(1, f(postRollSeconds(plan.postRoll))) : 0;
  const Main: React.FC<{children: React.ReactNode}> = ({children}) =>
    plan.postRoll ? (
      <Sequence from={0} durationInFrames={mainFrames} layout="none" name="edit">
        {children}
      </Sequence>
    ) : (
      <>{children}</>
    );

  return (
    <LayoutProvider format={plan.format} platform={plan.platform}>
      <AbsoluteFill style={{backgroundColor: '#000'}}>
        <Main>
        <TalkingHead
          plan={plan}
          rooms={rooms}
          backdrop={
            <BackdropContext.Provider value="grid">
              <SceneBg tone="paper" />
            </BackdropContext.Provider>
          }
        />

        {(['media', 'logo', 'scene'] as const).map((pass) =>
          pass === 'logo' ? (
            <BrandLogo key="logo" plan={plan} />
          ) : (
            (plan.cuts ?? []).map((c, i) => {
              if ((c.type === 'scene') !== (pass === 'scene')) return null;
              const d = Math.max(1, f(c.end) - f(c.start));
              return (
                <Sequence key={`cut-${i}`} from={f(c.start)} durationInFrames={d} name={`${c.type}${c.scene ? `:${c.scene}` : ''} ${c.start.toFixed(1)}s`}>
                  <Cutaway cut={bgFor.has(i) ? {...c, bg: bgFor.get(i)} : c} durationInFrames={d} look={look} captionBand={plan.captions?.enabled !== false && c.captions !== false} />
                </Sequence>
              );
            })
          ),
        )}

        {(plan.overlays ?? []).map((o, i) => {
          const Comp = OVERLAYS[o.component];
          const d = Math.max(1, f(o.end) - f(o.start));
          if (!Comp) return null;
          return (
            <Sequence key={`ov-${i}`} from={f(o.start)} durationInFrames={d} name={`${o.component} ${o.start.toFixed(1)}s`}>
              <OverlayFrame plan={plan} overlay={o} index={i} durationInFrames={d} look={look} render={(over) => <Comp {...(o.props ?? {})} {...(over ?? {})} durationInFrames={d} />} />
            </Sequence>
          );
        })}

        {plan.captions?.enabled && words.length ? (
          <Captions words={words} emphasis={plan.captions.emphasis} maxWords={plan.captions.maxWords} style={plan.captions.style} cuts={plan.cuts} splitScreen={plan.layout?.splitScreen} outro={plan.layout?.outro} speakers={plan.layout?.speakers} />
        ) : null}

        {plan.audio?.music ? (
          <Audio src={staticFile(plan.audio.music.src)} volume={plan.audio.music.volume ?? 0.08} trimBefore={f(plan.audio.music.start ?? 0)} loop />
        ) : null}
        {sfx.map((s, i) => (
          <Sequence key={`sfx-${i}`} from={f(s.at)} durationInFrames={f(3)} layout="none">
            <Audio src={staticFile(s.src)} volume={s.volume ?? 0.35} />
          </Sequence>
        ))}

        {plan.debug?.safeZones ? <SafeZoneGuide /> : null}
        {plan.debug?.timecode ? <Timecode /> : null}
        </Main>

        {plan.postRoll ? (
          <Sequence from={mainFrames} durationInFrames={postFrames} name="post-roll">
            <PostRoll durationInFrames={postFrames} settings={plan.postRoll} />
          </Sequence>
        ) : null}
      </AbsoluteFill>
    </LayoutProvider>
  );
};
