const icons = {
  bolt: '<path d="M14 2 4 13h7l-1 9L21 10h-8z"/>',
  drone: '<path d="m3 8 5-4 4 4 4-4 5 4-4 10H7z"/><circle cx="12" cy="12" r="2"/>',
  shield: '<path d="m12 2 9 4-2 11-7 5-7-5L3 6z"/><path d="M12 6v11M7 10h10"/>',
  core: '<path d="m12 2 9 5v10l-9 5-9-5V7z"/><path d="m12 7 5 5-5 5-5-5z"/>',
  cross: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>',
  gravity: '<circle cx="12" cy="12" r="4"/><ellipse cx="12" cy="12" rx="11" ry="6" transform="rotate(-40 12 12)"/>',
  arrow: '<path d="m5 12 14 0m-6-6 6 6-6 6"/>',
  sound: '<path d="M3 9h4l5-5v16l-5-5H3zM16 7q6 5 0 10M19 3q10 9 0 18"/>',
  pause: '<path d="M7 4v16M17 4v16"/>',
  expand: '<path d="M3 9V3h6m6 0h6v6M3 15v6h6m6 0h6v-6"/>',
  target: '<circle cx="12" cy="12" r="8"/><path d="M12 0v7m0 10v7M0 12h7m10 0h7"/>',
  crown: '<path d="m2 7 5 4 5-8 5 8 5-4-3 13H5z"/>',
};
export function icon(name, cls = '') { return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">${icons[name] || icons.bolt}</svg>`; }

export const UPGRADES = [
  { id: 'voltage', name: 'ARC CASCADE', tag: 'VOLTAGE', color: 'cyan', icon: 'bolt', stat: '+45% CHAIN DAMAGE', text: 'Plasma leaps farther. Every tether pulses harder. Turn a crowd into a circuit.' },
  { id: 'gravity', name: 'SINGULARITY', tag: 'GRAVITY', color: 'amber', icon: 'gravity', stat: '+60% IMPLOSION RADIUS', text: 'Pull nearby machines into your overload. Collisions deal devastating bonus damage.' },
  { id: 'repair', name: 'PHOENIX CORE', tag: 'SURVIVAL', color: 'coral', icon: 'cross', stat: '+35 ARMOR · LIFESTEAL', text: 'Restore armor now. Multi-target detonations repair your suit. Stay in the fight.' },
];

export class GameUI {
  constructor(actions) {
    this.actions = actions;
    this.mode = '';
    this.root = document.querySelector('#ui');
    this.root.innerHTML = `<div class="ui-root">
      <div id="hud" class="hud hidden">
        <section class="mission"><div class="micro sector" id="sector">SECTOR 1 OF 3 — IRON VIADUCT</div><h2 id="wave">WAVE 1<span>/8</span> <small>SCRAP UPRISING</small></h2><div class="heat-line"><label>REACTOR HEAT</label><span id="heat-num">0%</span></div><div class="meter heat"><i id="heat-fill"></i></div><div class="incoming"><span>INCOMING</span>${icon('drone')}<b id="drones">12</b>${icon('shield')}<b id="walkers">04</b><small id="threat">BUILD YOUR CIRCUIT</small></div></section>
        <section class="top-center"><div class="record"><span>WIN <b id="wins">0</b></span><span>LOSE <b id="losses">0</b></span><i></i><time id="timer">00:00</time><span class="run-tag">ROGUELIKE / STANDARD</span></div><div class="boss hidden" id="boss"><div><b>VULCAN-IX</b><span>THE IRON DREADNOUGHT</span><small id="boss-percent">100%</small></div><div class="boss-track"><i id="boss-fill"></i></div></div><div class="route"><span id="route-1">IRON VIADUCT</span><i></i><span id="route-2">BASALT QUARRY</span><i></i><span id="route-3">STARFORGE CORE</span></div></section>
        <section class="scoring"><label>SCORE</label><strong id="score">0</strong><div class="combo">COMBO <b id="combo">x1.00</b></div><div class="currency">${icon('core')}<span>AMBER CORES</span><b id="amber">0</b></div></section>
        <section class="equipment"><h3>OVERCLOCK MODS</h3><div class="mod">${icon('bolt')}<span>ARC CASCADE</span><b id="mod-voltage">▪ ▪ ▪</b></div><div class="mod">${icon('gravity')}<span>SINGULARITY</span><b id="mod-gravity">▪ ▪ ▪</b></div><div class="mod">${icon('cross')}<span>PHOENIX CORE</span><b id="mod-repair">▪ ▪ ▪</b></div><h3 class="relic-title">RELICS</h3><div class="relics"><div title="Storm lens: tether range">${icon('target')}<small>STORM LENS</small></div><div title="Amber heart: capacitor regen">${icon('core')}<small>AMBER HEART</small></div><div title="Forged oath: combo multiplier">${icon('crown')}<small>FORGED OATH</small></div></div></section>
        <div class="circuit-count"><span id="chain-num">0</span><div>LIVE TETHERS<small id="chain-hint">HOLD LMB TO CONNECT</small></div><div class="circuit-lights" id="chain-lights"></div></div>
        <div class="bottom-hud"><section class="vitals"><div class="armor-label">${icon('shield')}<b>ARMOR</b><strong id="armor">150<small>/150</small></strong></div><div class="meter armor"><i id="armor-fill"></i></div><div class="capacitor-label"><span>CAPACITOR</span><b id="cap-num">100%</b></div><div class="meter capacitor"><i id="cap-fill"></i></div></section><section class="controls"><div><kbd>WASD</kbd><span>MOVE</span></div><div><kbd>LMB</kbd><span>TETHER BOLT</span></div><div class="overload-key"><kbd>RMB / SPACE</kbd><span>OVERLOAD</span></div><div><kbd>Q</kbd><span id="dash-label">JET-DASH</span></div><p>TETHER <i>›</i> CONDUCT <i>›</i> OVERLOAD</p></section><div class="utility"><button id="pause-btn" title="Pause [Esc]" aria-label="Pause">${icon('pause')}</button><button id="mute-btn" title="Toggle audio [M]" aria-label="Toggle audio">${icon('sound')}</button><button id="fullscreen-btn" title="Fullscreen [F]" aria-label="Fullscreen">${icon('expand')}</button></div></div>
      </div>
      <div id="announcer" class="announcer"><b></b><span></span></div>
      <div id="floats" aria-hidden="true"></div>
      <section id="modal" class="modal hidden"></section>
      <div class="frame-tl"></div><div class="frame-br"></div>
    </div>`;
    this.stage = this.root.firstElementChild;
    this.refs = Object.fromEntries([...this.root.querySelectorAll('[id]')].map(el => [el.id, el]));
    this.refs['pause-btn'].onclick = actions.pause;
    this.refs['mute-btn'].onclick = () => { actions.mute(); this.refs['mute-btn'].classList.toggle('muted'); };
    this.refs['fullscreen-btn'].onclick = actions.fullscreen;
    const resize = () => { this.scale = Math.min(innerWidth / 1280, innerHeight / 800); this.stage.style.transform = `translate(-50%,-50%) scale(${this.scale})`; };
    addEventListener('resize', resize); resize();
  }
  text(id, value) { const el = this.refs[id]; if (el && el.textContent !== String(value)) el.textContent = value; }
  width(id, value) { this.refs[id].style.width = `${Math.max(0, Math.min(100, value))}%`; }
  update(s) {
    this.state = s;
    if (this.mode !== s.mode) this.setMode(s.mode, s);
    if (s.mode !== 'playing') return;
    const sectors = ['IRON VIADUCT', 'BASALT QUARRY', 'STARFORGE CORE'];
    const waves = ['SCRAP UPRISING', 'SHIELD PROTOCOL', 'COPPER STORM', 'SIEGE ENGINES', 'QUARRY RIOT', 'THE CRUCIBLE', 'LAST SIGNAL', 'DREADNOUGHT'];
    this.text('sector', `SECTOR ${s.sector} OF 3 — ${sectors[s.sector - 1]}`);
    const waveHTML = `WAVE ${s.wave}<span>/8</span> <small>${waves[s.wave - 1]}</small>`;
    if (this.refs.wave.innerHTML !== waveHTML) this.refs.wave.innerHTML = waveHTML;
    this.text('heat-num', `${Math.round(s.heat)}%`); this.width('heat-fill', s.heat);
    this.text('score', Math.round(s.score).toLocaleString('en-US'));
    this.text('combo', `x${s.combo.toFixed(2)}`);
    this.text('amber', Math.round(s.amber).toLocaleString('en-US'));
    this.text('wins', s.wins); this.text('losses', s.losses);
    this.text('timer', `${String(Math.floor(s.elapsed / 60)).padStart(2, '0')}:${String(Math.floor(s.elapsed % 60)).padStart(2, '0')}`);
    this.refs.armor.innerHTML = `${Math.ceil(s.armor)}<small>/${s.maxArmor}</small>`;
    this.width('armor-fill', s.armor / s.maxArmor * 100);
    this.width('cap-fill', s.capacitor); this.text('cap-num', `${Math.floor(s.capacitor)}%`);
    this.text('chain-num', s.chains); this.text('chain-hint', s.chains ? 'SPACE TO DETONATE' : 'HOLD LMB TO CONNECT');
    this.refs['chain-lights'].innerHTML = Array.from({ length: s.maxChains }, (_, i) => `<i class="${i < s.chains ? 'lit' : ''}"></i>`).join('');
    this.text('dash-label', s.dashCooldown > 0 ? `DASH ${s.dashCooldown.toFixed(1)}s` : 'JET-DASH');
    this.text('drones', String(s.drones || 0).padStart(2, '0')); this.text('walkers', String(s.walkers || 0).padStart(2, '0'));
    this.text('threat', s.chains >= 5 ? 'OVERLOAD READY' : 'BUILD YOUR CIRCUIT');
    this.refs.boss.classList.toggle('hidden', s.wave !== 8);
    this.width('boss-fill', s.bossMaxHp ? s.bossHp / s.bossMaxHp * 100 : 100);
    this.text('boss-percent', `${Math.ceil(s.bossHp / (s.bossMaxHp || 1) * 100)}%`);
    for (let i = 1; i <= 3; i++) this.refs[`route-${i}`].classList.toggle('active', i === s.sector);
    for (const id of ['voltage', 'gravity', 'repair']) { this.refs[`mod-${id}`].innerHTML = [0, 1, 2].map(i => `<i class="${i < (s.mods[id] || 0) ? 'on' : ''}"></i>`).join(''); }
  }
  setMode(mode, s) {
    this.mode = mode;
    this.refs.hud.classList.toggle('hidden', mode !== 'playing');
    this.refs.modal.classList.toggle('hidden', mode === 'playing');
    this.refs.floats.innerHTML = '';
    this.refs.announcer.classList.remove('show');
    this.refs.announcer.style.display = mode === 'playing' ? '' : 'none';
    const modal = this.refs.modal;
    modal.className = `modal ${mode} ${mode === 'playing' ? 'hidden' : ''}`;
    if (mode === 'title') modal.innerHTML = `<div class="title-mark">${icon('bolt')}<span>A MAGNETIC ACTION ROGUELIKE</span></div><div class="title-content"><div class="title-rule"></div><h1>STARFORGE<br><span>RAILGUNNER</span></h1><div class="subtitle"><i></i>VOLT <em>&</em> AMBER<i></i></div><p class="title-promise">THREAD A STORM THROUGH AN ARMY.</p><p class="title-copy">Eight waves. Three sectors. One iron god.<br>Bind the machines together. Tear them apart.</p><button id="start" class="primary">ENTER THE VIADUCT ${icon('arrow')}</button><button id="final" class="secondary">FINAL STAND <span>Jump into the dreadnought encounter</span></button><div class="title-controls"><span><kbd>WASD</kbd> MOVE</span><span><kbd>LMB</kbd> TETHER</span><span><kbd>SPACE</kbd> OVERLOAD</span><span><kbd>Q</kbd> DASH</span></div></div><div class="title-side"><span>GOLDEN CANYON</span><b>THE LAST<br>RAIL TO<br>STARFORGE.</b><p>ORIGINAL GAME BY @ARGAROMIT</p></div><div class="title-footer"><span>OFFLINE · ORIGINAL ART & AUDIO · NO DOWNLOADS</span><span>HEADPHONES RECOMMENDED ${icon('sound')}</span></div>`;
    else if (mode === 'upgrade') modal.innerHTML = `<div class="upgrade-heading"><span class="micro">SECTOR SECURED / FIELD WORKSHOP</span><h1>BREAK THE LIMIT.</h1><p>Choose an overclock. Your next circuit changes everything.</p></div><div class="upgrade-cards">${UPGRADES.map((u, i) => `<button class="upgrade-card ${u.color}" data-upgrade="${i}"><span class="card-number">PRESS ${i + 1}</span><div class="upgrade-emblem">${icon(u.icon)}</div><span class="card-tag">${u.tag} / OVERCLOCK</span><h2>${u.name}</h2><strong>${u.stat}</strong><p>${u.text}</p><div class="card-bottom">INSTALL MOD ${icon('arrow')}<small>LVL ${(s.mods[u.id] || 0) + 1}</small></div></button>`).join('')}</div><div class="workshop-foot">${icon('shield')} ARMOR RESTORED +25 <span>YOUR BUILD. YOUR STORM.</span></div>`;
    else if (mode === 'victory' || mode === 'defeat') {
      const win = mode === 'victory';
      modal.innerHTML = `<div class="result-content"><div class="result-medal">${icon(win ? 'crown' : 'shield')}</div><span class="micro">${win ? 'THE STARFORGE IS SILENT.' : 'CONNECTION LOST / RANGER DOWN'}</span><h1>${win ? 'VICTORY' : 'REACTOR LOST'}</h1><div class="result-rank">${win ? 'RANK S' : `WAVE ${s.wave} / 8`}<span>${win ? 'STORMBREAKER' : 'EVERY CIRCUIT TEACHES.'}</span></div><p>${win ? 'Vulcan-IX has fallen. The canyon belongs to the storm.' : 'Keep moving. Link a crowd. Overload before you overheat.'}</p><div class="result-stats"><div><span>FINAL SCORE</span><b>${Math.round(s.score).toLocaleString('en-US')}</b></div><div><span>MACHINES BROKEN</span><b>${s.kills}</b></div><div><span>LONGEST CHAIN</span><b>x${s.bestChain}</b></div><div><span>RUN TIME</span><b>${Math.floor(s.elapsed / 60)}:${String(Math.floor(s.elapsed % 60)).padStart(2, '0')}</b></div></div><button class="primary" id="restart">FORGE ANOTHER RUN ${icon('arrow')}</button><button class="secondary" id="return-title">RETURN TO TITLE</button><small class="result-note">${win ? 'NEXT RUN: BUILD A DIFFERENT STORM' : 'TIP: Q DASHES THROUGH LASERS AND GRANTS INVULNERABILITY'}</small></div>`;
    } else if (mode === 'paused') modal.innerHTML = `<div class="pause-content"><span class="micro">SIGNAL HELD</span><h1>TAKE A BREATH.</h1><p>The storm can wait.</p><button class="primary" id="resume">RESUME CIRCUIT ${icon('arrow')}</button><button class="secondary" id="restart">RESTART RUN</button><button class="secondary" id="return-title">RETURN TO TITLE</button><p class="pause-help">WASD move · LMB tether · SPACE overload · Q dash<br>ESC pause · M audio · F fullscreen</p><button class="secondary" id="motion">TOGGLE REDUCED EFFECTS</button></div>`;
    modal.querySelector('#start')?.addEventListener('click', () => this.actions.start());
    modal.querySelector('#final')?.addEventListener('click', () => this.actions.start('final'));
    modal.querySelector('#restart')?.addEventListener('click', this.actions.restart);
    modal.querySelector('#resume')?.addEventListener('click', this.actions.resume);
    modal.querySelector('#return-title')?.addEventListener('click', this.actions.title);
    modal.querySelector('#motion')?.addEventListener('click', this.actions.motion);
    modal.querySelectorAll('[data-upgrade]').forEach(b => b.onclick = () => this.actions.chooseUpgrade(Number(b.dataset.upgrade)));
  }
  announce(text, detail = '') {
    if (this.mode !== 'playing') return;
    const el = this.refs.announcer;
    el.querySelector('b').textContent = text; el.querySelector('span').textContent = detail;
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    clearTimeout(this.announceTimeout); this.announceTimeout = setTimeout(() => el.classList.remove('show'), 2300);
  }
  float(text, x, y, color = 'cyan', large = false) {
    if (this.mode !== 'playing') return;
    const el = document.createElement('div'); el.className = `damage ${color} ${large ? 'large' : ''}`; el.textContent = text;
    el.style.left = `${x}px`; el.style.top = `${y}px`;
    this.refs.floats.append(el); setTimeout(() => el.remove(), 1150);
  }
}
