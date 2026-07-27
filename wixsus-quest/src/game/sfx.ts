let ctx: AudioContext | null = null;

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function noiseBuffer(c: AudioContext, dur: number): AudioBuffer {
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

const SWORD_SFX = 'https://music.wixstatic.com/mp3/4b150e_dba065601b4d4afcb3c81d3cefc45789.mp3';
let swordEl: HTMLAudioElement | null = null;

export function playSwordHit(): void {
  if (typeof Audio === 'undefined') return;
  try {
    if (!swordEl) {
      swordEl = new Audio(SWORD_SFX);
      swordEl.preload = 'auto';
    }
    const n = swordEl.cloneNode() as HTMLAudioElement;
    n.volume = 0.6;
    n.currentTime = 0;
    void n.play().catch(() => {});
  } catch {
    /* ignore */
  }
}

export function playBattleHit(): void {
  const c = ac();
  if (!c) return;
  const t = c.currentTime;
  const master = c.createGain();
  master.gain.value = 0.5;
  master.connect(c.destination);
  [55, 82.4, 110, 164.8].forEach((f) => {
    const o = c.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = f;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.11, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + 0.65);
  });
  const k = c.createOscillator();
  k.type = 'sine';
  k.frequency.setValueAtTime(165, t);
  k.frequency.exponentialRampToValueAtTime(45, t + 0.18);
  const kg = c.createGain();
  kg.gain.setValueAtTime(0.5, t);
  kg.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
  k.connect(kg).connect(master);
  k.start(t);
  k.stop(t + 0.28);
}

export function playLaugh(): void {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime;
  const master = c.createGain();
  master.gain.value = 0.5;
  master.connect(c.destination);
  const offsets = [0, 0.14, 0.28, 0.42, 0.56];
  const bases = [540, 500, 470, 430, 400];
  offsets.forEach((dt, i) => {
    const t = t0 + dt;
    const o = c.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(bases[i], t);
    o.frequency.exponentialRampToValueAtTime(bases[i] * 0.68, t + 0.1);
    const lfo = c.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 28;
    const lg = c.createGain();
    lg.gain.value = 26;
    lfo.connect(lg).connect(o.frequency);
    lfo.start(t);
    lfo.stop(t + 0.12);
    const g = c.createGain();
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(0.28, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + 0.13);
  });
}

/* ===== Epic wordless background music — dynamic procedural sequencer ===== */
let musicTimer: ReturnType<typeof setInterval> | null = null;
let musicGain: GainNode | null = null;
let musicBus: GainNode | null = null;
let nextTime = 0;
let step = 0;
let cycle = 0;

const BPM = 110;
const EIGHTH = 60 / BPM / 2;
const STEPS = 64; // 8 bars x 8 eighths

const AM = { root: 110.0, notes: [220.0, 261.63, 329.63] };
const F = { root: 87.31, notes: [174.61, 220.0, 261.63] };
const C = { root: 130.81, notes: [261.63, 329.63, 392.0] };
const G = { root: 98.0, notes: [196.0, 246.94, 293.66] };
const DM = { root: 146.83, notes: [220.0, 293.66, 349.23] };
const E = { root: 82.41, notes: [207.65, 246.94, 329.63] };
const PROG = [AM, F, C, G, AM, F, DM, E];

const LEAD_A = [659.25, 0, 0, 587.33, 0, 523.25, 0, 0, 587.33, 0, 659.25, 0, 783.99, 0, 659.25, 0];
const LEAD_B = [880.0, 0, 783.99, 0, 659.25, 0, 587.33, 0, 523.25, 0, 587.33, 659.25, 0, 523.25, 0, 0];

