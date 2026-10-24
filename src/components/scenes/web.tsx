/**
 * Web scenes drawn in code, built on one website mock-up (`SiteMock`: header, hero, pill button, three soft cards).
 *  - `LookAlike`: the mock changes brand three times while the layout never moves, tags land on the repeated traits.
 *  - `SiteWall`:  a wall of sites appears faster and faster, all the same ("everyone builds the same site").
 *  - `SiteBuild`: a prompt types out, then the site assembles itself part by part ("vibe-coded it").
 *  - `ImageWipe`: two images, a wipe sweeps from plain to detailed (details of the AI look).
 */
import React from 'react';
import {Easing, Img, interpolate, random, staticFile, useCurrentFrame} from 'remotion';
import {colors, glue, hardShadow, edge} from '../../brand';
import {clamp, useProgress, useSpringIn} from '../../lib/anim';
import {useSafe} from '../../lib/safe';
import {BrandBox} from '../BrandBox';
import {Base, SceneBg, Tone} from './common';

type Skin = {name: string; accent: string};

const SKINS: Skin[] = [
  {name: 'Fitnesko', accent: '#7C5CFF'},
  {name: 'Beanery', accent: '#E8833A'},
  {name: 'Dentio', accent: '#1FA97A'},
  {name: 'Pixelio', accent: '#E2467B'},
  {name: 'Nimbus', accent: '#2F7BFF'},
  {name: 'Greenly', accent: '#4DB26B'},
  {name: 'Orbita', accent: '#F2B63D'},
  {name: 'Droplet', accent: '#14A3C7'},
];

