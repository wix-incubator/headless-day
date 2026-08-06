import { describe, expect, it } from "vitest";
import { AudioSampleBank, type AudioSampleRuntime } from "./samples";

class FakeAudio {
  currentTime = 12;
  pauseCalls = 0;
  playCalls = 0;
  preload: "" | "auto" | "metadata" | "none" = "";
  volume = 1;

  pause(): void {
    this.pauseCalls += 1;
  }

  play(): Promise<void> {
    this.playCalls += 1;
    return Promise.resolve();
  }
}

function setup() {
  const audio: FakeAudio[] = [];
  const runtime: AudioSampleRuntime = {
    createAudio: () => {
      const item = new FakeAudio();
      audio.push(item);
      return item;
    },
  };
  const bank = new AudioSampleBank({ shot: ["one.wav", "two.wav", "three.wav"] }, runtime, 2);
  return { audio, bank };
}

describe("AudioSampleBank", () => {
  it("preloads pooled voices and stays silent before unlock", () => {
    const { audio, bank } = setup();

    expect(audio).toHaveLength(6);
    expect(audio.every((item) => item.preload === "auto" && item.volume === 0)).toBe(true);
    expect(bank.play("shot")).toBe(false);
    expect(audio.every((item) => item.playCalls === 0)).toBe(true);
  });

  it("cycles variants and restarts voices so rapid samples can overlap", () => {
    const { audio, bank } = setup();
    bank.unlock();

    expect(bank.play("shot", 0.4)).toBe(true);
    expect(bank.play("shot", 0.5)).toBe(true);
    expect(bank.play("shot", 0.6)).toBe(true);
    expect(bank.play("shot", 0.7)).toBe(true);

    expect(audio[0]!.playCalls).toBe(1);
    expect(audio[2]!.playCalls).toBe(1);
    expect(audio[4]!.playCalls).toBe(1);
    expect(audio[1]!.playCalls).toBe(1);
    expect(audio[1]!.currentTime).toBe(0);
    expect(audio[1]!.volume).toBe(0.7);
  });

  it("stops and clears every voice on destroy", () => {
    const { audio, bank } = setup();
    bank.unlock();
    bank.play("shot");

    bank.destroy();

    expect(audio.every((item) => item.pauseCalls >= 1 && item.currentTime === 0 && item.volume === 0)).toBe(true);
  });
});
