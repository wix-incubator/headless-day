import { describe, expect, it } from "vitest";
import { ArenaMusic, type ArenaMusicRuntime } from "./music";

class FakeTrack {
  currentTime = 0;
  loop = false;
  paused = true;
  preload: "" | "auto" | "metadata" | "none" = "";
  volume = 1;
  playCalls = 0;
  pauseCalls = 0;

  play(): Promise<void> {
    this.playCalls += 1;
    this.paused = false;
    return Promise.resolve();
  }

  pause(): void {
    this.pauseCalls += 1;
    this.paused = true;
  }
}

function setup() {
  const tracks: FakeTrack[] = [];
  const frames = new Map<number, FrameRequestCallback>();
  let nextFrame = 1;
  let now = 0;
  const runtime: ArenaMusicRuntime = {
    createAudio: () => {
      const track = new FakeTrack();
      tracks.push(track);
      return track;
    },
    requestFrame: (callback) => {
      const handle = nextFrame++;
      frames.set(handle, callback);
      return handle;
    },
    cancelFrame: (handle) => {
      frames.delete(handle);
    },
    now: () => now,
  };
  const runFrame = (timestamp: number) => {
    now = timestamp;
    const entry = frames.entries().next().value as [number, FrameRequestCallback] | undefined;
    if (!entry) throw new Error("No animation frame queued");
    frames.delete(entry[0]);
    entry[1](timestamp);
  };

  return {
    music: new ArenaMusic({ lobby: "lobby.wav", battle: "battle.wav" }, runtime, 100),
    tracks,
    runFrame,
  };
}

describe("ArenaMusic", () => {
  it("preloads looping tracks without playing before a user gesture", () => {
    const { music, tracks } = setup();

    music.setScene("battle");

    expect(tracks).toHaveLength(2);
    expect(tracks.every((track) => track.loop && track.preload === "auto")).toBe(true);
    expect(tracks.every((track) => track.playCalls === 0 && track.volume === 0)).toBe(true);
  });

  it("starts the desired scene on unlock and crossfades when the scene changes", () => {
    const { music, tracks, runFrame } = setup();
    const [lobby, battle] = tracks;

    music.setScene("battle");
    music.unlock();
    expect(battle.playCalls).toBe(1);
    expect(lobby.playCalls).toBe(0);
    runFrame(100);
    expect(battle.volume).toBeCloseTo(0.2);

    music.setScene("lobby");
    expect(lobby.playCalls).toBe(1);
    runFrame(150);
    expect(lobby.volume).toBeCloseTo(0.08);
    expect(battle.volume).toBeCloseTo(0.1);
    runFrame(200);
    expect(lobby.volume).toBeCloseTo(0.16);
    expect(battle.paused).toBe(true);
    expect(battle.currentTime).toBe(0);
  });

  it("pauses both tracks when destroyed", () => {
    const { music, tracks } = setup();

    music.unlock();
    music.destroy();

    expect(tracks.every((track) => track.paused && track.volume === 0)).toBe(true);
  });
});