/** The mock site. `build` (0–1) reveals it part by part; `W` is its width in px; height is ≈ 1.1 × W. */
const SiteMock: React.FC<{W: number; skin: Skin; build?: number; chrome?: boolean}> = ({W, skin, build = 1, chrome = true}) => {
  const u = W / 800;
  const part = (a: number, b: number) => interpolate(build, [a, b], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const bar = (w: number, h = 16, c = '#D9DCE5') => <div style={{width: `${w}%`, height: h * u, borderRadius: h * u, background: c}} />;
  const nav = part(0, 0.15);
  const hero = part(0.15, 0.4);
  const btn = part(0.4, 0.55);
  const cards = (i: number) => part(0.55 + i * 0.12, 0.7 + i * 0.12);
  return (
    <div style={{width: W, background: '#FAFAFD', border: edge(7 * u), borderRadius: 18 * u, boxShadow: hardShadow(14 * u), overflow: 'hidden', boxSizing: 'border-box'}}>
      {chrome ? (
        <div style={{height: 56 * u, background: '#ECEEF4', borderBottom: `${4 * u}px solid ${colors.line}`, display: 'flex', alignItems: 'center', gap: 10 * u, padding: `0 ${18 * u}px`}}>
          {[colors.primary, '#F2B63D', '#4DB26B'].map((c) => (
            <div key={c} style={{width: 16 * u, height: 16 * u, borderRadius: '50%', background: c}} />
          ))}
          <div style={{marginLeft: 12 * u, flex: 1, height: 28 * u, borderRadius: 14 * u, background: '#fff', border: `${2 * u}px solid #C9CCD8`, fontSize: 17 * u, fontWeight: 700, color: '#6B6F80', display: 'flex', alignItems: 'center', padding: `0 ${14 * u}px`}}>
            {skin.name.toLowerCase().replace(/[^a-z]/g, 'a')}.ai
          </div>
        </div>
      ) : null}
      <div style={{padding: `${30 * u}px ${38 * u}px`, display: 'flex', flexDirection: 'column', gap: 26 * u}}>
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: nav, transform: `translateY(${(1 - nav) * -20 * u}px)`}}>
          <div style={{fontSize: 34 * u, fontWeight: 900, color: skin.accent, letterSpacing: '-0.02em'}}>{skin.name}</div>
          <div style={{display: 'flex', gap: 14 * u, width: '38%'}}>
            {bar(100, 14)}
            {bar(100, 14)}
          </div>
        </div>
        <div style={{display: 'flex', flexDirection: 'column', gap: 14 * u, alignItems: 'center', paddingTop: 14 * u, opacity: hero, transform: `scale(${0.94 + 0.06 * hero})`}}>
          {bar(78, 34, '#23263A')}
          {bar(52, 34, '#23263A')}
          <div style={{height: 6 * u}} />
          {bar(66, 15)}
          {bar(48, 15)}
        </div>
        <div style={{display: 'flex', justifyContent: 'center', opacity: btn, transform: `scale(${0.6 + 0.4 * btn})`}}>
          <div style={{background: skin.accent, borderRadius: 999, padding: `${16 * u}px ${46 * u}px`, boxShadow: `0 ${10 * u}px ${24 * u}px ${skin.accent}77`, color: '#fff', fontWeight: 900, fontSize: 26 * u}}>Začať zadarmo</div>
        </div>
        <div style={{display: 'flex', gap: 22 * u, marginTop: 8 * u}}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{flex: 1, background: '#fff', borderRadius: 26 * u, boxShadow: `0 ${14 * u}px ${34 * u}px rgba(20,20,40,0.28)`, padding: `${22 * u}px ${20 * u}px`, display: 'flex', flexDirection: 'column', gap: 12 * u, opacity: cards(i), transform: `translateY(${(1 - cards(i)) * 50 * u}px)`}}>
              <div style={{width: 54 * u, height: 54 * u, borderRadius: 18 * u, background: `${skin.accent}22`, border: `${3 * u}px solid ${skin.accent}`}} />
              {bar(80, 18, '#23263A')}
              {bar(100, 12)}
              {bar(70, 12)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const LookAlike: React.FC<Base & {skins?: Skin[]; tags?: string[]; stamp?: string; tone?: Tone}> = ({
  skins = SKINS.slice(0, 3),
  tags = ['3 columns', 'round corners', 'soft shadows'],
  stamp = 'same site',
  tone = 'secondary',
  durationInFrames,
}) => {
  const safe = useSafe();
  const frame = useCurrentFrame();
  const enter = useSpringIn(0, {damping: 14});
  const step = Math.max(1, Math.round(durationInFrames * 0.2));
  const skin = skins[Math.min(skins.length - 1, Math.floor(frame / step))];
  const flip = frame % step < 3 && frame >= step ? 1 : 0;
  const W = Math.min(safe.w * 0.94, safe.h * 0.7 / 1.1);
  const H = W * 1.1;
  const tagS = tags.map((_, i) => useSpringIn(Math.round(durationInFrames * (0.36 + i * 0.13)), {damping: 10}));
  const stampS = useSpringIn(Math.round(durationInFrames * 0.76), {damping: 9});
  const draw = useProgress(0, 14);
  return (
    <SceneBg tone={tone}>
      <div style={{position: 'absolute', left: safe.x, top: safe.y, width: safe.w, height: safe.h, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <div style={{position: 'relative', width: W, height: H, transform: `scale(${0.86 + 0.14 * enter}) rotate(${(1 - enter) * -3}deg)`, opacity: Math.min(1, enter * 2)}}>
          <SiteMock W={W} skin={skin} build={draw} />
          {flip ? <div style={{position: 'absolute', inset: 0, background: '#fff', opacity: 0.55}} /> : null}
          {tags.slice(0, 3).map((t, i) => {
            const pos = [
              {right: -18 * safe.u, top: H * 0.7},
              {left: W * 0.2, top: H * 0.46},
              {left: -18 * safe.u, top: H * 0.84},
            ][i];
            return (
              <div key={t} style={{position: 'absolute', ...pos, transform: `scale(${tagS[i]}) rotate(${i % 2 ? 4 : -4}deg)`, opacity: tagS[i]}}>
                <BrandBox color={i === 1 ? 'white' : 'primary'} extrude={tagS[i]} depth={8 * safe.u} padding="0.1em 0.35em">
                  <span style={{fontSize: 40 * safe.u, fontWeight: 900, whiteSpace: 'nowrap'}}>{glue(t)}</span>
                </BrandBox>
              </div>
            );
          })}
        </div>
        <div style={{position: 'absolute', left: 0, right: 0, bottom: safe.h * 0.02, display: 'flex', justifyContent: 'center', transform: `scale(${stampS}) rotate(${(1 - stampS) * 10 - 3}deg)`, opacity: stampS}}>
          <BrandBox color="dark" extrude={stampS} depth={14 * safe.u} padding="0.1em 0.4em">
            <span style={{fontSize: 74 * safe.u, fontWeight: 900, whiteSpace: 'nowrap'}}>{glue(stamp)}</span>
          </BrandBox>
        </div>
      </div>
    </SceneBg>
  );
};

/** A wall of sites that appear faster and faster: everyone can make one now. All the same layout, different brand. */
export const SiteWall: React.FC<Base & {cols?: number; rows?: number; tone?: Tone}> = ({cols = 3, rows = 4, tone = 'secondary', durationInFrames}) => {
  const safe = useSafe();
  const frame = useCurrentFrame();
  const n = cols * rows;
  const gap = 16 * safe.u;
  const cw = (safe.w - gap * (cols - 1)) / cols;
  const order = Array.from({length: n}, (_, i) => i).sort((a, b) => random(`o${a}`) - random(`o${b}`));
  // accelerating cadence: appearance time of the k-th site grows like k^2
  const total = durationInFrames * 0.8;
  return (
    <SceneBg tone={tone}>
      <div style={{position: 'absolute', left: safe.x, top: safe.y, width: safe.w, height: safe.h, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <div style={{display: 'grid', gridTemplateColumns: `repeat(${cols}, ${cw}px)`, gap}}>
          {Array.from({length: n}, (_, i) => {
            const k = order.indexOf(i);
            const at = 2 + total * Math.pow(k / n, 0.62);
            const p = interpolate(frame, [at, at + 6], [0, 1], {...clamp, easing: Easing.out(Easing.back(1.7))});
            return (
              <div key={i} style={{height: cw * 0.92, opacity: Math.min(1, p * 3), transform: `scale(${0.4 + 0.6 * p})`}}>
                <SiteMock W={cw} skin={SKINS[i % SKINS.length]} chrome={false} />
              </div>
            );
          })}
        </div>
      </div>
    </SceneBg>
  );
};

/** "Vibe coding": a prompt types out in a bar, then the site assembles itself below it. */
export const SiteBuild: React.FC<Base & {prompt?: string; skin?: Skin; tone?: Tone}> = ({prompt = 'Build me a website for a coffee shop', skin = SKINS[1], tone = 'secondary', durationInFrames}) => {
  const safe = useSafe();
  const frame = useCurrentFrame();
  const enter = useSpringIn(0, {damping: 14});
  const typeEnd = durationInFrames * 0.32;
  const chars = Math.floor(interpolate(frame, [4, typeEnd], [0, prompt.length], clamp));
  const build = interpolate(frame, [typeEnd + 4, durationInFrames * 0.9], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const W = Math.min(safe.w * 0.92, safe.h * 0.62 / 1.1);
  return (
    <SceneBg tone={tone}>
      <div style={{position: 'absolute', left: safe.x, top: safe.y, width: safe.w, height: safe.h, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 34 * safe.u, transform: `scale(${0.92 + 0.08 * enter})`, opacity: Math.min(1, enter * 2)}}>
        <div style={{width: W, background: '#fff', border: edge(6 * safe.u), borderRadius: 40 * safe.u, boxShadow: hardShadow(10 * safe.u), padding: `${18 * safe.u}px ${28 * safe.u}px`, display: 'flex', alignItems: 'center', gap: 14 * safe.u, boxSizing: 'border-box'}}>
          <span style={{fontSize: 40 * safe.u, fontWeight: 800, color: colors.line, whiteSpace: 'nowrap', flex: 1}}>
            {prompt.slice(0, chars)}
            {frame % 16 < 9 && chars < prompt.length ? <span style={{color: colors.primary}}>|</span> : null}
          </span>
          <div style={{width: 54 * safe.u, height: 54 * safe.u, borderRadius: '50%', background: colors.primary, border: edge(4 * safe.u), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30 * safe.u, fontWeight: 900}}>↑</div>
        </div>
        <SiteMock W={W} skin={skin} build={build} />
      </div>
    </SceneBg>
  );
};

/** Two images of the same thing: a wipe sweeps across from `a` to `b` (e.g. plain → "AI look"). Labels optional. */
export const ImageWipe: React.FC<Base & {a: string; b: string; aspect?: number; labels?: [string, string]; tone?: Tone}> = ({a, b, aspect = 0.857, labels, tone = 'dark', durationInFrames}) => {
  const safe = useSafe();
  const frame = useCurrentFrame();
  const enter = useSpringIn(0, {damping: 14});
  const sweep = interpolate(frame, [durationInFrames * 0.25, durationInFrames * 0.75], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const cw = Math.min(safe.w * 0.94, safe.h * 0.78 * aspect);
  const ch = cw / aspect;
  const lab = (t: string, side: 'l' | 'r', show: number) => (
    <div style={{position: 'absolute', top: -18 * safe.u, [side === 'l' ? 'left' : 'right']: -10 * safe.u, opacity: show, transform: `scale(${0.8 + 0.2 * show})`}}>
      <BrandBox color={side === 'l' ? 'white' : 'primary'} depth={8 * safe.u} extrude={show} padding="0.08em 0.3em">
        <span style={{fontSize: 36 * safe.u, fontWeight: 900, whiteSpace: 'nowrap'}}>{glue(t)}</span>
      </BrandBox>
    </div>
  );
  return (
    <SceneBg tone={tone}>
      <div style={{position: 'absolute', left: safe.x, top: safe.y, width: safe.w, height: safe.h, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <div style={{position: 'relative', width: cw, height: ch, transform: `scale(${0.9 + 0.1 * enter})`, opacity: Math.min(1, enter * 2), border: edge(7 * safe.u), boxShadow: hardShadow(14 * safe.u), boxSizing: 'content-box', background: '#fff'}}>
          <Img src={staticFile(a)} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover'}} />
          <div style={{position: 'absolute', inset: 0, clipPath: `inset(0 ${(1 - sweep) * 100}% 0 0)`}}>
            <Img src={staticFile(b)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
          </div>
          <div style={{position: 'absolute', top: 0, bottom: 0, left: `${sweep * 100}%`, width: 8 * safe.u, background: colors.primary, opacity: sweep > 0 && sweep < 1 ? 1 : 0}} />
          {labels ? lab(labels[0], 'l', 1) : null}
          {labels ? lab(labels[1], 'r', interpolate(sweep, [0.4, 0.6], [0, 1], clamp)) : null}
        </div>
      </div>
    </SceneBg>
  );
};
