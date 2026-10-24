/**
 * Object-metaphor scenes drawn in code (no media needed): closed app grid, Wi-Fi signal, ports and plugs,
 * a thermometer. Each shows ONE physical idea instead of repeating the sentence as text.
 */
import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {colors, fonts, glue, hardShadow, edge} from '../../brand';
import {clamp, useProgress, useSpringIn} from '../../lib/anim';
import {useSafe} from '../../lib/safe';
import {BrandBox} from '../BrandBox';
import {Base, Center, Drop, SceneBg, Tone, TONE} from './common';

const Lock: React.FC<{size: number; color?: string}> = ({size, color = colors.white}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
    <rect x={5} y={11} width={14} height={9} rx={2} fill={color} />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

/**
 * A grid of app tiles: the first ones open (named), the rest locked, then a stamp lands.
 * "still closed to developers", "the platform owner picks the apps".
 */
export const LockedGrid: React.FC<Base & {open: string[]; locked?: number; stamp?: string; title?: string; tone?: Tone}> = ({open, locked = 6, stamp = 'Not open yet', title, tone = 'dark', durationInFrames}) => {
  const safe = useSafe();
  const frame = useCurrentFrame();
  const t = TONE[tone];
  const cols = 3;
  const total = open.length + locked;
  const tile = Math.min(300 * safe.u, (safe.w - 80 * safe.u) / cols - 24 * safe.u);
  const lockAt = Math.round(durationInFrames * 0.42);
  const stampS = useSpringIn(Math.round(durationInFrames * 0.66), {damping: 9});
  return (
    <SceneBg tone={tone}>
      <Center gap={34}>
        {title ? (
          <Drop>
            {(ex) => (
              <BrandBox color="white" extrude={ex} depth={12 * safe.u}>
                <span style={{fontSize: 56 * safe.u, fontWeight: 900}}>{glue(title)}</span>
              </BrandBox>
            )}
          </Drop>
        ) : null}
        <div style={{position: 'relative', display: 'grid', gridTemplateColumns: `repeat(${cols}, ${tile}px)`, gap: 24 * safe.u}}>
          {Array.from({length: total}, (_, i) => {
            const isOpen = i < open.length;
            const s = useSpringIn(3 + i * 3, {damping: 12});
            const lp = isOpen ? 0 : interpolate(frame, [lockAt + (i - open.length) * 3, lockAt + (i - open.length) * 3 + 6], [0, 1], clamp);
            return (
              <div
                key={i}
                style={{
                  width: tile,
                  height: tile,
                  borderRadius: tile * 0.22,
                  border: edge(7 * safe.u),
                  background: isOpen ? colors.white : lp > 0.5 ? colors.dark : colors.paper,
                  boxShadow: hardShadow(10 * safe.u),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  gap: 8 * safe.u,
                  transform: `scale(${0.4 + 0.6 * s})`,
                  opacity: Math.min(1, s * 2) * (isOpen ? 1 : 0.55 + 0.45 * lp),
                  outline: isOpen ? `${5 * safe.u}px solid ${colors.primary}` : 'none',
                  outlineOffset: -(16 * safe.u),
                  boxSizing: 'border-box',
                }}
              >
                {isOpen ? (
                  <span style={{fontSize: 38 * safe.u, fontWeight: 900, fontFamily: fonts.display, color: colors.line, textAlign: 'center', padding: `0 ${8 * safe.u}px`, lineHeight: 1.05}}>{open[i]}</span>
                ) : (
                  <div style={{transform: `scale(${0.5 + 0.5 * lp})`, opacity: lp}}>
                    <Lock size={tile * 0.4} />
                  </div>
                )}
              </div>
            );
          })}
          <div style={{position: 'absolute', left: '50%', top: '50%', transform: `translate(-50%, -50%) rotate(${-9 + (1 - stampS) * 14}deg) scale(${0.4 + 0.6 * stampS})`, opacity: Math.min(1, stampS * 2)}}>
            <BrandBox color={t.box === 'primary' ? 'primary' : 'white'} extrude={stampS} depth={16 * safe.u} padding="0.16em 0.45em">
              <span style={{fontSize: 74 * safe.u, fontWeight: 900, whiteSpace: 'nowrap'}}>{glue(stamp)}</span>
            </BrandBox>
          </div>
        </div>
      </Center>
    </SceneBg>
  );
};

/* ------------------------------------------------------------------------------------------------ */

/** The Wi-Fi symbol at full strength, then the arcs drop out one by one and a cross lands. */
export const SignalBars: React.FC<Base & {label?: string; verdict?: string; tone?: Tone; durationInFrames: number}> = ({label = 'Wi-Fi', verdict = 'problem', tone = 'paper', durationInFrames}) => {
  const safe = useSafe();
  const frame = useCurrentFrame();
  const enter = useSpringIn(0, {damping: 13});
  const fail = (k: number) => interpolate(frame, [durationInFrames * (0.28 + k * 0.14), durationInFrames * (0.28 + k * 0.14) + 7], [1, 0], clamp);
  const arcs = [fail(2), fail(1), fail(0)]; // outer arc drops first
  const cross = useSpringIn(Math.round(durationInFrames * 0.62), {damping: 9});
  const size = 900 * safe.u;
  const arc = (r: number, o: number, k: number) => {
    const a = (Math.PI / 180) * 38;
    const x1 = 100 - r * Math.sin(a);
    const x2 = 100 + r * Math.sin(a);
    const y = 150 - r * Math.cos(a);
    return <path key={k} d={`M${x1},${y} A${r},${r} 0 0 1 ${x2},${y}`} fill="none" stroke={o > 0.5 ? colors.line : 'rgba(0,0,0,0.18)'} strokeWidth={15} strokeLinecap="round" strokeDasharray={o > 0.5 ? undefined : '1 26'} />;
  };
  return (
    <SceneBg tone={tone}>
      <Center gap={16}>
        <div style={{transform: `scale(${0.7 + 0.3 * enter})`, opacity: Math.min(1, enter * 2), position: 'relative'}}>
          <svg width={size} height={size * 0.82} viewBox="0 20 200 150">
            {arc(95, arcs[0], 0)}
            {arc(64, arcs[1], 1)}
            {arc(33, arcs[2], 2)}
            <circle cx={100} cy={150} r={11} fill={colors.line} />
          </svg>
          <div style={{position: 'absolute', left: '50%', top: '46%', transform: `translate(-50%, -50%) rotate(${-12 + (1 - cross) * 18}deg) scale(${cross})`, opacity: cross}}>
            <BrandBox color="primary" depth={16 * safe.u} extrude={cross} padding="0.1em 0.45em">
              <span style={{fontSize: 110 * safe.u, fontWeight: 900, whiteSpace: 'nowrap'}}>{glue(verdict)}</span>
            </BrandBox>
          </div>
        </div>
        <Drop delay={6} from="bottom">
          {(ex) => (
            <BrandBox color="dark" extrude={ex} depth={12 * safe.u}>
              <span style={{fontSize: 60 * safe.u, fontWeight: 900}}>{glue(label)}</span>
            </BrandBox>
          )}
        </Drop>
      </Center>
    </SceneBg>
  );
};

/* ------------------------------------------------------------------------------------------------ */

type Port = {label: string; ok: boolean};

/**
 * A device with a row of ports, and a cable that tries to plug into one: it clicks in where the port
 * exists and bounces off a dashed "missing" socket where it doesn't.
 */
export const PortPlug: React.FC<Base & {device: string; ports: Port[]; plug: string; note?: string; tone?: Tone; durationInFrames: number}> = ({device, ports, plug, note, tone = 'secondary', durationInFrames}) => {
  const safe = useSafe();
  const frame = useCurrentFrame();
  const enter = useSpringIn(0, {damping: 14});
  const target = Math.max(0, ports.findIndex((p) => p.label === plug));
  const ok = ports[target]?.ok ?? false;
  const go = useProgress(Math.round(durationInFrames * 0.18), Math.round(durationInFrames * 0.5));
  // a plug that finds no port stops short, jiggles and drops back
  const reach = ok ? go : Math.min(go, 0.78) - (go > 0.9 ? (go - 0.9) * 3 : 0);
  const shake = !ok && go > 0.7 ? Math.sin(frame * 1.7) * 8 * safe.u : 0;
  const verdict = useSpringIn(Math.round(durationInFrames * 0.55), {damping: 10});
  const pw = Math.min(250 * safe.u, (safe.w * 0.8 - 30 * safe.u * ports.length) / ports.length);
  const cableLen = 520 * safe.u;
  return (
    <SceneBg tone={tone}>
      <Center gap={26}>
        <div style={{transform: `scale(${0.8 + 0.2 * enter})`, opacity: Math.min(1, enter * 2), paddingBottom: cableLen * 0.62}}>
          {/* the cable is anchored to the device box itself, so its plug lands exactly on the chosen port */}
          <div style={{position: 'relative', display: 'inline-block'}}>
            <BrandBox color="white" depth={18 * safe.u} padding={`${34 * safe.u}px ${44 * safe.u}px`} style={{display: 'block'}}>
              <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26 * safe.u}}>
                <span style={{fontSize: 58 * safe.u, fontWeight: 900}}>{glue(device)}</span>
                <div style={{display: 'flex', gap: 30 * safe.u}}>
                  {ports.map((p, i) => (
                    <div key={i} style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 * safe.u}}>
                      <div
                        style={{
                          width: pw,
                          height: pw * 0.62,
                          borderRadius: 12 * safe.u,
                          border: `${7 * safe.u}px ${p.ok ? 'solid' : 'dashed'} ${colors.line}`,
                          background: p.ok ? colors.dark : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {!p.ok ? <span style={{fontSize: pw * 0.4, fontWeight: 900, color: colors.primary}}>✕</span> : null}
                      </div>
                      <span style={{fontSize: 38 * safe.u, fontWeight: 900}}>{p.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </BrandBox>
            <div
              style={{
                position: 'absolute',
                left: `calc(50% + ${(target - (ports.length - 1) / 2) * (pw + 30 * safe.u + 14 * safe.u)}px)`,
                top: `calc(100% - ${96 * safe.u}px + ${(1 - reach) * cableLen * 0.62}px)`,
                transform: `translateX(-50%) translateX(${shake}px)`,
                width: 26 * safe.u,
                height: cableLen,
                background: colors.line,
                borderRadius: 13 * safe.u,
                zIndex: -1,
              }}
            >
              <div style={{position: 'absolute', left: '50%', top: -(58 * safe.u), width: 78 * safe.u, height: 74 * safe.u, marginLeft: -39 * safe.u, background: colors.paper, border: edge(7 * safe.u), borderRadius: 8 * safe.u}} />
            </div>
          </div>
        </div>
        <div style={{transform: `scale(${verdict})`, opacity: verdict}}>
          <BrandBox color={ok ? 'white' : 'primary'} depth={14 * safe.u} extrude={verdict} padding="0.12em 0.45em">
            <span style={{fontSize: 70 * safe.u, fontWeight: 900, whiteSpace: 'nowrap'}}>{glue(note ?? (ok ? `${plug} works` : `${plug} missing`))}</span>
          </BrandBox>
        </div>
      </Center>
    </SceneBg>
  );
};

/* ------------------------------------------------------------------------------------------------ */

/** A thermometer filling with red until the label lands: "sa uvaril". */
export const Thermometer: React.FC<Base & {label?: string; verdict?: string; tone?: Tone; durationInFrames: number}> = ({label = 'Temperature', verdict = 'overheated', tone = 'paper', durationInFrames}) => {
  const safe = useSafe();
  const frame = useCurrentFrame();
  const enter = useSpringIn(0, {damping: 14});
  const fill = useProgress(8, Math.round(durationInFrames * 0.62));
  const boil = frame > durationInFrames * 0.62 ? Math.sin(frame * 1.9) * 5 * safe.u : 0;
  const pop = useSpringIn(Math.round(durationInFrames * 0.6), {damping: 9});
  const h = 1000 * safe.u;
  const w = 165 * safe.u;
  return (
    <SceneBg tone={tone}>
      <Center gap={26}>
        <div style={{position: 'relative', transform: `translateX(${boil}px) scale(${0.8 + 0.2 * enter})`, opacity: Math.min(1, enter * 2), display: 'flex', alignItems: 'flex-end', gap: 40 * safe.u}}>
          <div style={{position: 'relative', width: w, height: h}}>
            <div style={{position: 'absolute', left: 0, bottom: w * 0.6, width: w, height: h - w * 0.6, borderRadius: w / 2, border: edge(9 * safe.u), background: colors.white, boxSizing: 'border-box', overflow: 'hidden', boxShadow: hardShadow(12 * safe.u)}}>
              <div style={{position: 'absolute', left: '28%', width: '44%', bottom: 0, height: `${12 + fill * 82}%`, background: colors.primary}} />
              {Array.from({length: 7}, (_, i) => (
                <div key={i} style={{position: 'absolute', right: 0, bottom: `${10 + i * 13}%`, width: i % 2 ? '16%' : '26%', height: 5 * safe.u, background: colors.line}} />
              ))}
            </div>
            <div style={{position: 'absolute', left: -w * 0.18, bottom: 0, width: w * 1.36, height: w * 1.36, borderRadius: '50%', background: colors.primary, border: edge(9 * safe.u), boxSizing: 'border-box', boxShadow: hardShadow(12 * safe.u)}} />
          </div>
          <div style={{display: 'flex', flexDirection: 'column', gap: 30 * safe.u, alignItems: 'flex-start', paddingBottom: 130 * safe.u}}>
            <div style={{transform: `scale(${pop}) rotate(${(1 - pop) * 12 - 4}deg)`, opacity: pop, transformOrigin: '0 50%'}}>
              <BrandBox color="primary" extrude={pop} depth={16 * safe.u} padding="0.12em 0.4em">
                <span style={{fontSize: 80 * safe.u, fontWeight: 900, whiteSpace: 'nowrap'}}>{glue(verdict)}</span>
              </BrandBox>
            </div>
            <BrandBox color="dark" depth={10 * safe.u} padding="0.1em 0.35em">
              <span style={{fontSize: 48 * safe.u, fontWeight: 900}}>{glue(label)}</span>
            </BrandBox>
          </div>
        </div>
      </Center>
    </SceneBg>
  );
};
