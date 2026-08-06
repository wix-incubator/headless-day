import { useEffect, useMemo, useRef, useState } from "react";
import {
  ECOSYSTEM_LOGOS,
  logoDisplaySize,
  type EcosystemLogo,
} from "../../lib/ecosystemLogos";
import { usePopSound } from "../../lib/usePopSound";
import styles from "./logoGrid.module.css";

const DESKTOP_TILE = 56;
const DESKTOP_GAP = 316;
/** Center-to-center pitch on desktop (tile + gap). */
const DESKTOP_PITCH = DESKTOP_TILE + DESKTOP_GAP; // 372

const MOBILE_MAX_WIDTH = 767;
/** Logos 10% smaller on mobile. */
const MOBILE_TILE = DESKTOP_TILE * 0.9; // 50.4
/** Center distance 40% shorter → pitch = desktop * 0.6. */
const MOBILE_PITCH = DESKTOP_PITCH * 0.6; // 223.2
const MOBILE_GAP = MOBILE_PITCH - MOBILE_TILE; // 172.8

const SPEED = 12;
const MORPH_DURATION = 900;
const MORPH_MIN_DELAY = 1000;
const MORPH_MAX_DELAY = 2500;
const GRID_COLUMNS = 10;
/** Extra rows/cols of bleed so the drifting track never shows an empty edge. */
const BLEED_CELLS = 3;

type LayoutMetrics = {
  tileSize: number;
  gap: number;
  pitch: number;
  columns: number;
  rows: number;
  tileCount: number;
  /** Track top/left so the grid's geometric center sits under the viewport center. */
  baseTop: number;
  baseLeft: number;
};

type LogoTile = EcosystemLogo & { id: number };

function isMobileViewport(width = typeof window !== "undefined" ? window.innerWidth : 1024) {
  return width <= MOBILE_MAX_WIDTH;
}

function getLayoutMetrics(
  width = typeof window !== "undefined" ? window.innerWidth : 1280,
  height = typeof window !== "undefined" ? window.innerHeight : 800,
): LayoutMetrics {
  const mobile = width <= MOBILE_MAX_WIDTH;
  const tileSize = mobile ? MOBILE_TILE : DESKTOP_TILE;
  const gap = mobile ? MOBILE_GAP : DESKTOP_GAP;
  const pitch = tileSize + gap;

  const columns = GRID_COLUMNS;
  const rowsNeeded = Math.ceil(height / pitch) + BLEED_CELLS * 2;
  const rows = Math.max(rowsNeeded, BLEED_CELLS * 2 + 2);
  const tileCount = columns * rows;

  const gridWidth = columns * tileSize + (columns - 1) * gap;
  const gridHeight = rows * tileSize + (rows - 1) * gap;

  // Pseudo-center: place the endless tile field so its midpoint sits on the viewport midpoint.
  const baseLeft = (width - gridWidth) / 2;
  const baseTop = (height - gridHeight) / 2;

  return { tileSize, gap, pitch, columns, rows, tileCount, baseTop, baseLeft };
}

/** Deterministic PRNG so layout is stable across remounts but still shuffled. */
function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function cellDistance(a: number, b: number, columns: number): number {
  const ar = Math.floor(a / columns);
  const ac = a % columns;
  const br = Math.floor(b / columns);
  const bc = b % columns;
  const dc = Math.min(Math.abs(ac - bc), columns - Math.abs(ac - bc));
  const dr = Math.abs(ar - br);
  return Math.hypot(dc, dr);
}

/**
 * Place logos so each brand's copies are as far from each other as possible,
 * while keeping overall frequency roughly even (pseudo-random / blue-noise).
 */
function buildSpreadTiles(count: number, columns: number, seed = 0x51a7e): LogoTile[] {
  const rand = mulberry32(seed + count * 97);
  const logos = ECOSYSTEM_LOGOS;
  const occupiedBySrc = new Map<string, number[]>();
  const usage = new Map<string, number>();
  const tiles: LogoTile[] = [];

  const targetPerLogo = count / logos.length;

  for (let id = 0; id < count; id++) {
    let best: EcosystemLogo | null = null;
    let bestScore = -Infinity;

    for (const logo of logos) {
      const used = usage.get(logo.src) ?? 0;
      const frequencyPenalty = (used - targetPerLogo) * 2.4;

      const twins = occupiedBySrc.get(logo.src) ?? [];
      let minTwinDist = Infinity;
      for (const twinId of twins) {
        minTwinDist = Math.min(minTwinDist, cellDistance(id, twinId, columns));
      }
      if (minTwinDist === Infinity) minTwinDist = 20;

      const jitter = rand() * 0.35;
      const score = minTwinDist * 3 - frequencyPenalty + jitter;

      if (score > bestScore) {
        bestScore = score;
        best = logo;
      }
    }

    const chosen = best ?? logos[id % logos.length];
    tiles.push({ ...chosen, id });
    usage.set(chosen.src, (usage.get(chosen.src) ?? 0) + 1);
    const list = occupiedBySrc.get(chosen.src) ?? [];
    list.push(id);
    occupiedBySrc.set(chosen.src, list);
  }

  return tiles;
}

