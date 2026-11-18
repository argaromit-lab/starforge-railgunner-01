export class ForgeAudio {
  constructor() { this.ctx = null; this.muted = false; this.lastBeat = 0; this.beat = 0; }
  unlock() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain(); this.master.gain.value = .24; this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate; this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate); const data = this.noise.getChannelData(0);
      let seed = 17; for (let i = 0; i < len; i++) { seed = (seed * 16807) % 2147483647; data[i] = seed / 1073741824 - 1; }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }
  mute() { this.muted = !this.muted; if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : .24, this.ctx.currentTime, .04); }
  tone(freq, length, volume, type = 'sine', end = freq, delay = 0) {
    if (!this.ctx) return; const now = this.ctx.currentTime + delay; const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, now); o.frequency.exponentialRampToValueAtTime(Math.max(20, end), now + length);
    g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(volume, now + .004); g.gain.exponentialRampToValueAtTime(.0001, now + length); o.connect(g); g.connect(this.master); o.start(now); o.stop(now + length + .03);
  }
  hiss(length, volume, filter = 1500, delay = 0) {
    if (!this.ctx) return; const now = this.ctx.currentTime + delay; const n = this.ctx.createBufferSource(), g = this.ctx.createGain(), f = this.ctx.createBiquadFilter();
    n.buffer = this.noise; f.type = 'lowpass'; f.frequency.value = filter; n.connect(f); f.connect(g); g.connect(this.master);
    g.gain.setValueAtTime(volume, now); g.gain.exponentialRampToValueAtTime(.0001, now + length); n.start(now); n.stop(now + length);
  }
  play(event, amount = 1) {
    if (!this.ctx || this.muted) return;
    if (event === 'bolt') { this.tone(920, .1, .12, 'sawtooth', 180); this.hiss(.045, .08, 7000); }
    else if (event === 'link') { this.tone(460 + amount * 85, .14, .13, 'sine', 1300); this.tone(1600, .055, .04, 'triangle', 2200); }
    else if (event === 'overload') { this.tone(180, .7, .85, 'sine', 28); this.tone(960, .27, .22, 'sawtooth', 52); this.hiss(.55, .6, 2700); this.tone(1450, .4, .15, 'triangle', 180, .035); }
    else if (event === 'kill') { this.hiss(.16, .18, 1800); this.tone(130, .18, .22, 'triangle', 40); }
    else if (event === 'dash') { this.hiss(.24, .22, 4500); this.tone(180, .18, .15, 'sawtooth', 1200); }
    else if (event === 'hurt') { this.hiss(.2, .27, 600); this.tone(75, .23, .4, 'square', 35); }
    else if (event === 'upgrade') [220, 277.18, 329.63, 440, 659.25].forEach((f, i) => this.tone(f, .5, .2, 'triangle', f, i * .08));
    else if (event === 'victory') [146.83, 220, 293.66, 369.99, 440, 587.33].forEach((f, i) => this.tone(f, 1.1, .22, 'triangle', f, i * .15));
    else if (event === 'defeat') [220, 207.65, 146.83, 73.42].forEach((f, i) => this.tone(f, .8, .2, 'triangle', f * .8, i * .24));
    else if (event === 'warning') { this.tone(440, .18, .15, 'square', 440); this.tone(440, .18, .15, 'square', 440, .26); }
  }
  update(active) {
    if (!this.ctx || this.muted || !active) return;
    const now = this.ctx.currentTime;
    if (now - this.lastBeat > .22) {
      this.lastBeat = now; const b = this.beat++; const bass = [55, 55, 65.41, 49][Math.floor(b / 16) % 4];
      if (b % 4 === 0) { this.tone(125, .19, .23, 'sine', 36); this.tone(bass, .35, .15, 'sawtooth', bass); }
      if (b % 8 === 4) this.hiss(.14, .15, 1700);
      if (b % 2 === 0) this.hiss(.035, .04, 6500);
      const notes = [1, 1.5, 2, 2.378, 2, 1.5, 1.334, 1.5];
      this.tone(bass * 4 * notes[b % 8], .2, .026, 'triangle');
    }
  }
}
