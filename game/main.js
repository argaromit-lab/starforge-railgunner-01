import { StarforgeWorld } from './world.js';
import { CombatGame } from './combat.js';
import { GameUI } from './ui.js';
import { PlasmaEffects } from './vfx.js';
import { ForgeAudio } from './audio.js';

const world = new StarforgeWorld();
const audio = new ForgeAudio();
const game = new CombatGame(world.pillars, audio);
const fx = new PlasmaEffects(world);
const input = { up: false, down: false, left: false, right: false, fire: false, dash: false, overload: false };
let suspended = false, lastTime = performance.now(), simAccumulator = 0;
let pointer = null;
const clearInput = () => { for (const k of Object.keys(input)) input[k] = false; };
const start = mode => { clearInput(); fx.clear(); game.start(mode); };
const title = () => { clearInput(); fx.clear(); game.reset(); game.attract(); };
const fullscreen = () => { if (document.fullscreenElement) document.exitFullscreen?.(); else document.documentElement.requestFullscreen?.().catch(() => {}); };
const ui = new GameUI({ start, title, restart: () => start(game.finalStand ? 'final' : undefined), overload: () => game.overload(), dash: () => game.dash(0, 0), pause: () => { clearInput(); game.pause(); }, resume: () => game.resume(), mute: () => { audio.unlock(); audio.mute(); }, chooseUpgrade: i => game.chooseUpgrade(i), fullscreen, motion: () => { game.reducedMotion = !game.reducedMotion; ui.announce(game.reducedMotion ? 'REDUCED EFFECTS ON' : 'FULL EFFECTS ON'); } });

const keymap = { KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right' };
addEventListener('keydown', e => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  if (keymap[e.code]) input[keymap[e.code]] = true;
  if (e.code === 'Space') { if (game.mode === 'playing') input.overload = true; else if (game.mode === 'title') start(); }
  if (e.code === 'KeyQ') input.dash = true;
  if (e.code === 'Escape' || e.code === 'KeyP') { clearInput(); if (game.mode === 'playing') game.pause(); else if (game.mode === 'paused') game.resume(); }
  if (e.code === 'Enter') { if (game.mode === 'title') start(); else if (game.mode === 'victory' || game.mode === 'defeat') start(); else if (game.mode === 'paused') game.resume(); }
  if (game.mode === 'upgrade' && ['Digit1', 'Digit2', 'Digit3'].includes(e.code)) game.chooseUpgrade(Number(e.code.slice(-1)) - 1);
  if (e.code === 'KeyM') { audio.unlock(); audio.mute(); }
  if (e.code === 'KeyF') fullscreen();
});
addEventListener('keyup', e => { if (keymap[e.code]) input[keymap[e.code]] = false; });
addEventListener('pointermove', e => { pointer = { x: e.clientX, y: e.clientY }; game.setAim(world.aim(pointer.x, pointer.y)); });
addEventListener('pointerdown', e => { if (e.target.closest('button') || game.mode !== 'playing') return; audio.unlock(); if (e.button === 0) input.fire = true; if (e.button === 2) input.overload = true; });
addEventListener('pointerup', e => { if (e.button === 0) input.fire = false; });
addEventListener('pointercancel', clearInput);
addEventListener('contextmenu', e => e.preventDefault());
addEventListener('blur', () => { clearInput(); game.pause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { clearInput(); game.pause(); } lastTime = performance.now(); });

