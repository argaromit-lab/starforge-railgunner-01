import { chromium } from 'playwright';
import { mkdir, writeFile, stat } from 'node:fs/promises';
import sharp from 'sharp';
import { pilot } from './pilot.mjs';

await mkdir('screenshots', { recursive: true });
await mkdir('artifacts/raw', { recursive: true });
const browser = await chromium.launch({ channel: 'chromium', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto('http://127.0.0.1:5197/?qa=1');
await page.waitForFunction(() => window.__STARFORGE__);
const images = [];
for (const [state, filename] of [['combat', '01-combat.png'], ['title', '02-title.png'], ['upgrade', '03-upgrade.png'], ['victory', '04-gameover.png']]) {
  let snapshot;
  if (state === 'upgrade' || state === 'victory') {
    if (state === 'upgrade') {
      await page.locator('#start').click();
      await page.evaluate(() => window.__STARFORGE__.freeze());
    }
    const run = await page.evaluate(pilot, { stopAtWorkshop: state === 'upgrade' });
    if (run.mode !== state) throw new Error(`Campaign capture expected ${state}, reached ${run.mode}`);
    await page.evaluate(() => { const a=window.__STARFORGE__; a.world.followCamera(a.game,2,a.getPointer()); a.ui.update(a.game.state()); a.world.sync(a.game,a.game.time); a.world.render(); a.fx.draw(a.game); });
    snapshot = await page.evaluate(() => { const a = window.__STARFORGE__; a.advance(0); return a.snapshot(); });
  } else snapshot = await page.evaluate(s => window.__STARFORGE__.captureState(s), state);
  // Capture immediately to retain the live overload event and floating damage numerals.
  const bytes = await page.screenshot({ type: 'png' });
  await writeFile(`artifacts/raw/${filename}`, bytes);
  let encoded, colors = 256;
  for (const count of [256, 224, 192, 160, 128, 96]) {
    encoded = await sharp(bytes).png({ palette: true, colours: count, compressionLevel: 9, effort: 10, dither: .25 }).toBuffer();
    colors = count;
    if (encoded.length < 182000) break;
  }
  if (encoded.length >= 262144) throw new Error(`${filename} exceeds screenshot cap`);
  await writeFile(`screenshots/${filename}`, encoded);
  images.push({ state, path: `screenshots/${filename}`, bytes: encoded.length, colors, width: 1280, height: 800, snapshot });
  console.log(filename, encoded.length, 'bytes', colors, 'colors');
}
if (errors.length) throw new Error(errors.join('\n'));
await writeFile('artifacts/capture-manifest.json', JSON.stringify({ capturedAt: new Date().toISOString(), viewport: { width: 1280, height: 800 }, method: 'Native Chromium page screenshots, PNG palette compression only. Combat is a posed Final Stand checkpoint; title is the game attract screen. Workshop and victory come from an input-driven campaign.', images, errors }, null, 2));
await browser.close();