/** Pick a replacement logo whose nearest twin is as far as possible from `tileId`. */
function farthestLogo(
  tileId: number,
  columns: number,
  current: LogoTile[],
  excludeSrc?: string,
): EcosystemLogo {
  const occupiedBySrc = new Map<string, number[]>();
  for (const tile of current) {
    if (tile.id === tileId) continue;
    const list = occupiedBySrc.get(tile.src) ?? [];
    list.push(tile.id);
    occupiedBySrc.set(tile.src, list);
  }

  const usage = new Map<string, number>();
  for (const tile of current) {
    if (tile.id === tileId) continue;
    usage.set(tile.src, (usage.get(tile.src) ?? 0) + 1);
  }

  const targetPerLogo = current.length / ECOSYSTEM_LOGOS.length;
  let best: EcosystemLogo | null = null;
  let bestScore = -Infinity;

  for (const logo of ECOSYSTEM_LOGOS) {
    if (logo.src === excludeSrc) continue;
    const twins = occupiedBySrc.get(logo.src) ?? [];
    let minTwinDist = Infinity;
    for (const twinId of twins) {
      minTwinDist = Math.min(minTwinDist, cellDistance(tileId, twinId, columns));
    }
    if (minTwinDist === Infinity) minTwinDist = 20;
    const used = usage.get(logo.src) ?? 0;
    const score = minTwinDist * 3 - (used - targetPerLogo) * 2.4 + Math.random() * 0.35;
    if (score > bestScore) {
      bestScore = score;
      best = logo;
    }
  }

  return best ?? ECOSYSTEM_LOGOS[0];
}

function isProtectedSurface(target: Element | null): boolean {
  return Boolean(
    target?.closest(
      'header, nav, button, a, input, textarea, select, table, [class*="card"], [class*="modal"], [class*="overlay"], [class*="feed"], [class*="list"], [class*="grid"], [class*="hero"], .site-shell__notice',
    ),
  );
}