function processEvents() {
  for (const e of game.events) {
    fx.event(e);
    if (e.type === 'float') {
      const label = ui.float(e.text, 0, 0, e.color, e.large);
      if (label) label.anchor = e;
    }
    if (e.type === 'announce') ui.announce(e.text, e.detail);
  }
  game.events.length = 0;
}
function positionLabels() {
  for (const el of ui.refs.floats.children) {
    const e = el.anchor;
    const p = world.screen(e.x, e.z, 1.7);
    el.style.left = `${(p.x / 1280 - .5) * innerWidth / ui.scale + 640}px`;
    el.style.top = `${(p.y / 800 - .5) * innerHeight / ui.scale + 400 + (e.dy || 0)}px`;
  }
}
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - lastTime) / 1000); lastTime = now;
  if (!suspended) {
    if (game.mode === 'playing' || game.mode === 'title') world.followCamera(game, dt, pointer);
    if (pointer && game.mode === 'playing') game.setAim(world.aim(pointer.x, pointer.y));
    simAccumulator += dt;
    let steps = 0;
    while (simAccumulator >= 1 / 120 && steps++ < 6) { game.update(1 / 120, input); simAccumulator -= 1 / 120; input.dash = false; input.overload = false; }
    if (steps >= 6) simAccumulator = 0;
    fx.update(dt);
  }
  ui.update(game.state()); processEvents(); positionLabels(); world.sync(game, game.time); world.render(); fx.draw(game);
  audio.update(game.mode === 'playing');
}
ui.update(game.state()); world.followCamera(game, 2); world.sync(game, 0); world.render(); fx.draw(game);
document.querySelector('#loading').remove(); requestAnimationFrame(frame);

// Reproducible QA hooks are available only on localhost with an explicit query flag.
if (new URLSearchParams(location.search).get('qa') === '1' && ['127.0.0.1', 'localhost'].includes(location.hostname)) {
  window.__STARFORGE__ = {
    game, world, ui, fx, input,
    snapshot: () => ({ ...game.state(), player: { ...game.player }, enemyCount: game.enemies.length, totalBolts: game.totalBolts, totalLinks: game.totalLinks, projectiles: game.projectiles.length, ...world.diagnostics() }),
    getPointer: () => pointer,
    freeze(value = true) { suspended = value; },
    advance(seconds, intent = {}) { Object.assign(input, intent); for (let i = 0; i < Math.ceil(seconds * 120); i++) game.update(1 / 120, input); clearInput(); world.followCamera(game, 2); ui.update(game.state()); processEvents(); positionLabels(); world.sync(game, game.time); world.render(); fx.draw(game); },
    captureState(name) {
      clearInput(); fx.clear(); suspended = true;
      if (name === 'title') { title(); game.time = 13; }
      else if (name === 'combat') {
        game.start('final'); game.events.length = 0; game.elapsed = 287; game.time = 27.2;
        game.enemies.forEach(e => { e.age = 4; });
        // A reproducible photograph of the playable Final Stand checkpoint.
        const nodes = game.enemies.slice(0, 7); nodes.forEach(e => game.link(e)); game.events.length = 0;
        const positions = [[-6, 2], [-3, -.1], [.7, 1.7], [3, 4.5], [.5, 7], [-3.4, 7.6], [-7.9, 6.4]];
        nodes.forEach((e, i) => { e.x = positions[i][0]; e.z = positions[i][1]; });
        game.player.x = -9; game.player.z = 3; game.aim = { x: 4, z: -3 };
        game.boss.x = 7; game.boss.z = -4.4; game.boss.hp = 4580;
        ui.update(game.state());
        game.overload(); processEvents(); positionLabels();
        fx.update(.14);
        for (const el of ui.refs.floats.children) { el.style.animationPlayState = 'paused'; el.style.animationDelay = '-.18s'; }
      } else if (name === 'upgrade') { game.start(); game.mode = 'upgrade'; game.wave = 3; game.sector = 1; game.mods = { voltage: 0, gravity: 0, repair: 0 }; game.events.length = 0; }
      else if (name === 'victory') { game.start('final'); game.mode = 'victory'; game.score = 281460; game.kills = 196; game.bestChain = 8; game.elapsed = 342; game.boss = null; game.events.length = 0; }
      world.followCamera(game, 2); positionLabels(); ui.update(game.state()); world.sync(game, game.time); world.render(); fx.draw(game); return this.snapshot();
    },
  };
  window.__THREE_GAME_DIAGNOSTICS__ = () => world.diagnostics();
}
