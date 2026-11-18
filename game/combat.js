import { seededRandom } from './world.js';

export const WAVE_NAMES = ['SCRAP UPRISING', 'SHIELD PROTOCOL', 'COPPER STORM', 'SIEGE ENGINES', 'QUARRY RIOT', 'THE CRUCIBLE', 'LAST SIGNAL', 'DREADNOUGHT'];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const enemyConfig = {
  drone: { hp: 115, speed: 2.25, radius: .65, score: 240, damage: 10 },
  walker: { hp: 285, speed: 1.05, radius: .92, score: 680, damage: 17 },
  artillery: { hp: 210, speed: .72, radius: .85, score: 460, damage: 13 },
};

export class CombatGame {
  constructor(pillars, audio) {
    this.pillars = pillars; this.audio = audio; this.events = [];
    this.wins = this.loadNumber('starforge-wins'); this.losses = this.loadNumber('starforge-losses');
    this.highScore = this.loadNumber('starforge-best'); this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.reset(); this.mode = 'title'; this.attract();
  }
  loadNumber(key) { try { return Number(localStorage.getItem(key) || 0); } catch { return 0; } }
  saveNumber(key, value) { try { localStorage.setItem(key, String(value)); } catch {} }
  reset(seed = 8186) {
    this.random = seededRandom(seed); this.mode = 'playing'; this.wave = 1; this.sector = 1;
    this.player = { x: -3.4, z: 4.2, vx: 0, vz: 0, radius: .5, armor: 150, maxArmor: 150, invulnerability: 0, dashTime: 0, dashCooldown: 0, moving: false };
    this.enemies = []; this.bolts = []; this.projectiles = []; this.chains = []; this.pickups = []; this.events = [];
    this.score = 0; this.amber = 0; this.combo = 1; this.comboTimer = 0; this.capacitor = 100; this.heat = 0;
    this.elapsed = 0; this.waveTime = 0; this.time = 0; this.kills = 0; this.overloads = 0; this.bestChain = 0;
    this.mods = { voltage: 0, gravity: 0, repair: 0 }; this.maxChains = 8; this.id = 1; this.boss = null; this.shake = 0;
    this.fireCooldown = 0; this.overloadCooldown = 0; this.hitstop = 0; this.transitionTime = 0; this.reinforcement = 0; this.pendingOverload = null; this.chainClock = 0;
    this.aim = { x: 4, z: -3 }; this.finalStand = false; this.deathReason = ''; this.totalBolts = 0; this.totalLinks = 0;
    for (const p of this.pillars) p.linked = false;
  }
  attract() {
    this.wave = 8; this.sector = 3; this.boss = this.makeBoss(); this.boss.x = 7.3; this.boss.z = -4.5;
    this.player.x = 3.9; this.player.z = 4.3;
    const positions = [[-5, -5], [0, -6], [2.1, -.3], [-2.4, 3.2], [9, 3.5], [12, -.2], [6, 6.5], [-8, 4.2], [14, -5.5], [-10, -4]];
    positions.forEach(([x, z], i) => this.spawn(i % 3 === 0 ? 'walker' : 'drone', x, z));
    this.aim = { x: 7, z: -3 }; this.mode = 'title';
  }
  start(mode) {
    this.reset(); this.audio.unlock();
    if (mode === 'final') {
      this.finalStand = true; this.wave = 8; this.sector = 3;
      this.mods = { voltage: 2, gravity: 1, repair: 1 }; this.score = 124800; this.amber = 1420; this.combo = 6.5; this.comboTimer = 15;
      this.player.x = -5.2; this.player.z = 4.5;
      this.spawnWave(true);
    } else this.spawnWave();
    this.emit('announce', { text: mode === 'final' ? 'FINAL STAND' : 'THE VIADUCT AWAITS', detail: mode === 'final' ? 'CHECKPOINT / SECTOR 3 · WAVE 8 · FULL LOADOUT' : 'HOLD LMB TO TETHER · SPACE TO OVERLOAD' });
  }
  makeBoss() { return { id: 99999, x: 5.4, z: -5, hp: 5700, maxHp: 5700, radius: 3.3, linked: false, boss: true, age: 2, phase: 0, attackClock: 0, laserAngle: 0, laser: false, laserCharge: 0, laserTimer: 0, volley: 0 }; }
  spawn(type, x, z) {
    const cfg = enemyConfig[type]; const scaling = 1 + Math.max(0, this.wave - 3) * .07;
    const e = { id: this.id++, type, x, z, hp: cfg.hp * scaling, maxHp: cfg.hp * scaling, speed: cfg.speed * (1 + this.wave * .018), radius: cfg.radius, score: cfg.score, damage: cfg.damage, linked: false, age: 0, hitTimer: 0, attackTimer: this.random() * 3, pullTime: 0, px: x, pz: z };
    this.enemies.push(e); return e;
  }
  spawnWave(checkpoint = false) {
    this.waveTime = 0; this.transitionTime = 0;
    this.enemies.length = 0; this.bolts.length = 0; this.projectiles.length = 0; this.chains.length = 0;
    for (const p of this.pillars) p.linked = false;
    const count = [12, 15, 18, 18, 21, 24, 27, 24][this.wave - 1];
    for (let i = 0; i < count; i++) {
      let type = 'drone';
      if (this.wave > 1 && i % 4 === 0) type = 'walker';
      if (this.wave > 3 && i % 9 === 0) type = 'artillery';
      if (checkpoint) {
        const angle = i * 2.39996; const radius = 4 + (i % 4) * 2.3;
        this.spawn(type, clamp(-1 + Math.cos(angle) * radius, -22, 22), clamp(1.3 + Math.sin(angle) * radius * .76, -14, 14));
      } else {
        const side = i % 4, t = this.random();
        this.spawn(type, side < 2 ? (side ? 22.7 : -22.7) : -20 + t * 40, side >= 2 ? (side === 2 ? -15.5 : 15.5) : -14 + t * 28);
      }
    }
    if (this.wave === 8) this.boss = this.makeBoss();
    this.emit('announce', { text: `WAVE ${this.wave} / 8`, detail: WAVE_NAMES[this.wave - 1] });
    this.audio.play(this.wave === 8 ? 'warning' : 'upgrade');
  }
  emit(type, data = {}) { this.events.push({ type, ...data }); }
  setAim(point) { this.aim = point; }
  pause() { if (this.mode === 'playing') { this.mode = 'paused'; this.emit('state'); } }
  resume() { if (this.mode === 'paused') { this.mode = 'playing'; this.emit('state'); } }
  chooseUpgrade(index) {
    if (this.mode !== 'upgrade') return;
    const id = ['voltage', 'gravity', 'repair'][index]; if (!id) return;
    this.mods[id]++; if (id === 'repair') { this.player.maxArmor += 20; this.player.armor = Math.min(this.player.maxArmor, this.player.armor + 35); }
    this.audio.play('upgrade'); this.mode = 'playing'; this.wave++; this.sector = this.wave <= 3 ? 1 : this.wave <= 6 ? 2 : 3; this.spawnWave();
  }
  fire() {
    if (this.mode !== 'playing' || this.fireCooldown > 0 || this.heat >= 99) return;
    const p = this.player, dx = this.aim.x - p.x, dz = this.aim.z - p.z, len = Math.hypot(dx, dz) || 1;
    this.fireCooldown = .14; this.heat = Math.min(100, this.heat + 3.8);
    this.bolts.push({ x: p.x + dx / len * .6, z: p.z + dz / len * .6, vx: dx / len * 53, vz: dz / len * 53, life: .85, tailX: p.x, tailZ: p.z });
    this.totalBolts++; this.audio.play('bolt'); this.emit('muzzle', { x: p.x + dx / len, z: p.z + dz / len });
  }
  targets() { return [...this.enemies, ...this.pillars, ...(this.boss ? [this.boss] : [])]; }
  link(target) {
    if (target.linked || this.chains.length >= this.maxChains || target.hp <= 0) return;
    target.linked = true; this.chains.push(target); this.totalLinks++; this.bestChain = Math.max(this.bestChain, this.chains.length);
    this.audio.play('link', this.chains.length); this.emit('link', { x: target.x, z: target.z });
    if (!target.pillar) target.hp -= 18 + this.mods.voltage * 5;
  }
  conduct(dt) {
    this.chainClock = (this.chainClock || 0) - dt;
    if (this.chainClock <= 0 && this.chains.length && this.chains.length < this.maxChains) {
      this.chainClock = .2;
      let next = null, best = 5.2 + this.mods.voltage * .8;
      const candidates = this.targets();
      for (const target of candidates) if (!target.linked && target.hp > 0) for (const node of this.chains) {
        const d = distance(node, target); if (d < best) { best = d; next = target; }
      }
      if (next) this.link(next);
    }
    for (const node of this.chains) if (!node.pillar) { node.hp -= dt * (9 + this.mods.voltage * 4); if (node.hp <= 0) this.kill(node); }
    this.chains = this.chains.filter(node => node.hp > 0 && (node.pillar || node.boss || this.enemies.includes(node)));
  }
  overload() {
    if (this.mode !== 'playing' || !this.chains.length || this.overloadCooldown > 0 || this.capacitor < 18) return false;
    const nodes = [...this.chains], count = nodes.length;
    const active = nodes.filter(n => !n.pillar); const center = active.length ? active : nodes;
    const x = center.reduce((s, n) => s + n.x, 0) / center.length, z = center.reduce((s, n) => s + n.z, 0) / center.length;
    const radius = 3.9 + this.mods.gravity * 2.25;
    this.capacitor -= 18; this.heat = Math.max(0, this.heat - count * 6); this.overloadCooldown = .55;
    this.hitstop = .04; this.shake = Math.min(1, .4 + count * .065); this.overloads++; this.bestChain = Math.max(this.bestChain, count);
    this.combo = Math.min(9.99, this.combo + count * .14); this.comboTimer = 8;
    this.audio.play('overload', count);
    this.emit('overload', { x, z, count, radius, nodes: nodes.map(n => ({ x: n.x, z: n.z })) });
    this.emit('float', { text: `CHAIN x${count}!`, x, z, large: true, color: 'cyan', dy: -125 });
    const marked = active.filter(n => !n.boss);
    for (const target of [marked[0], marked.find(n => n.type === 'drone')].filter((n, i, list) => n && list.indexOf(n) === i)) {
      this.emit('float', { text: `+${target.score}`, x: target.x, z: target.z, color: 'amber', dy: 21 });
    }
    this.pendingOverload = { nodes, x, z, radius, count, time: .14 };
    return true;
  }
  resolveOverload() {
    const { nodes, x, z, radius, count } = this.pendingOverload;
    this.pendingOverload = null;
    for (const target of this.targets()) {
      const near = distance(target, { x, z }) < radius;
      if (target.pillar || (!target.linked && !near)) continue;
      const armorBreak = target.boss && target.linked ? (count >= 4 ? 2.6 : 1.8) : 1;
      const damage = (94 + count * 26) * (1 + this.mods.voltage * .45) * (target.linked ? 1 : .55) * armorBreak;
      target.hp -= damage; target.pullTime = .32; target.px = x; target.pz = z; target.hitTimer = .18;
      if (target.boss) this.emit('float', { text: `−${Math.round(damage)}`, x: target.x, z: target.z, color: 'amber', dy: -50 });
      if (target.hp <= 0) this.kill(target);
    }
    if (count >= 3 && this.mods.repair) this.player.armor = Math.min(this.player.maxArmor, this.player.armor + count * this.mods.repair * 1.4);
    for (const n of nodes) n.linked = false;
    this.chains = [];
  }
  dash(dx, dz) {
    const p = this.player; if (this.mode !== 'playing' || p.dashCooldown > 0) return false;
    if (Math.abs(dx) + Math.abs(dz) < .1) { dx = this.aim.x - p.x; dz = this.aim.z - p.z; }
    const len = Math.hypot(dx, dz) || 1;
    p.dashX = dx / len; p.dashZ = dz / len; p.dashTime = .2; p.dashCooldown = 1.55; p.invulnerability = .3;
    this.audio.play('dash'); this.emit('dash', { x: p.x, z: p.z }); return true;
  }
  hurt(amount, reason) {
    const p = this.player; if (p.invulnerability > 0 || this.mode !== 'playing') return;
    p.armor = Math.max(0, p.armor - amount); p.invulnerability = .65; this.shake = .45; this.combo = Math.max(1, this.combo - .5);
    this.audio.play('hurt'); this.emit('hurt', { x: p.x, z: p.z }); this.emit('float', { text: `−${amount}`, x: p.x, z: p.z, color: 'coral' });
    if (p.armor <= 0) { this.deathReason = reason; this.end(false); }
  }
  kill(target) {
    if (target.dead || target.pillar) return; target.dead = true; target.linked = false;
    if (target.boss) {
      this.score += 50000; this.amber += 900; this.kills++; this.emit('overload', { x: target.x, z: target.z, count: 8, radius: 8, nodes: [] });
      this.boss = null; this.enemies.forEach(e => { this.emit('kill', { x: e.x, z: e.z }); }); this.enemies = []; this.end(true); return;
    }
    this.kills++; const value = Math.round(target.score * this.combo); this.score += value;
    this.capacitor = Math.min(100, this.capacitor + 2.5);
    this.pickups.push({ x: target.x, z: target.z, amount: target.type === 'walker' ? 26 : 12, life: 12 });
    this.emit('kill', { x: target.x, z: target.z, type: target.type }); this.audio.play('kill');
    this.enemies = this.enemies.filter(e => e !== target);
  }
  end(win) {
    this.mode = win ? 'victory' : 'defeat'; this.bolts = []; this.projectiles = []; this.chains = [];
    for (const p of this.pillars) p.linked = false;
    if (win) { this.wins++; this.saveNumber('starforge-wins', this.wins); } else { this.losses++; this.saveNumber('starforge-losses', this.losses); }
    this.highScore = Math.max(this.highScore, this.score); this.saveNumber('starforge-best', this.highScore);
    this.audio.play(win ? 'victory' : 'defeat'); this.emit('state');
  }
  update(dt, input) {
    this.time += dt; this.shake = Math.max(0, this.shake - dt * 2.3);
    if (this.mode !== 'playing') return;
    this.hitstop = Math.max(0, this.hitstop - dt); const d = this.hitstop > 0 ? dt * .04 : dt;
    this.elapsed += d; this.waveTime += d; const p = this.player;
    this.fireCooldown = Math.max(0, this.fireCooldown - d); this.overloadCooldown = Math.max(0, this.overloadCooldown - d);
    this.heat = Math.max(0, this.heat - d * 16); this.capacitor = Math.min(100, this.capacitor + d * 7.5);
    p.invulnerability = Math.max(0, p.invulnerability - d); p.dashCooldown = Math.max(0, p.dashCooldown - d);
    this.comboTimer -= d; if (this.comboTimer < 0) this.combo = Math.max(1, this.combo - d * .22);
    let dx = Number(!!input.right) - Number(!!input.left), dz = Number(!!input.down) - Number(!!input.up), len = Math.hypot(dx, dz);
    p.moving = len > 0; if (len) { dx /= len; dz /= len; }
    if (input.dash) this.dash(dx, dz); if (input.overload) this.overload(); if (input.fire) this.fire();
    if (p.dashTime > 0) { p.dashTime -= d; p.vx = p.dashX * 31; p.vz = p.dashZ * 31; this.emit('trail', { x: p.x, z: p.z }); }
    else { const blend = 1 - Math.exp(-d * 22); p.vx += (dx * 7.1 - p.vx) * blend; p.vz += (dz * 7.1 - p.vz) * blend; }
    p.x = clamp(p.x + p.vx * d, -23.2, 23.2); p.z = clamp(p.z + p.vz * d, -15.7, 15.7);
    for (const pillar of this.pillars) { const dist = distance(p, pillar), min = p.radius + pillar.radius; if (dist < min && dist > .001) { p.x += (p.x - pillar.x) / dist * (min - dist); p.z += (p.z - pillar.z) / dist * (min - dist); } }
    if (this.pendingOverload) { this.pendingOverload.time -= d; if (this.pendingOverload.time <= 0) this.resolveOverload(); }
    this.updateBolts(d); if (!this.pendingOverload) this.conduct(d); this.updateEnemies(d); this.updateProjectiles(d); this.updatePickups(d); this.updateBoss(d);
    if (this.mode !== 'playing') return;
    if (!this.enemies.length && !this.boss && this.wave < 8) {
      this.transitionTime += d;
      if (this.transitionTime > 1.2) {
        p.armor = Math.min(p.maxArmor, p.armor + 25); this.capacitor = 100;
        if (this.wave === 3 || this.wave === 6) { this.mode = 'upgrade'; this.audio.play('upgrade'); }
        else { this.wave++; this.sector = this.wave <= 3 ? 1 : this.wave <= 6 ? 2 : 3; this.spawnWave(); }
      }
    }
  }
  updateBolts(dt) {
    const targets = this.targets();
    for (const b of this.bolts) {
      b.life -= dt; b.tailX = b.x; b.tailZ = b.z; b.x += b.vx * dt; b.z += b.vz * dt;
      for (const t of targets) {
        const dx = b.x - b.tailX, dz = b.z - b.tailZ, len2 = dx * dx + dz * dz;
        const f = len2 ? clamp(((t.x - b.tailX) * dx + (t.z - b.tailZ) * dz) / len2, 0, 1) : 0;
        if (Math.hypot(t.x - b.tailX - dx * f, t.z - b.tailZ - dz * f) < t.radius + .2) {
          if (!t.linked) this.link(t);
          else if (!t.pillar) { t.hp -= 12 * (1 + this.mods.voltage * .3); if (t.hp <= 0) this.kill(t); }
          b.life = 0; this.emit('link', { x: b.x, z: b.z }); break;
        }
      }
    }
    this.bolts = this.bolts.filter(b => b.life > 0);
  }
  updateEnemies(dt) {
    const p = this.player;
    for (const e of this.enemies) {
      e.age += dt; e.attackTimer -= dt; e.hitTimer = Math.max(0, e.hitTimer - dt);
      const dx = p.x - e.x, dz = p.z - e.z, len = Math.hypot(dx, dz) || 1;
      if (e.pullTime > 0) { e.pullTime -= dt; e.x += (e.px - e.x) * dt * 9; e.z += (e.pz - e.z) * dt * 9; }
      else {
        const slow = e.linked ? .3 : 1; const stop = e.type === 'artillery' ? 8 : e.type === 'walker' ? 2 : .7;
        if (len > stop) { e.x += dx / len * e.speed * slow * dt; e.z += dz / len * e.speed * slow * dt; }
        if (len < e.radius + p.radius + .24 && e.age > .6) this.hurt(e.damage, `${e.type} collision`);
        if (e.type !== 'drone' && e.attackTimer <= 0 && e.age > 1.5) {
          e.attackTimer = e.type === 'walker' ? 3.2 : 2.35;
          this.projectiles.push({ x: e.x, z: e.z, vx: dx / len * 6.5, vz: dz / len * 6.5, life: 4, radius: .28, damage: e.damage });
          this.emit('enemyShot', { x: e.x, z: e.z });
        }
      }
      e.x = clamp(e.x, -23, 23); e.z = clamp(e.z, -15.5, 15.5);
    }
    for (let i = 0; i < this.enemies.length; i++) for (let j = i + 1; j < this.enemies.length; j++) {
      const a = this.enemies[i], b = this.enemies[j]; if (a.pullTime > 0 || b.pullTime > 0) continue;
      const dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz), min = (a.radius + b.radius) * .88;
      if (len < min && len > .001) { const push = (min - len) * .45; a.x -= dx / len * push; a.z -= dz / len * push; b.x += dx / len * push; b.z += dz / len * push; }
    }
  }
  updateProjectiles(dt) {
    for (const b of this.projectiles) { b.life -= dt; b.x += b.vx * dt; b.z += b.vz * dt; if (distance(this.player, b) < this.player.radius + b.radius) { this.hurt(b.damage, 'plasma round'); b.life = 0; } }
    this.projectiles = this.projectiles.filter(p => p.life > 0 && Math.abs(p.x) < 26 && Math.abs(p.z) < 19);
  }
  updatePickups(dt) {
    for (const a of this.pickups) {
      a.life -= dt; const len = distance(a, this.player);
      if (len < 5.5) { a.x += (this.player.x - a.x) * dt * 7; a.z += (this.player.z - a.z) * dt * 7; }
      if (len < .9) { a.life = 0; this.amber += a.amount; this.capacitor = Math.min(100, this.capacitor + 2); this.emit('pickup', { x: a.x, z: a.z }); }
    }
    this.pickups = this.pickups.filter(a => a.life > 0);
  }
  updateBoss(dt) {
    const b = this.boss; if (!b) return; b.age += dt; b.attackClock += dt; b.volley -= dt;
    if (b.pullTime > 0) b.pullTime -= dt;
    b.phase = b.hp < b.maxHp * .45 ? 1 : 0;
    if (b.attackClock > (b.phase ? 4.7 : 6.5) && !b.laser && !b.laserCharge) { b.laserCharge = 1.25; b.laserAngle = Math.atan2(this.player.z - b.z, this.player.x - b.x) - .75; this.audio.play('warning'); this.emit('announce', { text: 'SWEEP INCOMING', detail: 'Q / JET-DASH THROUGH THE BEAM' }); }
    if (b.laserCharge > 0) { b.laserCharge -= dt; if (b.laserCharge <= 0) { b.laserCharge = 0; b.laser = true; b.laserTimer = 2.3; } }
    if (b.laser) {
      b.laserTimer -= dt; b.laserAngle += dt * .72; const px = this.player.x - b.x, pz = this.player.z - b.z, along = px * Math.cos(b.laserAngle) + pz * Math.sin(b.laserAngle), across = Math.abs(-px * Math.sin(b.laserAngle) + pz * Math.cos(b.laserAngle));
      if (along > 0 && across < .63) this.hurt(25, 'Vulcan sweep laser');
      if (b.laserTimer <= 0) { b.laser = false; b.attackClock = 0; }
    } else if (b.volley <= 0 && !b.laserCharge) {
      b.volley = b.phase ? .65 : 1.1; const a = Math.atan2(this.player.z - b.z, this.player.x - b.x);
      for (let i = -1; i <= 1; i++) this.projectiles.push({ x: b.x + Math.cos(a) * 3.6, z: b.z + Math.sin(a) * 3.6, vx: Math.cos(a + i * .18) * 7.7, vz: Math.sin(a + i * .18) * 7.7, life: 5, radius: .32, damage: 17 });
    }
    if (distance(this.player, b) < 3) this.hurt(24, 'dreadnought impact');
    this.reinforcement += dt;
    if (this.reinforcement > 10 && this.enemies.length < 15) { this.reinforcement = 0; for (let i = 0; i < 7; i++) this.spawn(i % 3 ? 'drone' : 'walker', -22 + this.random() * 44, this.random() > .5 ? 15 : -15); }
  }
  state() {
    return { mode: this.mode, wave: this.wave, sector: this.sector, heat: this.heat, score: this.score, combo: this.combo, amber: this.amber, armor: this.player.armor, maxArmor: this.player.maxArmor, capacitor: this.capacitor, chains: this.chains.length, maxChains: this.maxChains, dashCooldown: this.player.dashCooldown, bossHp: this.boss?.hp || 0, bossMaxHp: this.boss?.maxHp || 0, elapsed: this.elapsed, kills: this.kills, overloads: this.overloads, bestChain: this.bestChain, wins: this.wins, losses: this.losses, mods: this.mods, drones: this.enemies.filter(e => e.type === 'drone').length, walkers: this.enemies.filter(e => e.type !== 'drone').length, finalStand: this.finalStand };
  }
}
