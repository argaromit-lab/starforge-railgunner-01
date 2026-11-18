import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import sharp from 'sharp';

await mkdir('artifacts', { recursive: true });
const browser = await chromium.launch({ channel: 'chromium', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [], requests = [];
page.on('pageerror', e => errors.push(e.message));
page.on('requestfailed', r => errors.push(`${r.url()} ${r.failure()?.errorText}`));
page.on('request', r => requests.push(r.url()));
const report = { assertions: [], realInput: {}, simulation: {}, layouts: {}, errors };
function check(test, message) { report.assertions.push({ message, pass: !!test }); if (!test) console.log('FAIL', message); }
await page.goto('http://127.0.0.1:5197/?qa=1');
await page.waitForFunction(() => window.__STARFORGE__);
await page.locator('#start').click();
await page.waitForTimeout(300);
const before = await page.evaluate(() => window.__STARFORGE__.snapshot());
await page.keyboard.down('KeyD'); await page.waitForTimeout(600); await page.keyboard.up('KeyD');
const moved = await page.evaluate(() => window.__STARFORGE__.snapshot());
check(moved.player.x > before.player.x + .2, 'WASD moves ranger through browser keyboard input');
await page.keyboard.press('KeyQ'); await page.waitForTimeout(120);
const dashed = await page.evaluate(() => window.__STARFORGE__.snapshot());
check(dashed.player.dashCooldown > 0, 'Q triggers dash cooldown');
await page.keyboard.press('Escape'); await page.waitForTimeout(100);
check(await page.locator('#resume').isVisible(), 'Escape shows pause with resume action');
await page.locator('#resume').click();
// Aim at a real enemy using the same world-to-screen projection used by effects.
const target = await page.evaluate(() => { const a = window.__STARFORGE__; const p = a.game.player; const e = a.game.enemies.reduce((best, e) => !best || Math.hypot(e.x-p.x,e.z-p.z)<Math.hypot(best.x-p.x,best.z-p.z)?e:best,null); return a.world.screen(e.x, e.z, 1); });
await page.mouse.move(target.x, target.y); await page.mouse.down(); await page.waitForTimeout(1200); await page.mouse.up();
const fired = await page.evaluate(() => window.__STARFORGE__.snapshot());
check(fired.totalBolts > 0, 'LMB emits actual magnetic projectiles');
// Deterministic full-loop bot uses input intents, never edits enemy health or wave completion.
await page.evaluate(() => { const a = window.__STARFORGE__; a.freeze(); a.game.start(); a.game.events.length = 0; });
const fullRun = await page.evaluate(() => {
  const a = window.__STARFORGE__, g = a.game;
  const seen = new Set([1]); let frames = 0, damage = 0, upgrades = 0, distance = 0, old = { ...g.player }, firstScore = -1;
  let lastArmor = 150;
  for (let i = 0; i < 120 * 600; i++) {
    if (g.mode === 'upgrade') { g.chooseUpgrade(upgrades % 2 === 0 ? 0 : 2); upgrades++; }
    if (g.mode !== 'playing') break;
    const target = g.boss && (g.chains.length >= 3 || g.enemies.length < 9) ? g.boss : g.enemies.reduce((best, e) => !best || Math.hypot(e.x - g.player.x, e.z - g.player.z) < Math.hypot(best.x - g.player.x, best.z - g.player.z) ? e : best, null) || g.boss;
    if (target) g.setAim({ x: target.x, z: target.z });
    const angle = g.elapsed * .31, desired = { x: Math.cos(angle) * 12.6, z: Math.sin(angle) * 8.1 };
    const dx = desired.x - g.player.x, dz = desired.z - g.player.z;
    const near = g.enemies.filter(e => Math.hypot(e.x - g.player.x, e.z - g.player.z) < 3).length;
    const intent = { right: dx > .3, left: dx < -.3, down: dz > .3, up: dz < -.3, fire: true, overload: g.chains.length >= (g.boss && g.enemies.length < 3 ? 1 : 5) || (g.chains.length > 0 && g.elapsed % 3 < .01), dash: near >= 3 || !!g.boss?.laser };
    g.update(1 / 120, intent); g.events.length = 0;
    frames++; seen.add(g.wave); if (g.score && firstScore < 0) firstScore = g.elapsed;
    distance += Math.hypot(g.player.x - old.x, g.player.z - old.z); old = { ...g.player };
    if (g.player.armor < lastArmor) damage += lastArmor - g.player.armor; lastArmor = g.player.armor;
  }
  return { frames, waves: [...seen], upgrades, distance, damage, firstScore, ...g.state() };
});
report.simulation = fullRun;
check(fullRun.score > 0 && fullRun.kills >= 10, 'Input-intent bot earns score and clears multiple enemies');
check(fullRun.mode === 'victory' && fullRun.wave === 8 && fullRun.upgrades === 2, 'Input-intent pilot drafts twice and defeats Vulcan-IX without health edits');
console.log('FULL RUN', fullRun);
// Reckless run proves loss and retry without forced health values.
const reckless = await page.evaluate(() => {
  const a = window.__STARFORGE__; a.game.start();
  for (let i = 0; i < 120 * 120 && a.game.mode === 'playing'; i++) { a.game.update(1 / 120, {}); a.game.events.length = 0; }
  a.ui.update(a.game.state()); return a.game.state();
});
check(reckless.mode === 'defeat', 'Standing still naturally loses armor and reaches defeat');
await page.locator('#restart').click();
check((await page.evaluate(() => window.__STARFORGE__.snapshot())).armor === 150, 'Restart restores full armor and starts a fresh run');
const layoutStates = ['title', 'combat', 'upgrade', 'victory'];
for (const state of layoutStates) {
  await page.evaluate(name => window.__STARFORGE__.captureState(name), state);
  report.layouts[state] = await page.evaluate(() => {
    const visible = el => { const r = el.getBoundingClientRect(); return r.width && r.height && getComputedStyle(el).visibility !== 'hidden'; };
    const all = [...document.querySelectorAll('#ui *')].filter(visible);
    const overflow = all.filter(el => { const r = el.getBoundingClientRect(); return r.left < -1 || r.top < -1 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1; }).map(el => ({ cls: el.className, text: el.textContent?.slice(0, 70) }));
    const text = all.filter(el => [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()));
    const clipped = text.filter(el => el.scrollWidth > el.clientWidth + 3 && !el.matches('span,small,b,strong,label,kbd,p,h1,h2,button,time')).map(el => ({ cls: el.className, text: el.textContent.slice(0, 60) }));
    const overlaps = [];
    const leaves = text.map(el => { const range = document.createRange(); range.selectNodeContents(el); return { el, r: range.getBoundingClientRect(), text: el.textContent.slice(0, 60) }; }).filter(e => e.r.width && e.r.height);
    for (let i = 0; i < leaves.length; i++) for (let j = i + 1; j < leaves.length; j++) { const a = leaves[i], b = leaves[j]; if (a.el.contains(b.el) || b.el.contains(a.el) || a.el.closest('#floats') || b.el.closest('#floats')) continue; const area = Math.max(0, Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left)) * Math.max(0, Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top)); if (area > 8) overlaps.push([a.text, b.text, Math.round(area)]); }
    return { overflow, clipped, overlaps, hudVisible: !!document.querySelector('#hud:not(.hidden)'), floatCount: document.querySelector('#floats').children.length };
  });
  check(report.layouts[state].overflow.length === 0, `${state}: all visible UI stays inside viewport`);
  check(report.layouts[state].overlaps.length === 0, `${state}: no intersecting independent text bounds`);
  if (state !== 'combat') check(!report.layouts[state].hudVisible && report.layouts[state].floatCount === 0, `${state}: combat HUD and damage labels are hidden`);
}
await page.evaluate(() => window.__STARFORGE__.captureState('combat'));
report.render = await page.evaluate(() => { const w = window.__STARFORGE__.world, gl = w.renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info'); return { ...w.diagnostics(), gpu: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) }; });
const image = await page.screenshot();
const { data, info } = await sharp(image).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const bins = new Map(); let sum = 0, sum2 = 0, edges = 0;
for (let i = 0; i < data.length; i += info.channels) { const r = data[i], g = data[i + 1], b = data[i + 2], lum = .2126 * r + .7152 * g + .0722 * b; sum += lum; sum2 += lum * lum; const key = (r >> 5) * 64 + (g >> 5) * 8 + (b >> 5); bins.set(key, (bins.get(key) || 0) + 1); if (i >= info.channels && Math.abs(lum - (.2126 * data[i - info.channels] + .7152 * data[i - info.channels + 1] + .0722 * data[i - info.channels + 2])) > 25) edges++; }
const n = info.width * info.height;
let entropy = 0; for (const count of bins.values()) { const p = count / n; entropy -= p * Math.log2(p); }
report.pixels = { colorEntropyBits: entropy, dominantColorShare: Math.max(...bins.values()) / n, luminanceMean: sum / n, contrast: Math.sqrt(sum2 / n - (sum / n) ** 2), edgeDensity: edges / n };
report.realInput = { before, moved, dashed, fired };
check(errors.length === 0, 'No page, shader, or failed-request errors');
check(requests.every(url => url.startsWith('http://127.0.0.1:5197/') || url.startsWith('data:')), 'All game requests remain on the local static origin');
await writeFile('artifacts/qa-report.json', JSON.stringify(report, null, 2));
console.log('LAYOUT', report.layouts); console.log('RENDER', report.render); console.log('PIXELS', report.pixels);
await browser.close();
assert.equal(report.assertions.filter(a => !a.pass).length, 0, 'QA assertions failed; see artifacts/qa-report.json');
