import React from 'react';
import {CalculateMetadataFunction, Composition, staticFile} from 'remotion';
import {Edit} from './Edit';
import {Gallery, GALLERY_SECONDS} from './Gallery';
import {PostRoll, postRollSeconds} from './components/PostRoll';
import {theme} from './theme';
import {PREVIEW_FRAMES, StylePreview} from './StylePreview';
import type {EditPlan, Word} from './types';

/** Standalone preview of the outro: `npm run studio` → PostRoll. Brand settings: brand/brand.json → outro. */
const OUTRO_FRAMES = Math.round(theme.outro.duration * 30);
const PostRollPreview: React.FC = () => <PostRoll durationInFrames={OUTRO_FRAMES} />;

const SIZE = {short: {width: 1080, height: 1920}, long: {width: 1920, height: 1080}} as const;

const defaultPlan: EditPlan = {
  format: 'short',
  platform: 'all',
  duration: 5,
  source: {src: 'source.mp4'},
  captions: {enabled: false},
};

/** Size + length come from the plan; captions are loaded from captions.file when given. */
const calculateMetadata: CalculateMetadataFunction<EditPlan> = async ({props}) => {
  const fps = props.fps ?? 30;
  let words: Word[] | undefined = props.captions?.words;
  if (props.captions?.enabled && !words?.length && props.captions.file) {
    const res = await fetch(staticFile(props.captions.file));
    const json = await res.json();
    const start = props.source.start ?? 0;
    // transcript times are source-relative; shift to the output timeline
    words = (json.words as Word[])
      .map((w) => ({...w, s: w.s - start, e: w.e - start}))
      .filter((w) => w.e > 0 && w.s < props.duration);
  }
  return {
    fps,
    ...SIZE[props.format],
    // the post-roll (if any) is appended after the edit
    durationInFrames: Math.max(1, Math.round(props.duration * fps) + Math.round(postRollSeconds(props.postRoll) * fps)),
    props: {...props, captions: props.captions ? {...props.captions, words} : undefined},
  };
};

export const Root: React.FC = () => (
  <>
    <Composition
      id="Edit"
      component={Edit}
      defaultProps={defaultPlan}
      calculateMetadata={calculateMetadata}
      width={1080}
      height={1920}
      fps={30}
      durationInFrames={150}
    />
    <Composition id="PostRoll" component={PostRollPreview} width={1080} height={1920} fps={30} durationInFrames={OUTRO_FRAMES} />
    <Composition id="StylePreview" component={StylePreview} width={1080} height={1920} fps={30} durationInFrames={PREVIEW_FRAMES} />
    <Composition id="GalleryShort" component={Gallery} defaultProps={{format: 'short' as const}} width={1080} height={1920} fps={30} durationInFrames={GALLERY_SECONDS * 30} />
    <Composition id="GalleryLong" component={Gallery} defaultProps={{format: 'long' as const}} width={1920} height={1080} fps={30} durationInFrames={GALLERY_SECONDS * 30} />
  </>
);
