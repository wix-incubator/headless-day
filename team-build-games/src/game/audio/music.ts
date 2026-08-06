export type ArenaMusicScene = "lobby" | "battle";

type MusicTrack = Pick<
  HTMLAudioElement,
  "currentTime" | "loop" | "pause" | "paused" | "play" | "preload" | "volume"
>;

export type ArenaMusicRuntime = {
  createAudio: (url: string) => MusicTrack;
  requestFrame: (callback: FrameRequestCallback) => number;
  cancelFrame: (handle: number) => void;
  now: () => number;
};

export type ArenaMusicUrls = Record<ArenaMusicScene, string>;

const TARGET_VOLUME: Record<ArenaMusicScene, number> = {
  lobby: 0.16,
  battle: 0.2,
};

const browserRuntime = (): ArenaMusicRuntime => ({
  createAudio: (url) => new Audio(url),
  requestFrame: (callback) => window.requestAnimationFrame(callback),
  cancelFrame: (handle) => window.cancelAnimationFrame(handle),
  now: () => performance.now(),
});

/** Looping Wix-hosted music with a gesture-gated crossfade between room and match. */
export class ArenaMusic {
  private readonly tracks: Record<ArenaMusicScene, MusicTrack>;
  private readonly runtime: ArenaMusicRuntime;
  private readonly fadeMs: number;
  private desired: ArenaMusicScene = "lobby";
  private active: ArenaMusicScene | null = null;
  private unlocked = false;
  private frame: number | null = null;

  constructor(urls: ArenaMusicUrls, runtime = browserRuntime(), fadeMs = 850) {
    this.runtime = runtime;
    this.fadeMs = fadeMs;
    this.tracks = {
      lobby: runtime.createAudio(urls.lobby),
      battle: runtime.createAudio(urls.battle),
    };

    for (const track of Object.values(this.tracks)) {
      track.loop = true;
      track.preload = "auto";
      track.volume = 0;
    }
  }

  setScene(scene: ArenaMusicScene): void {
    this.desired = scene;
    if (this.unlocked && (this.active !== scene || this.tracks[scene].paused)) {
      this.transitionTo(scene);
    }
  }

  /** Call from a pointer or keyboard event to satisfy browser autoplay rules. */
  unlock(): void {
    this.unlocked = true;
    if (this.active !== this.desired || this.tracks[this.desired].paused) {
      this.transitionTo(this.desired);
    }
  }

  destroy(): void {
    this.cancelFade();
    for (const track of Object.values(this.tracks)) {
      track.pause();
      track.volume = 0;
    }
    this.active = null;
    this.unlocked = false;
  }

  private transitionTo(scene: ArenaMusicScene): void {
    this.cancelFade();

    const incoming = this.tracks[scene];
    const outgoingScene = this.active !== scene ? this.active : null;
    const outgoing = outgoingScene ? this.tracks[outgoingScene] : null;
    const incomingStart = incoming.volume;
    const outgoingStart = outgoing?.volume ?? 0;
    const startedAt = this.runtime.now();

    try {
      void incoming.play().catch(() => undefined);
    } catch {
      // A later user gesture can retry if a browser rejects playback synchronously.
    }
    this.active = scene;

    const finish = () => {
      incoming.volume = TARGET_VOLUME[scene];
      if (outgoing) {
        outgoing.volume = 0;
        outgoing.pause();
        outgoing.currentTime = 0;
      }
      this.frame = null;
    };

    if (this.fadeMs <= 0) {
      finish();
      return;
    }

    const tick: FrameRequestCallback = (timestamp) => {
      const progress = Math.min(1, Math.max(0, (timestamp - startedAt) / this.fadeMs));
      incoming.volume = incomingStart + (TARGET_VOLUME[scene] - incomingStart) * progress;
      if (outgoing) outgoing.volume = outgoingStart * (1 - progress);

      if (progress >= 1) finish();
      else this.frame = this.runtime.requestFrame(tick);
    };
    this.frame = this.runtime.requestFrame(tick);
  }

  private cancelFade(): void {
    if (this.frame === null) return;
    this.runtime.cancelFrame(this.frame);
    this.frame = null;
  }
}
