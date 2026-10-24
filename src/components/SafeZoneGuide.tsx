import React from 'react';
import {AbsoluteFill} from 'remotion';
import {useSafe} from '../lib/safe';

/** Debug layer: shades the areas covered by platform UI. Enable with plan.debug.safeZones. */
export const SafeZoneGuide: React.FC = () => {
  const {insets, width, height, platform} = useSafe();
  const shade = 'rgba(0, 170, 255, 0.28)';
  const label: React.CSSProperties = {position: 'absolute', color: 'white', font: '600 26px monospace', textShadow: '0 0 4px black'};
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div style={{position: 'absolute', left: 0, top: 0, width, height: insets.top, background: shade}} />
      <div style={{position: 'absolute', left: 0, bottom: 0, width, height: insets.bottom, background: shade}} />
      <div style={{position: 'absolute', left: 0, top: insets.top, width: insets.left, bottom: insets.bottom, background: shade}} />
      <div style={{position: 'absolute', right: 0, top: insets.top, width: insets.right, bottom: insets.bottom, background: shade}} />
      <div
        style={{
          position: 'absolute',
          left: insets.left,
          top: insets.top,
          right: insets.right,
          bottom: insets.bottom,
          border: '3px dashed rgba(0,170,255,0.9)',
        }}
      />
      <div style={{...label, left: 20, top: 20}}>SAFE ZONE: {platform}</div>
      <div style={{...label, left: 20, bottom: 20}}>platform UI (caption / handle / nav)</div>
    </AbsoluteFill>
  );
};
