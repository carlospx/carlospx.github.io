#!/usr/bin/env node
/**
 * Renders scripts/og.html to pfl/og.png at exactly 1200x630.
 *
 * Run it after editing scripts/og.html, or after changing which
 * illustrations appear on the card:
 *
 *   node scripts/og.mjs
 *
 * Playwright is used rather than `chrome --screenshot` because Chrome's
 * headless CLI screenshot in this environment renders a viewport ~90px
 * shorter than --window-size claims, silently clipping the bottom of the
 * card. Playwright sets the viewport over CDP and gets it right.
 *
 * Playwright is not a dependency of this repo — it is picked up from the
 * global install if present. Nothing else in the build needs it, so a
 * machine without it can still run scripts/build.mjs.
 */

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    const globalRoot = execSync('npm root -g', { encoding: 'utf8' }).trim();
    const entry = join(globalRoot, 'playwright', 'index.js');
    if (!existsSync(entry)) {
      throw new Error('playwright not found locally or globally — `npm i -g playwright`');
    }
    return import(pathToFileURL(entry).href);
  }
}

// Loaded from outside the package graph it arrives as CJS, so the named
// exports sit on `default`.
const pw = await loadPlaywright();
const chromium = pw.chromium || pw.default?.chromium;

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'scripts', 'og.html');
const target = join(root, 'pfl', 'og.png');

const WIDTH = 1200;
const HEIGHT = 630;

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--disable-gpu'],
});

const page = await browser.newPage({
  viewport: { width: WIDTH, height: HEIGHT },
  deviceScaleFactor: 1,
});

await page.goto(pathToFileURL(source).href, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);

await page.screenshot({
  path: target,
  clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT },
});

await browser.close();
console.log(`og.png         ${WIDTH}x${HEIGHT}`);
