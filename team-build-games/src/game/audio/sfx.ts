/**
 * Tiny Web Audio SFX engine — pure oscillator/noise synthesis, no binary assets.
 * One shared AudioContext, unlocked on the first user gesture (call `resume()` from a click).
 */

export type SfxName =
  | "dash"
  | "attack"
  | "block"
  | "hit"
  | "tik"
  | "go"
  | "gameover"
  | "win"
  | "join"
  | "shoot"
  | "hurt"
  | "reload";

type Ctx = AudioContext;

export class Sfx {
  private ctx: Ctx | null = null;
  private master: GainNode | null = null;
  private enabled = true;

  /** Must be called inside a user gesture (Start click) to satisfy autoplay policy. */
  resume(): void {
    if (!this.ctx) {
      const AC: typeof AudioContext =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.22;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
  }

  play(name: SfxName): void {
    if (!this.ctx || !this.master || !this.enabled) return;
    const t = this.ctx.currentTime;
    switch (name) {
      case "tik":
        this.tone(440, t, 0.08, "square", 0.7);
        break;
      case "go":
        this.tone(880, t, 0.22, "square", 0.8);
        break;
      case "dash":
        this.tone(200, t, 0.16, "sawtooth", 0.5, 760);
        this.noise(t, 0.12, 0.25, 1200);
        break;
      case "attack":
        this.noise(t, 0.12, 0.5, 1600);
        this.tone(1200, t, 0.05, "square", 0.25);
        break;
      case "block":
        // Metallic fallback for the hosted block-impact sample.
        this.tone(1680, t, 0.12, "square", 0.42, 760);
        this.tone(2380, t + 0.012, 0.08, "triangle", 0.3, 1100);
        this.noise(t, 0.1, 0.18, 1900);
        break;
      case "hit":
        this.tone(220, t, 0.13, "square", 0.85, 70);
        break;
      case "gameover":
        this.melody(t, [523, 440, 349, 262], "sawtooth", 0.16);
        break;
      case "win":
        this.melody(t, [392, 523, 659, 784], "square", 0.14);
        break;
      case "join":
        // short, friendly two-note rise: someone entered the room
        this.melody(t, [660, 988], "square", 0.09);
        break;
      case "shoot":
        // bow twang: a quick downward pitch slide + a soft string noise
        this.tone(720, t, 0.12, "triangle", 0.5, 240);
        this.noise(t, 0.06, 0.18, 2200);
        break;
      case "hurt":
        // low short thud — deliberately lower/duller than "hit" so a player getting
        // clipped reads differently from a bullet landing on an enemy.
        this.tone(110, t, 0.11, "sawtooth", 0.9, 45);
        this.noise(t, 0.07, 0.3, 280);
        break;
      case "reload":
        // two quick mechanical clicks ~60ms apart (mag-out / mag-in)
        this.tone(950, t, 0.03, "square", 0.5);
        this.tone(950, t + 0.06, 0.03, "square", 0.5);
        break;
    }
  }

  private tone(
    freq: number,
    start: number,
    dur: number,
    type: OscillatorType,
    gain: number,
    slideTo?: number,
  ): void {
    if (!this.ctx || !this.master) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, start);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, start + dur);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(gain, start + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g).connect(this.master);
    o.start(start);
    o.stop(start + dur + 0.03);
  }

  private noise(
    start: number,
    dur: number,
    gain: number,
    centerFreq: number,
  ): void {
    if (!this.ctx || !this.master) return;
    const frames = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    // deterministic-ish noise without Math.random dependency concerns (audio only)
    for (let i = 0; i < frames; i++)
      data[i] = ((i * 1103515245 + 12345) & 0x7fffffff) / 0x3fffffff - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = centerFreq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(gain, start + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    src.connect(filter).connect(g).connect(this.master);
    src.start(start);
    src.stop(start + dur + 0.02);
  }

  private melody(
    start: number,
    freqs: number[],
    type: OscillatorType,
    step: number,
  ): void {
    freqs.forEach((f, i) =>
      this.tone(f, start + i * step, step * 1.1, type, 0.6),
    );
  }
}
