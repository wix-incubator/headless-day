import { defineConfig } from "vitest/config";

/**
 * Tests are grouped PER GAME / area so each can run in isolation:
 *   npm test              → every main-tree suite
 *   npm run test:arena    → Arena (sim + netcode) only
 *   npm run test:members  → members-area helpers only
 *   npm run test:merch    → merch/print helpers only
 *   npm run test:squid    → Squid (sim + net + score helpers) only
 *   npm run test:road     → Road Madness sim only
 *
 * `exclude` drops build output, deps, and — importantly — git worktrees under `.claude/worktrees/*`.
 * Those hold OTHER branches' full checkouts; without this, a `vitest run`
 * from the main tree also executes those branches' suites and reports their WIP failures here.
 */
const exclude = ["**/node_modules/**", "**/dist/**", "**/.astro/**", "**/.claude/**", "**/.git/**"];

export default defineConfig({
  test: {
    exclude,
    projects: [
      {
        test: {
          name: "arena",
          environment: "node",
          exclude,
          include: ["src/game/arena/**/*.test.ts", "src/game/net/**/*.test.ts", "src/game/audio/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "members",
          environment: "node",
          exclude,
          include: ["src/lib/members/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "merch",
          environment: "node",
          exclude,
          include: ["src/lib/merch/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "overrun",
          environment: "node",
          exclude,
          include: ["src/game/overrun/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "squid",
          environment: "node",
          exclude,
          include: ["src/game/squid/**/*.test.ts", "src/lib/squid/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "road-madness",
          environment: "node",
          exclude,
          include: ["src/game/road-madness/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "rtlab",
          environment: "node",
          exclude,
          include: ["src/lib/rtlab/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "signal",
          environment: "node",
          exclude,
          include: ["src/lib/signal/**/*.test.ts"],
        },
      },
    ],
  },
});
