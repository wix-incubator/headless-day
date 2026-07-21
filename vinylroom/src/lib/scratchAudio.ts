type AudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

export class ScratchAudioEngine {
  private context: AudioContext | null = null;
  private buffer: AudioBuffer | null = null;
  private reverseBuffer: AudioBuffer | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private masterGain: GainNode | null = null;
  private loading: Promise<AudioBuffer | null> | null = null;
  private activeSources = new Set<AudioScheduledSourceNode>();
  private lastPlayAt = 0;
  private nextOffset = 0;
  private smoothedIntensity = 0;

  constructor(private readonly src: string) {}

  preload() {
    void this.load();
  }

  async arm() {
    const context = this.getContext();
    if (!context) return;

    if (context.state === "suspended") {
      await context.resume().catch(() => {});
    }

    this.openOutput(context.currentTime);

    void this.load();
  }

  async play(delta: number, elapsed: number, volume: number) {
    const context = this.getContext();
    if (!context) return;

    if (context.state === "suspended") {
      await context.resume().catch(() => {});
    }

    const buffer = this.buffer ?? (await this.load());
    if (!buffer) return;

    const now = context.currentTime;
    if (now - this.lastPlayAt < 0.026) return;
    this.lastPlayAt = now;
    this.openOutput(now);

    const rawIntensity = Math.min(Math.max(Math.abs(delta) / Math.max(elapsed, 16), 0.05), 1.9);
    this.smoothedIntensity = this.smoothedIntensity * 0.58 + rawIntensity * 0.42;
    const intensity = this.smoothedIntensity;
    const duration = Math.min(0.075 + intensity * 0.07, 0.19);
    const selectedBuffer = delta < 0 ? this.reverseBuffer ?? buffer : buffer;
    const maxOffset = Math.max(selectedBuffer.duration - duration - 0.02, 0);
    this.nextOffset = maxOffset
      ? (this.nextOffset + 0.026 + intensity * 0.021 + Math.random() * 0.012) % maxOffset
      : 0;

    const source = context.createBufferSource();
    const highpass = context.createBiquadFilter();
    const lowpass = context.createBiquadFilter();
    const panner = context.createStereoPanner();
    const gain = context.createGain();
    source.buffer = selectedBuffer;
    source.playbackRate.value = Math.min(0.68 + intensity * 0.82, 1.95);

    highpass.type = "highpass";
    highpass.frequency.value = 72;
    highpass.Q.value = 0.55;
    lowpass.type = "lowpass";
    lowpass.frequency.value = Math.min(3600 + intensity * 1900, 6800);
    lowpass.Q.value = 0.7;
    panner.pan.value = delta < 0 ? -0.08 : 0.08;

    const level = Math.min(volume * 0.72, 0.58);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(level, 0.022), now + 0.009);
    gain.gain.setValueAtTime(Math.max(level * 0.82, 0.018), now + duration * 0.48);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    source.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(panner);
    panner.connect(gain);
    gain.connect(this.masterGain ?? context.destination);
    this.trackSource(source);
    source.start(now, this.nextOffset, duration);
    source.stop(now + duration + 0.02);

