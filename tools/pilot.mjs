// Runs in Chromium via page.evaluate. Only aim, movement, weapon and draft intents drive the run.
export function pilot({ stopAtWorkshop = false } = {}) {
  const a = window.__STARFORGE__, g = a.game;
  const seen = new Set([g.wave]); let frames = 0, damage = 0, upgrades = 0, distance = 0, old = { ...g.player }, firstScore = -1;
  let lastArmor = g.player.armor;
  for (let i = 0; i < 120 * 600; i++) {
    if (g.mode === 'upgrade') {
      if (stopAtWorkshop) break;
      g.chooseUpgrade(g.wave === 3 ? 0 : 2); upgrades++;
    }
    if (g.mode !== 'playing') break;
    const closest = g.enemies.reduce((best, e) => !best || Math.hypot(e.x - g.player.x, e.z - g.player.z) < Math.hypot(best.x - g.player.x, best.z - g.player.z) ? e : best, null);
    const target = g.boss && (g.chains.length >= 3 || g.enemies.length < 9) ? g.boss : closest || g.boss;
    if (target) g.setAim({ x: target.x, z: target.z });
    const angle = g.elapsed * .31, dx = Math.cos(angle) * 12.6 - g.player.x, dz = Math.sin(angle) * 8.1 - g.player.z;
    const near = g.enemies.filter(e => Math.hypot(e.x - g.player.x, e.z - g.player.z) < 3).length;
    g.update(1 / 120, { right: dx > .3, left: dx < -.3, down: dz > .3, up: dz < -.3, fire: true,
      overload: g.chains.length >= (g.boss && g.enemies.length < 3 ? 1 : 5) || (g.chains.length > 0 && g.elapsed % 3 < .01), dash: near >= 3 || !!g.boss?.laser });
    g.events.length = 0;
    frames++; seen.add(g.wave); if (g.score && firstScore < 0) firstScore = g.elapsed;
    distance += Math.hypot(g.player.x - old.x, g.player.z - old.z); old = { ...g.player };
    if (g.player.armor < lastArmor) damage += lastArmor - g.player.armor; lastArmor = g.player.armor;
  }
  return { frames, waves: [...seen], upgrades, distance, damage, firstScore, ...g.state() };
}
