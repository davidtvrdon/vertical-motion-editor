import React from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import {theme} from './brand';
import {Captions} from './components/Captions';
import {OVERLAYS} from './components/overlays';
import {PostRoll} from './components/PostRoll';
import {SCENES} from './components/scenes';
import {FakeHead} from './Gallery';
import {LayoutProvider} from './lib/safe';
import type {Word} from './types';

/**
 * Eight frames that show a theme at a glance: scenes in each tone, two overlays with captions over a stand-in
 * "talking head", and the outro. `node scripts/preview_styles.mjs` renders one contact sheet per style preset
 * from this composition, so a style can be chosen by looking at it.
 */
export const PREVIEW_SEG = 60;
export const PREVIEW_COUNT = 8;
const FPS = 30;

const words = (from: number): Word[] => 'Your brand style in one look'.split(' ').map((w, i) => ({w, s: from + i * 0.25, e: from + i * 0.25 + 0.23}));

export const StylePreview: React.FC = () => {
  const d = PREVIEW_SEG;
  const name = theme.brand.name || 'Your Brand';
  const seg = (i: number, node: React.ReactNode) => (
    <Sequence from={i * d} durationInFrames={d} name={`preview-${i}`}>
      {node}
    </Sequence>
  );
  const scene = (n: string, props: Record<string, unknown>) => {
    const S = SCENES[n];
    return <S {...props} durationInFrames={d} />;
  };
  const overlay = (n: string, props: Record<string, unknown>) => {
    const O = OVERLAYS[n];
    return (
      <>
        <FakeHead />
        <O {...props} durationInFrames={d} />
        <Captions words={words(0)} emphasis={['brand']} />
      </>
    );
  };
  return (
    <LayoutProvider format="short">
      <AbsoluteFill style={{background: '#000'}}>
        {seg(0, scene('KineticTitle', {text: 'Make it look like you', highlight: ['you'], tone: 'primary'}))}
        {seg(1, scene('BigNumber', {value: 72, suffix: ' %', label: 'watch with sound off', tone: 'paper'}))}
        {seg(2, scene('Versus', {title: 'Before vs after', left: {label: 'Raw clip', value: 'meh'}, right: {label: 'Edited', value: 'wow'}, tone: 'secondary'}))}
        {seg(3, scene('ListScene', {title: '3 reasons', items: ['Faster', 'Cleaner', name], tone: 'dark'}))}
        {seg(4, overlay('HookTitle', {text: 'This one trick changes everything', highlight: 'trick'}))}
        {seg(5, overlay('KeywordPop', {text: name, sub: 'new episode', position: 'upper'}))}
        {seg(6, scene('QuoteCard', {quote: 'Good motion graphics make the point, not the noise.', author: name, tone: 'secondary'}))}
        {seg(7, <PostRoll durationInFrames={d} />)}
      </AbsoluteFill>
    </LayoutProvider>
  );
};

export const PREVIEW_FRAMES = PREVIEW_SEG * PREVIEW_COUNT;
export const PREVIEW_FPS = FPS;
