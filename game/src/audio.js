// LOMPAT NERAKA — efek suara tersintesis (WebAudio, tanpa file audio).
export class Sfx {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }
  ensure() {
    if (!this.ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC();
      } catch (e) { this.ctx = null; }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }
  tone(freq0, freq1, dur, type, vol, delay = 0) {
    if (!this.enabled) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq0, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, freq1), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }
  jump() { this.tone(280, 620, 0.16, 'square', 0.10); }
  coin() { this.tone(880, 880, 0.07, 'sine', 0.12); this.tone(1318, 1318, 0.14, 'sine', 0.12, 0.07); }
  stomp() { this.tone(320, 60, 0.18, 'sawtooth', 0.14); }
  death() { this.tone(420, 55, 0.55, 'sawtooth', 0.16); }
  checkpoint() { this.tone(523, 523, 0.09, 'sine', 0.12); this.tone(659, 659, 0.09, 'sine', 0.12, 0.09); this.tone(784, 784, 0.16, 'sine', 0.12, 0.18); }
  reveal() { this.tone(200, 900, 0.12, 'triangle', 0.12); }
  win() {
    const notes = [523, 659, 784, 1046, 784, 1046];
    notes.forEach((n, i) => this.tone(n, n, 0.16, 'square', 0.09, i * 0.13));
  }
  click() { this.tone(600, 600, 0.05, 'sine', 0.08); }
}
