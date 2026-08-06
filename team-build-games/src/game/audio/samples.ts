type SampleAudio = Pick<
  HTMLAudioElement,
  "currentTime" | "pause" | "play" | "preload" | "volume"
>;

export type AudioSampleRuntime = {
  createAudio: (url: string) => SampleAudio;
};

export type AudioSampleSources = Record<string, readonly string[]>;

const browserRuntime = (): AudioSampleRuntime => ({
  createAudio: (url) => new Audio(url),
});

interface SampleEntry {
  variants: SampleAudio[][];
  cursor: number;
}

/** Small overlapping HTMLAudio pools for Wix-hosted gameplay samples. */
export class AudioSampleBank {
  private readonly entries: Record<string, SampleEntry> = {};
  private unlocked = false;

  constructor(sources: AudioSampleSources, runtime = browserRuntime(), voicesPerVariant = 2) {
    for (const [name, urls] of Object.entries(sources)) {
      if (urls.length === 0) continue;
      this.entries[name] = {
        variants: urls.map((url) =>
          Array.from({ length: voicesPerVariant }, () => {
            const audio = runtime.createAudio(url);
            audio.preload = "auto";
            audio.volume = 0;
            return audio;
          }),
        ),
        cursor: 0,
      };
    }
  }

  /** Gate samples until the page has received a real user gesture. */
  unlock(): void {
    this.unlocked = true;
  }

  play(name: string, volume = 0.45): boolean {
    const entry = this.entries[name];
    if (!this.unlocked || !entry) return false;

    const variantIndex = entry.cursor % entry.variants.length;
    const voices = entry.variants[variantIndex]!;
    const voiceIndex = Math.floor(entry.cursor / entry.variants.length) % voices.length;
    const audio = voices[voiceIndex]!;
    entry.cursor += 1;

    try {
      audio.pause();
      audio.currentTime = 0;
      audio.volume = Math.max(0, Math.min(1, volume));
      void audio.play().catch(() => undefined);
      return true;
    } catch {
      return false;
    }
  }

  destroy(): void {
    for (const entry of Object.values(this.entries)) {
      for (const voices of entry.variants) {
        for (const audio of voices) {
          audio.pause();
          audio.currentTime = 0;
          audio.volume = 0;
        }
      }
    }
    this.unlocked = false;
  }
}
