import React from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import {colors, fonts} from './brand';
import {Captions} from './components/Captions';
import {OVERLAYS} from './components/overlays';
import {SafeZoneGuide} from './components/SafeZoneGuide';
import {SCENES} from './components/scenes';
import {BackdropContext} from './components/scenes/common';
import {LayoutProvider} from './lib/safe';
import type {Backdrop, Format, Word} from './types';

/**
 * Component catalog: every scene and overlay with sample props, so the look can be
 * reviewed in Remotion Studio without footage (compositions GalleryShort / GalleryLong).
 */
const IMG = 'brand/sample-product.svg';
const SEG = 3;

const SCENE_SAMPLES: [string, Record<string, unknown>][] = [
  ['LogoSting', {}],
  ['ChatMock', {title: 'AI assistant', messages: [{from: 'user', text: 'Write me a punchy opinion on 50 years of Apple.'}, {from: 'ai', text: 'Apple was founded in 1976…'}]}],
  ['FlowDiagram', {nodes: ['Human', 'AI', 'AI'], labels: ['needs', 'to understand']}],
  ['BigQuestion', {text: 'Is this what we want?'}],
  ['BigNumber', {value: 400, suffix: '×', label: 'cheaper than before'}],
  ['KineticTitle', {text: 'AI now builds the next AI', highlight: ['AI']}],
  ['Versus', {title: 'Who wins?', left: {label: 'Laptop A', value: '$699'}, right: {label: 'Laptop B', value: '$1,199'}}],
  ['BarChart', {title: 'Listeners (k)', bars: [{label: 'Jan', value: 12}, {label: 'Feb', value: 18}, {label: 'Mar', value: 31}], highlight: 2}],
  ['ListScene', {title: '3 things', items: ['Faster chip', 'Better display', 'Lower price']}],
  ['ProductShowcase', {image: IMG, name: 'Product name', detail: 'ad-free', price: '$4/mo'}],
  ['QuoteCard', {quote: 'AI will not replace creators. It will replace the ones who do not use it.', author: 'Someone Wise'}],
  ['ChapterCard', {number: 2, title: 'The big dispute'}],
  // schematics: build-ups that show how something works
  ['DecisionCard', {input: 'Where is my order?!', inputLabel: 'Email from a customer', checks: [{q: 'Angry?', a: 'YES', hot: true}, {q: 'History?', a: '2 complaints'}, {q: 'Value?', a: 'VIP', hot: true}], timer: '0.4 s'}],
  ['SortingPipeline', {box: 'AI', bins: ['Urgent', 'VIP', 'Normal'], items: 7}],
  ['Blockers', {title: 'Why companies hesitated', blockers: ['Vagueness', 'Hallucinations'], result: 'Adoption'}],
  ['GrowthCurve', {title: 'Exponential growth', label: 'every 7–9 days'}],
  ['IntervalTimeline', {title: 'New models', gaps: ['years', 'months', 'weeks', 'days']}],
  ['ReleaseRace', {interval: '7–9 days'}],
  ['Outgrow', {label: 'AI', human: 'us'}],
  ['PredictionCard', {title: 'My predictions', items: [{text: 'The old ones come true', done: true}, {text: 'An AI incident?'}]}],
  ['Trajectory', {from: 'Today', to: 'Disaster?'}],
  ['Gauge', {label: 'Slow it down?', tone: 'secondary'}],
  // story scenes: who wins, who lags, who overtakes
  ['Crowd', {fromLabel: 'A chosen few', toLabel: 'Everyone'}],
  ['Verdict', {kind: 'winner', name: 'Acme', reasons: ['Great launch', 'Open ecosystem']}],
  ['RankSwap', {title: 'App downloads', items: ['Leader', 'Challenger'], challenger: 1}],
  ['Hub', {center: 'Platform', satellites: ['Apps', 'Developers', 'Companies', 'Services'], caption: 'Open to third parties'}],
  ['LaggardRace', {leaders: ['Alpha', 'Beta', 'Gamma'], laggard: 'Delta', label: 'Crawling'}],
  // world scenes: familiar objects and places
  ['PhoneNotification', {notifications: [{app: 'Store', title: 'The new phone is here', text: 'Pre-orders from Friday'}, {app: 'Podcasts', title: 'New episode', text: 'The monthly AI recap'}]}],
  ['EventTimeline', {title: 'The road to the chatbot', events: [{date: '2017', label: 'Transformer'}, {date: '2020', label: 'GPT-3'}, {date: '2022', label: 'ChatGPT'}]}],
  ['MoneyFlow', {from: 'Company A', to: 'Company B', amount: 13, suffix: ' bn $', coin: '$', label: 'investment'}],
  ['Balance', {title: 'Worth it?', left: {label: 'Against', items: ['Price']}, right: {label: 'For', items: ['Speed', 'Battery']}, heavier: 'right'}],
  ['SearchBar', {engine: 'Search', query: 'best AI model 2026', results: ['Model comparison', 'Review: the new one']}],
  ['PriceTag', {product: 'Pro plan', oldPrice: '$200', newPrice: '$100', note: 'per month', tone: 'primary'}],
  ['CalendarDate', {day: 26, month: 'September', label: 'Launch day'}],
  ['WorldMap', {title: 'Where AI is built', pins: [{label: 'USA', place: 'usa'}, {label: 'Europe', place: 'europe'}, {label: 'China', place: 'china'}], connect: true}],
  ['LayerStack', {title: 'How it works', layers: ['Chip', 'Model', 'App']}],
  ['BeforeAfter', {before: {title: '8 hours', lines: ['manual work']}, after: {title: '8 minutes', lines: ['with an AI agent']}}],
  ['Newspaper', {paper: 'THE DAILY', date: 'Friday, Sept 25, 2026', headline: 'Chipmaker buys model hub', sub: 'The biggest AI deal yet', stamp: 'Official'}],
  ['Battery', {from: 100, to: 12, label: 'after 6 hours'}],
  ['Terminal', {title: 'assistant', lines: [{t: 'cmd', text: 'assistant "fix the login bug"'}, {t: 'out', text: '✓ Bug found in auth.ts'}, {t: 'out', text: '✓ Tests passed (42/42)'}]}],
  ['Acquisition', {buyer: 'Buyer Inc.', target: 'Target Labs', price: 'for $? bn'}],
  ['LockedGrid', {open: ['Recipes', 'Calls', 'Music', 'Podcasts'], locked: 5, stamp: 'Not open yet', tone: 'dark'}],
  ['SignalBars', {label: 'Wi-Fi', verdict: 'problem', tone: 'paper'}],
  ['PortPlug', {device: 'Streaming box', ports: [{label: 'HDMI', ok: true}, {label: 'LAN', ok: true}], plug: 'LAN', tone: 'secondary'}],
  ['Thermometer', {label: 'Stick temperature', verdict: 'overheated', tone: 'paper'}],
  ['LookAlike', {tags: ['3 columns', 'round corners', 'soft shadows'], stamp: 'same site', tone: 'secondary'}],
  ['PhotoStack', {photos: [{src: IMG, label: 'first'}, {src: IMG, label: 'second'}], title: 'The lineup', tone: 'paper'}],
  ['Callouts', {src: IMG, callouts: [{x: 0.3, y: 0.35, label: 'camera'}, {x: 0.7, y: 0.6, label: 'port'}], tone: 'secondary'}],
  ['ZoomLens', {src: IMG, focus: {x: 0.5, y: 0.5}, label: 'detail', tone: 'paper'}],
  ['Lineup', {photos: [{src: IMG, label: 'A'}, {src: IMG, label: 'B'}, {src: IMG, label: 'C'}], tone: 'dark'}],
  ['SocialPost', {name: 'Jane Founder', handle: '@jane', text: 'This is the best model we have ever shipped.', likes: 48200, reposts: 6100}],
];