function padChord(c: AudioContext, notes: number[], t: number, dur: number, dest: GainNode): void {
  notes.forEach((f, i) => {
    const o = c.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = f + (i === 1 ? 1.4 : 0);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(900, t);
    lp.frequency.linearRampToValueAtTime(1900, t + dur * 0.5);
    lp.frequency.linearRampToValueAtTime(1100, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.045, t + 0.5);
    g.gain.setValueAtTime(0.045, t + dur - 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(lp).connect(g).connect(dest);
    o.start(t);
    o.stop(t + dur);
  });
}

function bass(c: AudioContext, f: number, t: number, dur: number, dest: GainNode): void {
  const o = c.createOscillator();
  o.type = 'triangle';
  o.frequency.value = f;
  const sub = c.createOscillator();
  sub.type = 'sine';
  sub.frequency.value = f / 2;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.13, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  sub.connect(g);
  g.connect(dest);
  o.start(t);
  sub.start(t);
  o.stop(t + dur + 0.02);
  sub.stop(t + dur + 0.02);
}

function kick(c: AudioContext, t: number, dest: GainNode): void {
  const o = c.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(150, t);
  o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
  const g = c.createGain();
  g.gain.setValueAtTime(0.18, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
  o.connect(g).connect(dest);
  o.start(t);
  o.stop(t + 0.22);
}

function snare(c: AudioContext, t: number, dest: GainNode, vol = 0.09): void {
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, 0.2);
  const hp = c.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 1500;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  src.connect(hp).connect(g).connect(dest);
  src.start(t);
  src.stop(t + 0.2);
}

function hat(c: AudioContext, t: number, dest: GainNode, open: boolean): void {
  const src = c.createBufferSource();
  const d = open ? 0.12 : 0.045;
  src.buffer = noiseBuffer(c, d + 0.02);
  const hp = c.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 7500;
  const g = c.createGain();
  g.gain.setValueAtTime(open ? 0.05 : 0.032, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  src.connect(hp).connect(g).connect(dest);
  src.start(t);
  src.stop(t + d + 0.02);
}

function crash(c: AudioContext, t: number, dest: GainNode): void {
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, 0.9);
  const hp = c.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 5000;
  const g = c.createGain();
  g.gain.setValueAtTime(0.09, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
  src.connect(hp).connect(g).connect(dest);
  src.start(t);
  src.stop(t + 0.95);
}

function lead(c: AudioContext, f: number, t: number, dur: number, dest: GainNode): void {
  const o = c.createOscillator();
  o.type = 'triangle';
  o.frequency.value = f;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.075, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(dest);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function scheduleStep(c: AudioContext, s: number, t: number, dest: GainNode, cyc: number): void {
  const bar = Math.floor(s / 8);
  const inBar = s % 8;
  const chord = PROG[bar];

  if (inBar === 0) padChord(c, chord.notes, t, EIGHTH * 8, dest);
  if (s === 0 && cyc >= 1) crash(c, t, dest);

  // kick: quarters always; driving off-beat kick once built up
  if (inBar % 2 === 0) kick(c, t, dest);
  if (cyc >= 2 && inBar === 5) kick(c, t, dest);

  // snare on beats 2 & 4 from first build
  if (cyc >= 1 && (inBar === 2 || inBar === 6)) snare(c, t, dest);

  // hats every eighth once built up (accented off-beats)
  if (cyc >= 1) hat(c, t, dest, inBar % 2 === 1);

  // bass: root each quarter; galloping eighths when intense
  if (inBar % 2 === 0) bass(c, chord.root, t, EIGHTH * (cyc >= 2 ? 1.9 : 3.6), dest);
  if (cyc >= 2 && inBar % 2 === 1) bass(c, chord.root, t, EIGHTH * 0.9, dest);

  // lead motif from first build, octave-up accent when fully built
  if (cyc >= 1) {
    const motif = Math.floor(s / 16) % 2 === 0 ? LEAD_A : LEAD_B;
    const lf = motif[s % 16];
    if (lf) lead(c, lf * (cyc >= 3 ? 2 : 1), t, EIGHTH * 1.5, dest);
  }

  // drum fill across the last bar's second half
  if (cyc >= 1 && bar === 7 && inBar >= 4) {
    snare(c, t, dest, 0.06 + (inBar - 4) * 0.02);
    if (inBar === 7) crash(c, t + EIGHTH, dest);
  }
}

export function startMusic(): void {
  const c = ac();
  if (!c || musicTimer) return;
  musicBus = c.createGain();
  musicBus.gain.value = 0.9;
  musicGain = c.createGain();
  musicGain.gain.setValueAtTime(0.0001, c.currentTime);
  musicGain.gain.exponentialRampToValueAtTime(0.15, c.currentTime + 2.5);
  musicBus.connect(musicGain).connect(c.destination);
  nextTime = c.currentTime + 0.15;
  step = 0;
  cycle = 0;
  musicTimer = setInterval(() => {
    if (!musicBus) return;
    while (nextTime < c.currentTime + 0.14) {
      scheduleStep(c, step, nextTime, musicBus, cycle);
      nextTime += EIGHTH;
      step += 1;
      if (step >= STEPS) {
        step = 0;
        cycle += 1;
      }
    }
  }, 25);
}

export function stopMusic(): void {
  if (musicTimer) {
    clearInterval(musicTimer);
    musicTimer = null;
  }
  if (musicGain && ctx) {
    const g = musicGain;
    g.gain.cancelScheduledValues(ctx.currentTime);
    g.gain.setValueAtTime(g.gain.value, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
  }
  musicGain = null;
  musicBus = null;
}

export function isMusicOn(): boolean {
  return musicTimer !== null;
}