    this.playFriction(context, now, duration, intensity, delta);
  }

  stop() {
    const context = this.context;
    const masterGain = this.masterGain;
    if (context && masterGain) {
      const now = context.currentTime;
      masterGain.gain.cancelScheduledValues(now);
      masterGain.gain.setValueAtTime(Math.max(masterGain.gain.value, 0.001), now);
      masterGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

      for (const source of this.activeSources) {
        try {
          source.stop(now + 0.05);
        } catch {
          // The source may have naturally ended between pointer events.
        }
      }
    }

    this.activeSources.clear();
    this.lastPlayAt = 0;
    this.smoothedIntensity = 0;
  }

  private async load() {
    if (this.buffer) return this.buffer;
    if (this.loading) return this.loading;

    const context = this.getContext();
    if (!context) return null;

    this.loading = fetch(this.src)
      .then((response) => response.arrayBuffer())
      .then((data) => context.decodeAudioData(data))
      .then((buffer) => {
        this.buffer = buffer;
        this.reverseBuffer = this.createReverseBuffer(context, buffer);
        return buffer;
      })
      .catch(() => null)
      .finally(() => {
        this.loading = null;
      });

    return this.loading;
  }

  private getContext() {
    if (this.context) return this.context;
    const AudioContextCtor =
      window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
    if (!AudioContextCtor) return null;
    this.context = new AudioContextCtor();
    this.noiseBuffer = this.createNoiseBuffer(this.context);
    const masterGain = this.context.createGain();
    const compressor = this.context.createDynamicsCompressor();
    const outputFilter = this.context.createBiquadFilter();

    masterGain.gain.value = 0.001;
    outputFilter.type = "lowpass";
    outputFilter.frequency.value = 7600;
    outputFilter.Q.value = 0.45;
    compressor.threshold.value = -20;
    compressor.knee.value = 18;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.12;

    masterGain.connect(outputFilter);
    outputFilter.connect(compressor);
    compressor.connect(this.context.destination);
    this.masterGain = masterGain;
    return this.context;
  }

  private playFriction(context: AudioContext, now: number, duration: number, intensity: number, delta: number) {
    const noiseBuffer = this.noiseBuffer ?? this.createNoiseBuffer(context);
    this.noiseBuffer = noiseBuffer;

    const noise = context.createBufferSource();
    const noiseGain = context.createGain();
    const filter = context.createBiquadFilter();
    const body = context.createOscillator();
    const bodyGain = context.createGain();

    noise.buffer = noiseBuffer;
    noise.loop = true;
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1050 + intensity * 1250, now);
    filter.frequency.exponentialRampToValueAtTime(1500 + intensity * 1850, now + duration);
    filter.Q.setValueAtTime(0.65 + intensity * 1.45, now);

    const hiss = Math.min(0.008 + intensity * 0.032, 0.058);
    noiseGain.gain.setValueAtTime(0.001, now);
    noiseGain.gain.exponentialRampToValueAtTime(hiss, now + 0.006);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.9);

    body.type = "triangle";
    body.frequency.setValueAtTime(delta < 0 ? 62 : 78, now);
    body.frequency.exponentialRampToValueAtTime(delta < 0 ? 48 : 108, now + duration);
    bodyGain.gain.setValueAtTime(0.001, now);
    bodyGain.gain.exponentialRampToValueAtTime(Math.min(0.008 + intensity * 0.012, 0.026), now + 0.01);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain ?? context.destination);
    body.connect(bodyGain);
    bodyGain.connect(this.masterGain ?? context.destination);
    this.trackSource(noise);
    this.trackSource(body);

    noise.start(now);
    noise.stop(now + duration);
    body.start(now);
    body.stop(now + duration);
  }

  private openOutput(now: number) {
    const masterGain = this.masterGain;
    if (!masterGain) return;
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(Math.max(masterGain.gain.value, 0.001), now);
    masterGain.gain.exponentialRampToValueAtTime(0.92, now + 0.018);
  }

  private trackSource(source: AudioScheduledSourceNode) {
    this.activeSources.add(source);
    source.addEventListener("ended", () => this.activeSources.delete(source), { once: true });
  }

  private createNoiseBuffer(context: AudioContext) {
    const length = Math.max(1, Math.floor(context.sampleRate * 0.32));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    let previous = 0;
    for (let index = 0; index < length; index += 1) {
      const white = Math.random() * 2 - 1;
      previous = previous * 0.82 + white * 0.18;
      data[index] = previous;
    }
    return buffer;
  }

  private createReverseBuffer(context: AudioContext, source: AudioBuffer) {
    const reversed = context.createBuffer(source.numberOfChannels, source.length, source.sampleRate);
    for (let channel = 0; channel < source.numberOfChannels; channel += 1) {
      const input = source.getChannelData(channel);
      const output = reversed.getChannelData(channel);
      for (let index = 0, last = input.length - 1; index < input.length; index += 1) {
        output[index] = input[last - index];
      }
    }
    return reversed;
  }
}
