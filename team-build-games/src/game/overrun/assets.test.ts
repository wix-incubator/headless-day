import { describe, expect, it } from "vitest";
import { parseOverrunAssetManifest } from "./assets";

const url = (name: string) => `https://static.wixstatic.com/media/${name}.webp`;
const three = (name: string) => [url(`${name}-1`), url(`${name}-2`), url(`${name}-3`)];

function fixture() {
  return {
    version: 1,
    music: { lobby: url("lobby"), battle: url("battle") },
    sfx: {
      shots: { pistol: three("pistol"), shotgun: three("shotgun"), rifle: three("rifle") },
      reload: { pistol: [url("rp")], shotgun: [url("rs")], rifle: [url("rr")] },
      enemyHit: three("enemy-hit"),
      playerHit: three("player-hit"),
      weaponPickup: [url("weapon-pickup")],
      medkitPickup: [url("medkit-pickup")],
      levelUp: [url("level-up")],
    },
    visuals: {
      terrain: Array.from({ length: 5 }, (_, index) => ({ name: `terrain-${index}`, url: url(`terrain-${index}`) })),
      player: { idle: url("idle"), run: [url("run-a"), url("run-b")], downed: url("downed") },
      weapons: { pistol: url("wp"), shotgun: url("ws"), rifle: url("wr") },
      enemies: {
        rusher: { alive: three("ra"), dead: three("rd") },
        tank: { alive: three("ta"), dead: three("td") },
      },
    },
  };
}

describe("parseOverrunAssetManifest", () => {
  it("accepts the complete versioned asset contract", () => {
    const manifest = parseOverrunAssetManifest(fixture());

    expect(manifest.visuals.terrain).toHaveLength(5);
    expect(manifest.sfx.shots.shotgun).toHaveLength(3);
    expect(manifest.visuals.enemies.tank!.dead).toHaveLength(3);
  });

  it("rejects an incomplete variant bank", () => {
    const value = fixture();
    value.sfx.shots.pistol.pop();

    expect(() => parseOverrunAssetManifest(value)).toThrow("must contain 3 URLs");
  });

  it("rejects insecure media URLs", () => {
    const value = fixture();
    value.music.lobby = "http://example.com/lobby.wav";

    expect(() => parseOverrunAssetManifest(value)).toThrow("must use HTTPS");
  });
});
