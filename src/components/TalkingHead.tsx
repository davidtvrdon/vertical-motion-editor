import React from 'react';
import {AbsoluteFill, Easing, interpolate, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import type {EditPlan, Zoom} from '../types';

export const zoomAt = (t: number, zooms: Zoom[] = []) => {
  const z = zooms.find((zz) => t >= zz.start && t < zz.end);
  if (!z) return {scale: 1, x: undefined, y: undefined};
  if (z.ease === 'smooth') {
    const p = interpolate(t, [z.start, z.end], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.inOut(Easing.sin),
    });
    return {scale: 1 + (z.scale - 1) * p, x: z.x, y: z.y};
  }
  return {scale: z.scale, x: z.x, y: z.y};
};

export type RoomWindow = {start: number; end: number; scale: number; y: number};

/** 0→1→0 around each room window (ease in/out over ~0.3 s), with that window's card geometry. */
const roomAt = (t: number, rooms: RoomWindow[] = []) => {
  const ramp = 0.3;
  for (const r of rooms) {
    if (t < r.start - 0.05 || t > r.end + ramp) continue;
    const p = Math.min(
      interpolate(t, [r.start - 0.05, r.start + ramp - 0.05], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.85, 0, 0.15, 1)}),
      interpolate(t, [r.end - 0.05, r.end + ramp], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.85, 0, 0.15, 1)}),
    );
    return {p, r};
  }
  return null;
};

/**
 * The A-roll: continuous source video (and its audio) with crop + punch-in zooms.
 * During on-face overlays (`rooms`) the video shrinks into a framed card so the graphic gets
 * its own band above the head and never covers the face (punch-in zooms pause meanwhile).
 */
export const TalkingHead: React.FC<{plan: EditPlan; rooms?: RoomWindow[]; backdrop?: React.ReactNode}> = ({plan, rooms, backdrop}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const {src, start = 0, volume = 1, focusX = 0.5, focusY = 0.4} = plan.source;
  const t = frame / fps;
  const z = zoomAt(t, plan.zooms);
  const room = roomAt(t, rooms);
  const p = room?.p ?? 0;
  const zs = 1 + (z.scale - 1) * (1 - p);
  // focusTrack: centre the crop on the face of a 16:9 source (visible width = out aspect / 16:9)
  const track = plan.source.focusTrack?.find((f) => t >= f.start && t < f.end);
  const vis = width / height / (16 / 9);
  const cropX = track ? Math.min(1, Math.max(0, (track.x - vis / 2) / (1 - vis))) : focusX;
  const ox = (z.x ?? (track ? 0.5 : focusX)) * 100;
  const oy = (z.y ?? focusY) * 100;
  const cs = room ? 1 + (room.r.scale - 1) * p : 1;
  const cy = room ? room.r.y * p : 0;
  const u = Math.min(width, height) / 1080;
  const card: React.CSSProperties = p > 0
    ? {
        transform: `translate(${(width * (1 - cs)) / 2}px, ${cy}px) scale(${cs})`,
        transformOrigin: '0 0',
        outline: `${(8 * u) / cs}px solid black`,
        boxShadow: `${(18 * u) / cs}px ${(18 * u) / cs}px 0 rgba(0,0,0,${0.9 * p})`,
      }
    : {};
  // host A is always in the upper half: where the source has the halves the other way round, swap them
  const swap = plan.layout?.hostSwap?.find((w) => t >= w.start && t < w.end);
  if (swap) {
    const half = (top: boolean, withAudio: boolean) => (
      <div style={{position: 'absolute', left: 0, width: '100%', height: '50%', top: top ? 0 : '50%', overflow: 'hidden'}}>
        <OffthreadVideo
          src={staticFile(src)}
          trimBefore={Math.round(start * fps)}
          volume={withAudio ? volume : 0}
          style={{position: 'absolute', left: 0, width: '100%', height: '200%', top: top ? '-100%' : 0, objectFit: 'cover', objectPosition: `${cropX * 100}% ${focusY * 100}%`}}
        />
      </div>
    );
    return (
      <AbsoluteFill style={{backgroundColor: '#000', overflow: 'hidden'}}>
        {half(true, false)}
        {half(false, true)}
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{backgroundColor: '#000', overflow: 'hidden'}}>
      {p > 0 && backdrop ? <AbsoluteFill style={{opacity: Math.min(1, p * 1.5)}}>{backdrop}</AbsoluteFill> : null}
      <AbsoluteFill style={{...card, overflow: 'hidden'}}>
        <AbsoluteFill style={{transform: `scale(${zs})`, transformOrigin: `${ox}% ${oy}%`}}>
          <OffthreadVideo
            src={staticFile(src)}
            trimBefore={Math.round(start * fps)}
            volume={volume}
            style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${cropX * 100}% ${focusY * 100}%`}}
          />
        </AbsoluteFill>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
