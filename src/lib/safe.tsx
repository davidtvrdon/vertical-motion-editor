import React, {createContext, useContext} from 'react';
import {useVideoConfig} from 'remotion';
import type {Format, Platform} from '../types';

export type Insets = {top: number; bottom: number; left: number; right: number};

/**
 * Areas covered by platform UI on a 1080x1920 frame (px). Deliberately conservative
 * approximations; platforms move their UI, so re-check with `debug.safeZones: true`.
 * top: status bar / tabs / search. bottom: caption, handle, music ticker, nav bar.
 * right: like / comment / share / remix rail.
 */
export const SHORT_SAFE: Record<Exclude<Platform, 'youtube'>, Insets> = {
  tiktok: {top: 160, bottom: 480, left: 60, right: 150},
  reels: {top: 220, bottom: 420, left: 60, right: 140},
  shorts: {top: 180, bottom: 400, left: 60, right: 150},
  // union of all three -> safe everywhere
  all: {top: 220, bottom: 480, left: 60, right: 150},
};

/** 16:9 long form: classic 5% title-safe margin. */
export const LONG_SAFE: Insets = {top: 60, bottom: 70, left: 96, right: 96};

export const insetsFor = (format: Format, platform: Platform = 'all'): Insets => {
  if (format === 'long' || platform === 'youtube') return LONG_SAFE;
  return SHORT_SAFE[platform] ?? SHORT_SAFE.all;
};

type Layout = {format: Format; platform: Platform; insets: Insets; uScale?: number};
const LayoutContext = createContext<Layout>({format: 'short', platform: 'all', insets: SHORT_SAFE.all});

export const LayoutProvider: React.FC<{format: Format; platform?: Platform; children: React.ReactNode}> = ({
  format,
  platform = 'all',
  children,
}) => (
  <LayoutContext.Provider value={{format, platform, insets: insetsFor(format, platform)}}>{children}</LayoutContext.Provider>
);

/**
 * Narrow the safe area for a subtree (e.g. keep scenes clear of the caption band, or fit an
 * overlay into one half of a split-screen). Insets are absolute px from each frame edge;
 * pass only the sides to change. `uScale` shrinks everything sized in `u`.
 */
export const InsetOverride: React.FC<{insets?: Partial<Insets>; uScale?: number; children: React.ReactNode}> = ({insets, uScale, children}) => {
  const layout = useContext(LayoutContext);
  return (
    <LayoutContext.Provider value={{...layout, insets: {...layout.insets, ...(insets ?? {})}, uScale: (layout.uScale ?? 1) * (uScale ?? 1)}}>
      {children}
    </LayoutContext.Provider>
  );
};

/** The current safe-area insets (px from each frame edge). */
export const useInsets = () => useContext(LayoutContext).insets;

/**
 * Safe rectangle in px plus a scale unit `u` (1 at 1080 short side),
 * so components can be designed once for both 9:16 and 16:9.
 */
export const useSafe = () => {
  const {width, height} = useVideoConfig();
  const layout = useContext(LayoutContext);
  const {insets} = layout;
  return {
    ...layout,
    width,
    height,
    u: (Math.min(width, height) / 1080) * (layout.uScale ?? 1),
    isShort: layout.format === 'short',
    x: insets.left,
    y: insets.top,
    w: width - insets.left - insets.right,
    h: height - insets.top - insets.bottom,
    /** vertical anchor helpers inside the safe area */
    anchorY: (pos: 'top' | 'upper' | 'center' | 'lower' | 'bottom' | 'seam') => {
      // 'seam' = just above the middle of the frame; components shift up by their own height
      // so the box's bottom edge sits on the split-screen seam (captions go right below it).
      if (pos === 'seam') return height / 2 - 14 * (Math.min(width, height) / 1080);
      const h = height - insets.top - insets.bottom;
      return insets.top + h * {top: 0.02, upper: 0.22, center: 0.5, lower: 0.72, bottom: 0.98}[pos];
    },
  };
};
