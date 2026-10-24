import React, {useId} from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {colors} from '../brand';
import {clamp} from '../lib/anim';

/**
 * Felt-marker highlight (a hand-swiped colour block, in the primary colour): a slightly rough stroke that
 * sweeps in behind the text left→right, starting at `delay` frames, over `frames` frames.
 */
export const Marker: React.FC<{children: React.ReactNode; delay?: number; frames?: number; color?: string; seed?: number}> = ({
  children,
  delay = 0,
  frames = 7,
  color = colors.primary,
  seed = 1,
}) => {
  const frame = useCurrentFrame();
  const id = `m${useId().replace(/:/g, '')}`;
  const p = interpolate(frame, [delay, delay + frames], [0, 1], clamp);
  return (
    <span style={{position: 'relative', display: 'inline-block', whiteSpace: 'nowrap'}}>
      <svg style={{position: 'absolute', left: '-4%', top: '12%', width: '108%', height: '82%', overflow: 'visible', zIndex: 0}} viewBox="0 0 100 100" preserveAspectRatio="none">
        <filter id={id}>
          <feTurbulence type="fractalNoise" baseFrequency="0.04 0.3" numOctaves={2} seed={seed} />
          <feDisplacementMap in="SourceGraphic" scale={6} />
        </filter>
        <rect x={0} y={4} width={100 * p} height={92} fill={color} filter={`url(#${id})`} transform="skewX(-4)" />
      </svg>
      <span style={{position: 'relative', zIndex: 1}}>{children}</span>
    </span>
  );
};