const OVERLAY_SAMPLES: [string, Record<string, unknown>][] = [
  ['HookTitle', {text: 'This changes your phone', highlight: 'phone'}],
  ['KeywordPop', {text: 'Claude Code', sub: '1st birthday'}],
  ['StatBadge', {value: 2.4, decimals: 1, suffix: ' M $', label: 'per year on ads'}],
  ['ProductCard', {image: IMG, name: 'Product name', detail: 'from $699'}],
  ['LowerThird', {name: 'Jane Founder', title: 'CEO, Acme'}],
  ['ListOverlay', {title: 'Why?', items: ['price', 'battery', 'chip']}],
  ['Sticker', {text: '🤯'}],
  ['CTA', {text: 'Watch the full video', sub: 'link in bio'}],
];

/** Each backdrop shown behind a real scene, in the tone it suits best (any tone works). */
const BACKDROP_SAMPLES: [Backdrop, string, Record<string, unknown>][] = [
  ['classic', 'BigNumber', {value: 72, suffix: ' %', label: 'signature background', tone: 'paper'}],
  ['circuit', 'LayerStack', {title: 'How it works', layers: ['Chip', 'Model', 'App'], tone: 'secondary'}],
  ['grid', 'LayerStack', {title: 'How it works', layers: ['Chip', 'Model', 'App'], tone: 'secondary'}],
  ['dots', 'BigNumber', {value: 48, suffix: ' %', label: 'of companies already use AI', tone: 'paper'}],
  ['rays', 'Verdict', {kind: 'winner', name: 'Acme', reasons: ['Great launch'], tone: 'primary'}],
  ['rings', 'PhoneNotification', {notifications: [{app: 'Podcasts', title: 'New episode', text: 'The monthly AI recap'}], tone: 'dark'}],
  ['collage', 'KineticTitle', {text: 'AI is changing media', highlight: ['media'], tone: 'paper'}],
  ['shapes', 'BigQuestion', {text: 'Is it worth it?', tone: 'secondary'}],
  ['split', 'Versus', {left: {label: 'Text', value: '2022'}, right: {label: 'Video', value: 'now'}, tone: 'paper'}],
  ['tape', 'Newspaper', {headline: 'The new episode is out', paper: 'THE DAILY', stamp: 'New'}],
];

