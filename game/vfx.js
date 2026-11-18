import { seededRandom } from './world.js';

export class PlasmaEffects {
  constructor(world) {
    this.world = world; this.canvas = document.querySelector('#effects'); this.ctx = this.canvas.getContext('2d');
    this.glow = document.createElement('canvas'); this.g = this.glow.getContext('2d');
    this.blur = document.createElement('canvas'); this.b = this.blur.getContext('2d');
    this.particles = []; this.rings = []; this.bursts = []; this.time = 0; this.random = seededRandom(1924); this.flash = 0;
    const resize = () => { this.canvas.width = this.glow.width = this.blur.width = 1280; this.canvas.height = this.glow.height = this.blur.height = 800; }; resize();
  }
  point(x, z, y = 1) { return this.world.screen(x, z, y); }
  sparks(x, z, count, color = 'amber', force = 1) {
    const origin = this.point(x, z, 1);
    for (let i = 0; i < count; i++) { const a = this.random() * Math.PI * 2, speed = (30 + this.random() * 220) * force; this.particles.push({ x: origin.x, y: origin.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed * .7 - 40, life: .2 + this.random() * .75, max: 1, color, size: this.random() * 2.8 + .7 }); }
    if (this.particles.length > 800) this.particles.splice(0, this.particles.length - 800);
  }
  event(e) {
    if (e.type === 'overload') {
      const p = this.point(e.x, e.z, .6); this.rings.push({ x: p.x, y: p.y, radius: 15, life: .68, maxRadius: e.radius * 30 + 70 });
      this.bursts.push({ ...p, life: .48, count: e.count, nodes: e.nodes.map(n => this.point(n.x, n.z)) });
      this.sparks(e.x, e.z, 95, 'amber', 1.5); this.sparks(e.x, e.z, 55, 'cyan', 1.1); this.flash = .2;
    } else if (e.type === 'kill') { this.sparks(e.x, e.z, 14, 'amber', .6); const p = this.point(e.x, e.z); this.rings.push({ x: p.x, y: p.y, radius: 2, life: .23, maxRadius: 27 }); }
    else if (e.type === 'link') this.sparks(e.x, e.z, 4, 'cyan', .25);
    else if (e.type === 'muzzle') this.sparks(e.x, e.z, 3, 'cyan', .2);
    else if (e.type === 'trail' || e.type === 'dash') this.sparks(e.x, e.z, e.type === 'dash' ? 25 : 3, 'amber', .35);
    else if (e.type === 'hurt') { this.sparks(e.x, e.z, 20, 'coral', .7); this.flash = .12; }
    else if (e.type === 'pickup') this.sparks(e.x, e.z, 5, 'amber', .2);
  }
  clear() { this.particles = []; this.rings = []; this.bursts = []; this.flash = 0; }
  update(dt) {
    this.time += dt; this.flash = Math.max(0, this.flash - dt);
    for (const p of this.particles) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= Math.exp(-dt * 1.5); p.vy += dt * 120; }
    this.particles = this.particles.filter(p => p.life > 0);
    for (const r of this.rings) { r.life -= dt; r.radius += dt * r.maxRadius * 2.5; } this.rings = this.rings.filter(r => r.life > 0);
    for (const b of this.bursts) b.life -= dt; this.bursts = this.bursts.filter(b => b.life > 0);
  }
  lightning(a, b, seed, power = 1) {
    const g = this.g, dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1, segments = Math.max(6, Math.ceil(len / 14));
    const points = [a];
    for (let i = 1; i < segments; i++) { const k = i / segments, offset = Math.sin(i * 132.3 + seed * 14 + Math.floor(this.time * 24) * 4.17) * (5 + power * 6) * Math.sin(k * Math.PI); points.push({ x: a.x + dx * k - dy / len * offset, y: a.y + dy * k + dx / len * offset }); } points.push(b);
    g.beginPath(); g.moveTo(a.x, a.y); for (const p of points) g.lineTo(p.x, p.y);
    g.strokeStyle = '#16bfe8'; g.lineWidth = 5 * power; g.globalAlpha = .8; g.stroke();
    g.strokeStyle = '#b8fbff'; g.lineWidth = 2.1 * power; g.globalAlpha = 1; g.stroke();
    g.strokeStyle = '#ffffff'; g.lineWidth = .8 * power; g.stroke();
    for (let i = 2; i < points.length - 1; i += 4) { const p = points[i]; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x + Math.sin(i + seed) * 15, p.y - 12); g.lineTo(p.x + Math.sin(i + seed) * 25, p.y - 8); g.lineWidth = .7; g.strokeStyle = '#7bedff'; g.stroke(); }
  }
  draw(game) {
    const c = this.ctx, g = this.g, b = this.b;
    c.clearRect(0, 0, 1280, 800); g.clearRect(0, 0, 1280, 800);
    const t = this.time;
    const title = game.mode === 'title';
    const show = game.mode === 'playing' || title;
    if (!show) return;
    if (game.player.invulnerability > 0 && !title) { const p = this.point(game.player.x, game.player.z, .1); g.beginPath(); g.ellipse(p.x, p.y, 25, 13, 0, 0, 7); g.strokeStyle = '#83f4ff'; g.lineWidth = 2; g.stroke(); }
    if (game.boss && (game.boss.laser || game.boss.laserCharge > 0)) {
      const boss = game.boss, p = this.point(boss.x, boss.z, 1.5), end = this.point(boss.x + Math.cos(boss.laserAngle) * 35, boss.z + Math.sin(boss.laserAngle) * 35, .3);
      g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(end.x, end.y);
      if (boss.laser) { g.lineWidth = 17; g.strokeStyle = '#ff6932'; g.stroke(); g.lineWidth = 5; g.strokeStyle = '#fff0b2'; g.stroke(); }
      else { g.setLineDash([12, 9]); g.lineWidth = 2; g.strokeStyle = `rgba(255,128,67,${.5 + Math.sin(t * 30) * .3})`; g.stroke(); g.setLineDash([]); }
    }
    const chainNodes = title ? game.enemies.slice(0, 5) : game.chains;
    let prev = this.point(game.player.x, game.player.z, 1.1);
    chainNodes.forEach((node, i) => {
      const p = this.point(node.x, node.z, node.pillar ? 3.6 : node.boss ? 2.1 : 1);
      this.lightning(prev, p, i + 1, 1);
      g.strokeStyle = '#8df7ff'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(p.x, p.y + 15, node.boss ? 70 : 24, node.boss ? 29 : 10, 0, 0, 7); g.stroke();
      g.fillStyle = '#d0ffff'; g.beginPath(); g.arc(p.x, p.y, 4 + Math.sin(t * 12 + i), 0, 7); g.fill();
      if (!title) { c.font = 'bold 10px Arial'; c.fillStyle = '#c0fbff'; c.textAlign = 'center'; c.fillText(String(i + 1).padStart(2, '0'), p.x, p.y - 28); }
      prev = p;
    });
    for (const e of game.enemies) {
      const p = this.point(e.x, e.z, .12);
      c.fillStyle = 'rgba(3,14,22,.35)'; c.beginPath(); c.ellipse(p.x + 5, p.y + 4, e.radius * 22, e.radius * 9, -.3, 0, 7); c.fill();
      if (e.age < .7) { g.beginPath(); g.ellipse(p.x, p.y, 26, 12, 0, 0, 7); g.strokeStyle = '#ff9866'; g.lineWidth = 1.5; g.stroke(); }
      if (e.hp < e.maxHp && e.hp > 0) { const h = this.point(e.x, e.z, 2.2); c.fillStyle = '#071820bb'; c.fillRect(h.x - 14, h.y, 28, 3); c.fillStyle = e.linked ? '#86f6ff' : '#e5a77b'; c.fillRect(h.x - 14, h.y, 28 * e.hp / e.maxHp, 2); }
    }
    for (const bolt of game.bolts) { const p = this.point(bolt.x, bolt.z, 1), tail = this.point(bolt.x - bolt.vx * .04, bolt.z - bolt.vz * .04, 1); g.beginPath(); g.moveTo(tail.x, tail.y); g.lineTo(p.x, p.y); g.strokeStyle = '#a9fbff'; g.lineWidth = 3; g.stroke(); }
    for (const shot of game.projectiles) { const p = this.point(shot.x, shot.z, .8); g.fillStyle = '#ffb03e'; g.beginPath(); g.arc(p.x, p.y, 4, 0, 7); g.fill(); g.fillStyle = '#ffefb2'; g.beginPath(); g.arc(p.x, p.y, 1.6, 0, 7); g.fill(); }
    for (const a of game.pickups) { const p = this.point(a.x, a.z, .4 + Math.sin(t * 3 + a.x) * .1); g.fillStyle = '#ffc458'; g.save(); g.translate(p.x, p.y); g.rotate(t + a.x); g.fillRect(-3, -3, 6, 6); g.restore(); }
    for (const r of this.rings) {
      const alpha = Math.min(1, r.life * 3);
      g.globalAlpha = alpha; g.beginPath(); g.ellipse(r.x, r.y, r.radius, r.radius * .57, -.02, 0, 7); g.lineWidth = 3.6; g.strokeStyle = '#a4fbff'; g.stroke();
      g.beginPath(); g.ellipse(r.x, r.y, r.radius * .8, r.radius * .45, .05, 0, 7); g.lineWidth = 2; g.strokeStyle = '#ffbd55'; g.stroke(); g.globalAlpha = 1;
    }
    for (const burst of this.bursts) {
      const k = burst.life / .48;
      for (let i = 0; i < burst.nodes.length; i++) this.lightning(burst, burst.nodes[i], i + 50, k * 1.4);
      const grd = g.createRadialGradient(burst.x, burst.y, 1, burst.x, burst.y, 80 * k + 10); grd.addColorStop(0, '#eaffff'); grd.addColorStop(.15, '#a8f8ff'); grd.addColorStop(.35, '#34aaccaa'); grd.addColorStop(1, '#238cb000'); g.fillStyle = grd; g.fillRect(burst.x - 100, burst.y - 100, 200, 200);
    }
    for (const p of this.particles) { g.globalAlpha = Math.min(1, p.life * 3); g.strokeStyle = p.color === 'cyan' ? '#9af9ff' : p.color === 'coral' ? '#ff8268' : '#ffcb69'; g.lineWidth = p.size; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - p.vx * .025, p.y - p.vy * .025); g.stroke(); } g.globalAlpha = 1;
    b.clearRect(0, 0, 1280, 800); b.filter = 'blur(9px)'; b.drawImage(this.glow, 0, 0); b.filter = 'none';
    c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = .65; c.drawImage(this.blur, 0, 0); c.filter = 'blur(3px)'; c.globalAlpha = .55; c.drawImage(this.glow, 0, 0); c.filter = 'none'; c.globalAlpha = 1; c.drawImage(this.glow, 0, 0); c.restore();
    if (this.flash > 0 && !game.reducedMotion) { c.fillStyle = `rgba(180,249,255,${this.flash * .12})`; c.fillRect(0, 0, 1280, 800); }
    if (!title) {
      const aim = this.point(game.aim.x, game.aim.z, .05); c.strokeStyle = '#c3fbffc2'; c.lineWidth = 1;
      c.beginPath(); c.arc(aim.x, aim.y, 8, 0, 7); c.moveTo(aim.x - 14, aim.y); c.lineTo(aim.x - 5, aim.y); c.moveTo(aim.x + 5, aim.y); c.lineTo(aim.x + 14, aim.y); c.moveTo(aim.x, aim.y - 14); c.lineTo(aim.x, aim.y - 5); c.moveTo(aim.x, aim.y + 5); c.lineTo(aim.x, aim.y + 14); c.stroke();
    }
  }
}
