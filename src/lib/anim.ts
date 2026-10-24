import {Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';

/**
 * Motion language: snappy in (spring with a little overshoot), quick clean out.
 * Things "drop" into place like a box landing, then the extrusion grows.
 */
export const EXIT_FRAMES = 6;

export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/** 0→1 spring for entrances. delay in frames. */
export const useSpringIn = (delay = 0, config: {damping?: number; stiffness?: number; mass?: number} = {}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({frame: frame - delay, fps, config: {damping: 14, stiffness: 180, mass: 0.7, ...config}});
};

/** 1→0 over the last EXIT_FRAMES of a Sequence of length `duration` frames. */
export const useExit = (duration: number, frames = EXIT_FRAMES) => {
  const frame = useCurrentFrame();
  return interpolate(frame, [duration - frames, duration], [1, 0], {...clamp, easing: Easing.in(Easing.cubic)});
};

/** Linear 0→1 progress across [from, to] frames, eased. */
export const useProgress = (from: number, to: number, easing = Easing.out(Easing.cubic)) => {
  const frame = useCurrentFrame();
  return interpolate(frame, [from, to], [0, 1], {...clamp, easing});
};

export const sec = (s: number, fps: number) => Math.round(s * fps);