export const GALLERY_SECONDS = (SCENE_SAMPLES.length + OVERLAY_SAMPLES.length + BACKDROP_SAMPLES.length) * SEG;

export const FakeHead: React.FC = () => (
  <AbsoluteFill style={{background: 'linear-gradient(180deg, #5b6470 0%, #2b3036 100%)'}}>
    <div style={{position: 'absolute', left: '50%', top: '28%', width: 360, height: 440, borderRadius: '50%', background: '#c9a38d', transform: 'translateX(-50%)'}} />
    <div style={{position: 'absolute', left: '50%', top: '52%', width: 820, height: 900, borderRadius: '45% 45% 0 0', background: '#1d2a3a', transform: 'translateX(-50%)'}} />
  </AbsoluteFill>
);

const Label: React.FC<{text: string}> = ({text}) => (
  <div style={{position: 'absolute', left: 16, top: 16, padding: '6px 12px', background: 'rgba(0,0,0,0.6)', color: colors.white, fontFamily: fonts.body, fontSize: 24}}>{text}</div>
);

const demoWords = (from: number): Word[] =>
  'This is a preview of the captions for short videos'.split(' ').map((w, i) => ({w, s: from + i * 0.3, e: from + i * 0.3 + 0.28}));

export const Gallery: React.FC<{format: Format}> = ({format}) => {
  const fps = 30;
  return (
    <LayoutProvider format={format}>
      <AbsoluteFill style={{background: '#000'}}>
        {SCENE_SAMPLES.map(([name, props], i) => {
          const Scene = SCENES[name];
          return (
            <Sequence key={name} from={i * SEG * fps} durationInFrames={SEG * fps} name={`scene:${name}`}>
              <Scene {...props} durationInFrames={SEG * fps} />
              <Label text={`scene: ${name}`} />
            </Sequence>
          );
        })}
        {OVERLAY_SAMPLES.map(([name, props], i) => {
          const Comp = OVERLAYS[name];
          const from = (SCENE_SAMPLES.length + i) * SEG;
          return (
            <Sequence key={name} from={from * fps} durationInFrames={SEG * fps} name={`overlay:${name}`}>
              <FakeHead />
              <Comp {...props} durationInFrames={SEG * fps} />
              <Captions words={demoWords(0)} emphasis={['captions']} />
              <SafeZoneGuide />
              <Label text={`overlay: ${name}`} />
            </Sequence>
          );
        })}
        {BACKDROP_SAMPLES.map(([bg, name, props], i) => {
          const Scene = SCENES[name];
          const from = (SCENE_SAMPLES.length + OVERLAY_SAMPLES.length + i) * SEG;
          return (
            <Sequence key={`bg-${bg}`} from={from * fps} durationInFrames={SEG * fps} name={`bg:${bg}`}>
              <BackdropContext.Provider value={bg}>
                <Scene {...props} durationInFrames={SEG * fps} />
              </BackdropContext.Provider>
              <Label text={`bg: ${bg} (${name})`} />
            </Sequence>
          );
        })}
      </AbsoluteFill>
    </LayoutProvider>
  );
};
