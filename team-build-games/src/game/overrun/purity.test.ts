// src/game/overrun/purity.test.ts
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The determinism guard the roadmap demands: no wall-clock or ambient randomness
 * in the sim core. net/ (wire boundary — session mints the seed) and render/
 * (engine adapter) are exempt; test files are exempt.
 */
const CORE_DIR = join(__dirname);
const BANNED = [/Math\.random/, /Date\.now/, /new Date\(/, /performance\.now/];

describe("overrun sim core purity", () => {
  it("contains no clocks or ambient RNG in top-level core files", () => {
    // sandbox*.ts is a dev-only test harness (a stateful driver that implements the render contract),
    // not sim core — exempt like net/ and render/.
    const files = readdirSync(CORE_DIR).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts") && !f.startsWith("sandbox"));
    expect(files.length).toBeGreaterThan(8);
    for (const f of files) {
      const src = readFileSync(join(CORE_DIR, f), "utf8");
      for (const rx of BANNED) {
        expect(src, `${f} must not use ${rx}`).not.toMatch(rx);
      }
    }
  });

  it("core files import nothing from net/ or render/ or engines", () => {
    // sandbox*.ts is a dev-only test harness (a stateful driver that implements the render contract),
    // not sim core — exempt like net/ and render/.
    const files = readdirSync(CORE_DIR).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts") && !f.startsWith("sandbox"));
    for (const f of files) {
      const src = readFileSync(join(CORE_DIR, f), "utf8");
      expect(src, `${f} must stay engine/transport-free`).not.toMatch(/from ["']\.\/(net|render)\//);
      expect(src, `${f} must stay engine/transport-free`).not.toMatch(/from ["']phaser["']/i);
    }
  });

  it("no overrun file — including tests and React components — imports from arena/ or the arena's shared hud/: Arena and Overrun are separate games", () => {
    // Recursively collect all .ts(x) files under overrun/ (net/, render/, tests) AND under the
    // Overrun React components tree (src/components/game/overrun/) — the separation amendment
    // forbids arena reuse from either side.
    const allFiles: string[] = [];
    function walkDir(dir: string, relPath = "") {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        const relFilePath = relPath ? `${relPath}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          walkDir(fullPath, relFilePath);
        } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
          allFiles.push(fullPath);
        }
      }
    }
    walkDir(CORE_DIR);
    const COMPONENTS_DIR = join(CORE_DIR, "../../components/game/overrun");
    walkDir(COMPONENTS_DIR);
    expect(allFiles.length).toBeGreaterThan(8);
    for (const filePath of allFiles) {
      const src = readFileSync(filePath, "utf8");
      const shortName = filePath.replace(CORE_DIR + "/", "");
      expect(src, `${shortName} must not import from arena/`).not.toMatch(/from ["'][^"']*arena/);
      // Overrun's own hud/ subfolder (src/components/game/overrun/hud/) is fine — reached via
      // "./hud/..." from the overrun root. Escaping UP into the arena's shared hud/
      // (src/components/game/hud/, reached via "../hud/...", "../../hud/...", etc.) is the
      // banned arena-HUD-reuse path the separation amendment calls out.
      expect(src, `${shortName} must not import the arena's shared hud/`).not.toMatch(/from ["'][^"']*\.\.\/hud\//);
    }
  });
});
