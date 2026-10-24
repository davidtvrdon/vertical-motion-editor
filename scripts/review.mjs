#!/usr/bin/env node
/**
 * Render review stills of a plan (without rendering the whole video) + contact sheets,
 * so Claude (or you) can check framing, safe zones and text before the final render.
 *
 *   node scripts/review.mjs <project> [--scale 0.4] [--safe] [--times 1.5,4,9.2]
 *
 * Default frames: 0.5 s, the middle of every cutaway, 0.7 s into every overlay, the end.
 * Output: projects/<p>/review/still-<time>.jpg and review/sheet-<n>.jpg (timecode burned in).
 */
import {bundle} from '@remotion/bundler';
import {openBrowser, renderStill, selectComposition} from '@remotion/renderer';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (!args[0]) {
  console.error('usage: node scripts/review.mjs <project> [--scale 0.4] [--safe] [--times a,b,c]');
  process.exit(1);
}
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? def : args[i + 1];
};
const projDir = fs.existsSync(args[0]) ? path.resolve(args[0]) : path.join(ROOT, 'projects', args[0]);
const plan = JSON.parse(fs.readFileSync(path.join(projDir, 'plan.json'), 'utf8'));
const scale = Number(opt('scale', '0.4'));
const fps = plan.fps ?? 30;

let times;
if (opt('times')) {
  times = opt('times').split(',').map(Number);
} else {
  times = [0.5, plan.duration - 0.4];
  for (const c of plan.cuts ?? []) times.push((c.start + c.end) / 2);
  for (const o of plan.overlays ?? []) times.push(Math.min(o.start + 0.7, (o.start + o.end) / 2));
}
times = [...new Set(times.filter((t) => t >= 0 && t < plan.duration).map((t) => Math.round(t * 10) / 10))].sort((a, b) => a - b);

const inputProps = {...plan, debug: {...(plan.debug ?? {}), timecode: true, safeZones: args.includes('--safe') || plan.debug?.safeZones}};

const outDir = path.join(projDir, 'review');
fs.rmSync(outDir, {recursive: true, force: true});
fs.mkdirSync(outDir, {recursive: true});

console.log(`bundling (public dir: ${projDir}) ...`);
const serveUrl = await bundle({entryPoint: path.join(ROOT, 'src/index.ts'), publicDir: projDir});
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE ?? null;
const browser = await openBrowser('chrome', {browserExecutable});
const composition = await selectComposition({serveUrl, id: 'Edit', inputProps, puppeteerInstance: browser, browserExecutable});

const files = [];
for (const t of times) {
  const frame = Math.min(composition.durationInFrames - 1, Math.round(t * fps));
  const out = path.join(outDir, `still-${t.toFixed(1).padStart(6, '0')}.jpg`);
  await renderStill({composition, serveUrl, output: out, frame, inputProps, scale, imageFormat: 'jpeg', puppeteerInstance: browser, browserExecutable});
  files.push(out);
  process.stdout.write(`  ${t.toFixed(1)}s ✓\n`);
}
await browser.close({silent: true});

// contact sheets: 6 per row for 9:16, 3 per row for 16:9, 2 rows per sheet
const cols = plan.format === 'short' ? 6 : 3;
const per = cols * 2;
for (let s = 0; s * per < files.length; s++) {
  const chunk = files.slice(s * per, (s + 1) * per);
  const listFile = path.join(outDir, `sheet-${s}.txt`);
  fs.writeFileSync(listFile, chunk.map((f) => `file '${f}'`).join('\n'));
  const rows = Math.ceil(chunk.length / cols);
  execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', listFile, '-vf', `tile=${cols}x${rows}:padding=8:color=gray`, '-frames:v', '1', path.join(outDir, `sheet-${s}.jpg`)]);
  fs.rmSync(listFile);
}
console.log(`${files.length} stills → ${outDir} (sheet-*.jpg)`);
