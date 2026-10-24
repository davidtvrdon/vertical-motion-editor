/**
 * Explainer scenes: motion graphics that SHOW what is being said, used instead of
 * generic stock b-roll (chat UIs, cause→effect chains, open questions).
 */
import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {colors, fonts, glue, edge} from '../../brand';
import {clamp, useSpringIn} from '../../lib/anim';
import {useSafe} from '../../lib/safe';
import {BrandBox} from '../BrandBox';
import {ScreenTreatment} from '../Scribble';
import {Base, Center, Drop, SceneBg, Tone, TONE} from './common';

type Msg = {
  from: 'user' | 'ai';
  text: string;
  /** already on screen when the scene starts (continuing a conversation) */
  instant?: boolean;
};

/** Frame windows for each message: user messages type out, AI messages "think" then appear. */
const schedule = (messages: Msg[], dur: number) => {
  const live = messages.filter((m) => !m.instant).length || 1;
  const start = 6;
  const slot = Math.max(8, (dur * 0.82 - start) / live);
  let k = 0;
  return messages.map((m) => {
    if (m.instant) return {from: -1, to: -1};
    const from = start + k * slot;
    k++;
    return {from, to: from + slot * 0.8};
  });
};

const TypingDots: React.FC<{size: number}> = ({size}) => {
  const frame = useCurrentFrame();
  return (
    <span style={{display: 'inline-flex', gap: size * 0.25}}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: size * 0.32,
            height: size * 0.32,
            borderRadius: '50%',
            background: colors.line,
            transform: `translateY(${Math.sin((frame + i * 4) / 3) * size * 0.12}px)`,
          }}
        />
      ))}
    </span>
  );
};

/**
 * A chat window in the brand style (think ChatGPT / Claude): the user's prompt types itself out,
 * the AI "thinks" (dots) and answers. Use when the speaker describes prompting an AI.
 */
