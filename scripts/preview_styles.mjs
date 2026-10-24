#!/usr/bin/env node
/**
 * Render a contact sheet per style preset, so a style can be chosen by looking at it.
 *
 *   node scripts/preview_styles.mjs [preset ...]      # default: all presets
 *
 * Writes out/style-previews/<preset>.jpg (8 frames: scenes in each tone, two overlays with captions, the outro).
 * It applies each preset in turn (scripts/apply_brand.py --preset), uses your brand/brand.json for colours, logo and font
 * overrides when present, and finally restores the preset you had before.
 */
import {bundle} from '@remotion/bundler';
import {openBrowser, renderStill, selectComposition} from '@remotion/renderer';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const presets = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/theme/presets.json'), 'utf8'));
const wanted = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(presets.presets);
const activePath = path.join(ROOT, 'src/theme/active.json');
const before = JSON.parse(fs.readFileSync(activePath, 'utf8')).preset;
const python = fs.existsSync(path.join(ROOT, '.venv/bin/python')) ? path.join(ROOT, '.venv/bin/python') : 'python3';
const outDir = path.join(ROOT, 'out/style-previews');
fs.mkdirSync(outDir, {recursive: true});

const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE ?? null;
const browser = await openBrowser('chrome', {browserExecutable});
const SEG = 60;
try {
  for (const name of wanted) {
    if (!presets.presets[name]) throw new Error(`unknown preset ${name}`);
    execFileSync(python, [path.join(ROOT, 'scripts/apply_brand.py'), '--preset', name, '--no-remember'], {stdio: 'pipe'});
    console.log(`${name}: bundling …`);
    const serveUrl = await bundle({entryPoint: path.join(ROOT, 'src/index.ts'), publicDir: path.join(ROOT, 'public')});
    const composition = await selectComposition({serveUrl, id: 'StylePreview', puppeteerInstance: browser, browserExecutable});
    const files = [];
    for (let i = 0; i < 8; i++) {
      const out = path.join(outDir, `${name}-${i}.jpg`);
      await renderStill({composition, serveUrl, output: out, frame: i * SEG + 38, scale: 0.4, imageFormat: 'jpeg', jpegQuality: 88, puppeteerInstance: browser, browserExecutable});
      files.push(out);
    }
    const list = path.join(outDir, `${name}.txt`);
    fs.writeFileSync(list, files.map((f) => `file '${f}'`).join('\n'));
    execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-vf', 'tile=4x2:padding=10:color=0x222222', '-frames:v', '1', path.join(outDir, `${name}.jpg`)]);
    files.forEach((f) => fs.rmSync(f));
    fs.rmSync(list);
    console.log(`  → out/style-previews/${name}.jpg`);
  }
} finally {
  await browser.close({silent: true});
  execFileSync(python, [path.join(ROOT, 'scripts/apply_brand.py'), '--preset', before, '--no-remember'], {stdio: 'pipe'});
}