export function LogoGrid() {
  const layerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const metricsRef = useRef<LayoutMetrics>(getLayoutMetrics());
  // Start mid-period so first paint is not sitting on the wrap seam.
  const offsetRef = useRef({
    x: metricsRef.current.pitch / 2,
    y: metricsRef.current.pitch / 2,
  });

  const [metrics, setMetrics] = useState<LayoutMetrics>(() => getLayoutMetrics());
  const [tiles, setTiles] = useState<LogoTile[]>(() =>
    buildSpreadTiles(getLayoutMetrics().tileCount, GRID_COLUMNS),
  );
  const [morphingId, setMorphingId] = useState<number | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const { play, unlock } = usePopSound();

  useEffect(() => {
    const updateGrid = () => {
      const next = getLayoutMetrics(window.innerWidth, window.innerHeight);
      metricsRef.current = next;
      // Keep drift phase continuous across pitch changes (mobile ↔ desktop).
      offsetRef.current.x = offsetRef.current.x % next.pitch;
      offsetRef.current.y = offsetRef.current.y % next.pitch;
      if (offsetRef.current.x === 0 && offsetRef.current.y === 0) {
        offsetRef.current.x = next.pitch / 2;
        offsetRef.current.y = next.pitch / 2;
      }
      setMetrics(next);
      setTiles(buildSpreadTiles(next.tileCount, GRID_COLUMNS));
    };

    updateGrid();
    window.addEventListener("resize", updateGrid);
    return () => window.removeEventListener("resize", updateGrid);
  }, []);

  useEffect(() => {
    let frame = 0;
    let lastHoveredId: number | null = null;

    const updateHoveredTile = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const tileElements = trackRef.current?.querySelectorAll<HTMLElement>("[data-logo-tile]");
        if (!tileElements) return;

        // Side-zone hover is a desktop affordance; skip on narrow viewports.
        if (isMobileViewport()) {
          setHoveredId(null);
          lastHoveredId = null;
          return;
        }

        const isSideZone =
          event.clientX <= 320 || event.clientX >= window.innerWidth - 320;
        const pointerTarget = document.elementFromPoint(event.clientX, event.clientY);
        if (!isSideZone || isProtectedSurface(pointerTarget)) {
          setHoveredId(null);
          lastHoveredId = null;
          return;
        }

        let nextHoveredId: number | null = null;
        tileElements.forEach((element) => {
          const rect = element.getBoundingClientRect();
          if (
            nextHoveredId === null &&
            event.clientX >= rect.left &&
            event.clientX <= rect.right &&
            event.clientY >= rect.top &&
            event.clientY <= rect.bottom
          ) {
            nextHoveredId = Number(element.dataset.logoTile);
          }
        });

        setHoveredId(nextHoveredId);
        if (nextHoveredId !== null && nextHoveredId !== lastHoveredId) {
          play();
        }
        lastHoveredId = nextHoveredId;
      });
    };

    window.addEventListener("pointermove", updateHoveredTile, { passive: true });
    window.addEventListener("pointerdown", unlock, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", updateHoveredTile);
      window.removeEventListener("pointerdown", unlock);
    };
  }, [play, unlock]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animationFrame = 0;
    let lastTime = performance.now();
    let reducedMotion = mediaQuery.matches;

    const handlePreferenceChange = (event: MediaQueryListEvent) => {
      reducedMotion = event.matches;
    };
    mediaQuery.addEventListener("change", handlePreferenceChange);

    const animate = (time: number) => {
      const elapsed = Math.min(time - lastTime, 80);
      lastTime = time;
      const { pitch } = metricsRef.current;
      if (!reducedMotion && trackRef.current) {
        const distance = SPEED * (elapsed / 1000);
        offsetRef.current.x = (offsetRef.current.x + distance) % pitch;
        offsetRef.current.y = (offsetRef.current.y + distance) % pitch;
        trackRef.current.style.transform = `translate3d(${offsetRef.current.x}px, ${offsetRef.current.y}px, 0)`;
      }
      animationFrame = requestAnimationFrame(animate);
    };

    // Apply initial mid-period offset immediately (before first rAF).
    if (trackRef.current) {
      trackRef.current.style.transform = `translate3d(${offsetRef.current.x}px, ${offsetRef.current.y}px, 0)`;
    }

    animationFrame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(animationFrame);
      mediaQuery.removeEventListener("change", handlePreferenceChange);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let nextTimer = 0;

    const scheduleMorph = () => {
      const delay =
        MORPH_MIN_DELAY + Math.random() * (MORPH_MAX_DELAY - MORPH_MIN_DELAY);
      nextTimer = window.setTimeout(() => {
        if (cancelled || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          scheduleMorph();
          return;
        }

        setTiles((current) => {
          if (!current.length) return current;
          const tile = current[Math.floor(Math.random() * current.length)];
          setMorphingId(tile.id);
          window.setTimeout(() => {
            if (cancelled) return;
            setTiles((latest) =>
              latest.map((item) =>
                item.id === tile.id
                  ? { ...farthestLogo(item.id, GRID_COLUMNS, latest, item.src), id: item.id }
                  : item,
              ),
            );
          }, MORPH_DURATION / 2);
          window.setTimeout(() => {
            if (!cancelled) {
              setMorphingId(null);
              scheduleMorph();
            }
          }, MORPH_DURATION);
          return current;
        });
      }, delay);
    };

    scheduleMorph();
    return () => {
      cancelled = true;
      window.clearTimeout(nextTimer);
    };
  }, []);

  const tileStyle = useMemo(
    () => ({ width: metrics.tileSize, height: metrics.tileSize }),
    [metrics.tileSize],
  );

  return (
    <div ref={layerRef} className={styles.layer} aria-hidden="true">
      <div
        ref={trackRef}
        className={styles.track}
        style={{
          top: metrics.baseTop,
          left: metrics.baseLeft,
          gridTemplateColumns: `repeat(${metrics.columns}, ${metrics.tileSize}px)`,
          gridTemplateRows: `repeat(${metrics.rows}, ${metrics.tileSize}px)`,
          gap: `${metrics.gap}px`,
          transform: `translate3d(${offsetRef.current.x}px, ${offsetRef.current.y}px, 0)`,
        }}
      >
        {tiles.map((tile) => {
          const size = logoDisplaySize(tile.aspectRatio, metrics.tileSize);
          return (
            <div
              className={`${styles.tile} ${morphingId === tile.id ? styles.morphing : ""} ${hoveredId === tile.id ? styles.hovered : ""}`}
              key={tile.id}
              data-logo-tile={tile.id}
              style={tileStyle}
            >
              <img
                src={tile.src}
                alt=""
                loading="eager"
                decoding="async"
                style={{ width: size.width, height: size.height }}
                onError={(event) => {
                  event.currentTarget.style.visibility = "hidden";
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