export const ChatMock: React.FC<Base & {title?: string; messages: Msg[]; tone?: Tone; placeholder?: string}> = ({
  title = 'AI chat',
  messages,
  tone = 'secondary',
  placeholder = 'Type a message…',
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const safe = useSafe();
  const win = useSpringIn(0, {damping: 16});
  const size = (safe.isShort ? 54 : 36) * safe.u;
  const times = schedule(messages, durationInFrames);
  const winW = safe.isShort ? safe.w : Math.min(safe.w * 0.62, 1100 * safe.u);
  return (
    <SceneBg tone={tone}>
      <Center>
        <div style={{transform: `translateY(${(1 - win) * 80}px) scale(${0.92 + 0.08 * win})`, opacity: Math.min(1, win * 2)}}>
          <BrandBox color="white" depth={24 * safe.u * win} padding={0} style={{display: 'block'}}>
            <ScreenTreatment>
            <div style={{width: winW, display: 'flex', flexDirection: 'column'}}>
              {/* title bar */}
              <div style={{background: colors.line, padding: `${14 * safe.u}px ${22 * safe.u}px`, display: 'flex', alignItems: 'center', gap: 12 * safe.u}}>
                {[colors.primary, colors.white, colors.white].map((c, i) => (
                  <span key={i} style={{width: 18 * safe.u, height: 18 * safe.u, borderRadius: '50%', background: c}} />
                ))}
                <span style={{marginLeft: 12 * safe.u, color: colors.white, fontFamily: fonts.display, fontWeight: 800, fontSize: size * 0.8}}>{title}</span>
              </div>
              {/* messages */}
              <div style={{padding: 26 * safe.u, display: 'flex', flexDirection: 'column', gap: 22 * safe.u, minHeight: (safe.isShort ? 640 : 420) * safe.u, justifyContent: 'flex-end', background: colors.paper}}>
                {messages.map((m, i) => {
                  const t = times[i];
                  const visible = m.instant || frame >= t.from;
                  if (!visible) return null;
                  const p = m.instant ? 1 : interpolate(frame, [t.from, t.to], [0, 1], clamp);
                  const pop = m.instant ? 1 : interpolate(frame, [t.from, t.from + 6], [0.6, 1], clamp);
                  const isUser = m.from === 'user';
                  const text = glue(m.text);
                  // user: typewriter; ai: thinking dots for the first 35 %, then words appear
                  const shown = isUser ? text.slice(0, Math.ceil(text.length * p)) : p < 0.35 ? '' : text.split(' ').slice(0, Math.ceil(text.split(' ').length * ((p - 0.35) / 0.4))).join(' ');
                  const typing = isUser && p < 1;
                  return (
                    <div key={i} style={{alignSelf: isUser ? 'flex-end' : 'flex-start', maxWidth: '84%', transform: `scale(${pop})`, transformOrigin: isUser ? '100% 100%' : '0% 100%'}}>
                      <BrandBox color={isUser ? 'primary' : 'white'} depth={10 * safe.u} stroke={5 * safe.u} padding={`${14 * safe.u}px ${20 * safe.u}px`}>
                        <span style={{fontSize: size, fontWeight: isUser ? 800 : 600, lineHeight: 1.25, display: 'block', textAlign: 'left'}}>
                          {!isUser && shown === '' ? <TypingDots size={size} /> : shown}
                          {typing ? <span style={{opacity: Math.floor(frame / 8) % 2 ? 0 : 1}}>▍</span> : null}
                        </span>
                      </BrandBox>
                    </div>
                  );
                })}
              </div>
              {/* input bar */}
              <div style={{borderTop: `${5 * safe.u}px solid ${colors.line}`, padding: `${14 * safe.u}px ${20 * safe.u}px`, display: 'flex', alignItems: 'center', gap: 16 * safe.u, background: colors.white}}>
                <span style={{flex: 1, color: colors.grey, fontFamily: fonts.body, fontWeight: 600, fontSize: size * 0.8}}>{placeholder}</span>
                <span style={{width: 56 * safe.u, height: 56 * safe.u, background: colors.primary, border: edge(5 * safe.u), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.8, fontWeight: 900}}>↑</span>
              </div>
            </div>
            </ScreenTreatment>
          </BrandBox>
        </div>
      </Center>
    </SceneBg>
  );
};

/**
 * Cause → effect chain: boxes appear one by one, connected by arrows that draw themselves.
 * Vertical on 9:16, horizontal on 16:9. `labels[i]` sits on the arrow between node i and i+1.
 */
export const FlowDiagram: React.FC<Base & {nodes: string[]; labels?: string[]; title?: string; highlight?: number; tone?: Tone}> = ({
  nodes,
  labels = [],
  title,
  highlight,
  tone = 'paper',
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const safe = useSafe();
  const t = TONE[tone];
  const vertical = safe.isShort;
  const hasTitle = Boolean(title);
  const step = Math.max(5, Math.min(14, Math.floor((durationInFrames * 0.6) / Math.max(1, nodes.length))));
  const base = hasTitle ? 6 : 0;
  const size = (safe.isShort ? 118 : 64) * safe.u * (nodes.some((n) => n.length > 11) ? 0.72 : 1);
  const arrowLen = (vertical ? 170 : 120) * safe.u;
  const sw = 11 * safe.u;
  const hl = highlight ?? nodes.length - 1;
  return (
    <SceneBg tone={tone}>
      <Center gap={26}>
        {title ? (
          <Drop>
            {(ex) => (
              <BrandBox color="dark" extrude={ex} depth={12 * safe.u}>
                <span style={{fontSize: size * 0.8, fontWeight: 900}}>{glue(title)}</span>
              </BrandBox>
            )}
          </Drop>
        ) : null}
        <div style={{display: 'flex', flexDirection: vertical ? 'column' : 'row', alignItems: 'center'}}>
          {nodes.map((n, i) => {
            const at = base + i * step;
            const arrowP = interpolate(frame, [at + step * 0.35, at + step], [0, 1], clamp);
            return (
              <React.Fragment key={i}>
                <Drop delay={at} from={vertical ? 'top' : 'left'}>
                  {(ex) => (
                    <BrandBox color={i === hl ? 'primary' : 'white'} extrude={ex} depth={22 * safe.u} stroke={8 * safe.u}>
                      <span style={{fontSize: size, fontWeight: 900}}>{glue(n)}</span>
                    </BrandBox>
                  )}
                </Drop>
                {i < nodes.length - 1 ? (
                  <div style={{position: 'relative', width: vertical ? arrowLen : arrowLen + 20 * safe.u, height: vertical ? arrowLen + 10 * safe.u : arrowLen, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                    <svg width={vertical ? sw * 6 : arrowLen} height={vertical ? arrowLen : sw * 6} style={{overflow: 'visible'}}>
                      {vertical ? (
                        <>
                          <line x1={sw * 3} y1={0} x2={sw * 3} y2={(arrowLen - sw * 3) * arrowP} stroke={t.fg} strokeWidth={sw} />
                          {arrowP > 0.9 ? <polygon points={`${sw * 0.5},${arrowLen - sw * 3.5} ${sw * 5.5},${arrowLen - sw * 3.5} ${sw * 3},${arrowLen}`} fill={t.fg} /> : null}
                        </>
                      ) : (
                        <>
                          <line x1={0} y1={sw * 3} x2={(arrowLen - sw * 3) * arrowP} y2={sw * 3} stroke={t.fg} strokeWidth={sw} />
                          {arrowP > 0.9 ? <polygon points={`${arrowLen - sw * 3.5},${sw * 0.5} ${arrowLen - sw * 3.5},${sw * 5.5} ${arrowLen},${sw * 3}`} fill={t.fg} /> : null}
                        </>
                      )}
                    </svg>
                    {labels[i] ? (
                      <div
                        style={{
                          position: 'absolute',
                          ...(vertical ? {left: '62%', top: '50%', transform: 'translateY(-50%)'} : {top: '-60%', left: '50%', transform: 'translateX(-50%)'}),
                          whiteSpace: 'nowrap',
                          opacity: arrowP,
                        }}
                      >
                        <BrandBox color="dark" depth={0} stroke={4 * safe.u} padding="0.08em 0.3em">
                          <span style={{fontSize: Math.max(size * 0.42, 44 * safe.u), fontWeight: 800}}>{glue(labels[i])}</span>
                        </BrandBox>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </React.Fragment>
            );
          })}
        </div>
      </Center>
    </SceneBg>
  );
};

/** A question worth pausing on: a huge "?" box lands, the question builds word by word. */
export const BigQuestion: React.FC<Base & {text: string; tone?: Tone}> = ({text, tone = 'paper', durationInFrames}) => {
  const frame = useCurrentFrame();
  const safe = useSafe();
  const t = TONE[tone];
  const q = useSpringIn(0, {damping: 9, stiffness: 160});
  const words = glue(text).split(' ');
  const per = Math.max(2, Math.min(6, Math.floor((durationInFrames * 0.45) / words.length)));
  const size = (safe.isShort ? 112 : 80) * safe.u * (words.length > 6 ? 0.85 : 1);
  return (
    <SceneBg tone={tone}>
      <Center gap={60}>
        <div style={{transform: `scale(${q}) rotate(${(1 - q) * -25 + Math.sin(frame / 10) * 2}deg)`}}>
          <BrandBox color={t.box === 'white' ? 'white' : 'primary'} depth={36 * safe.u * q} stroke={10 * safe.u} padding="0 0.28em">
            <span style={{fontSize: 360 * safe.u, fontWeight: 900, lineHeight: 1.05}}>?</span>
          </BrandBox>
        </div>
        <div style={{display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: `${size * 0.1}px ${size * 0.26}px`, maxWidth: safe.w}}>
          {words.map((w, i) => {
            const p = interpolate(frame, [8 + i * per, 12 + i * per], [0, 1], clamp);
            return (
              <span key={i} style={{fontFamily: fonts.display, fontWeight: 900, fontSize: size, color: t.fg, opacity: p, transform: `translateY(${(1 - p) * 20}px)`, display: 'inline-block', letterSpacing: '-0.02em'}}>
                {w}
              </span>
            );
          })}
        </div>
      </Center>
    </SceneBg>
  );
};
