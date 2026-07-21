import * as THREE from "three";
import type { StoryboardMeta } from "./types";

export const THUMB_ASPECT = 16 / 9;
export const WINDOW_W = 0.62;
export const WINDOW_H = 0.4;
export const CROP_REPEAT_X = WINDOW_W / WINDOW_H / THUMB_ASPECT;

/** One shared per-video appearance for all of that video's windows. */
export interface TilePresentation {
  material: THREE.Material;
  /** ranked quality so an upgrade never replaces something better */
  tier: "thumb" | "storyboard" | "motion";
  update(delta: number): void;
  dispose(): void;
}

/** Static cropped thumbnail — the initial state. */
export function makeThumbPresentation(cropped: THREE.Texture): TilePresentation {
  const material = new THREE.MeshBasicMaterial({ map: cropped });
  return {
    material,
    tier: "thumb",
    update() {},
    dispose() {
      material.dispose(); // texture is owned by the thumbnail cache
    },
  };
}

interface AtlasGrid {
  texture: THREE.Texture;
  cols: number;
  rows: number;
  frames: number;
}

function frameOffset(grid: AtlasGrid, frame: number, out: THREE.Vector2) {
  const cellW = 1 / grid.cols;
  const cellH = 1 / grid.rows;
  out.set(
    (frame % grid.cols) * cellW + (cellW * (1 - CROP_REPEAT_X)) / 2,
    1 - cellH * (Math.floor(frame / grid.cols) + 1),
  );
}

/**
 * Real-motion preview: an atlas of consecutive frames (decoded from the
 * an_webp hover preview) played at its natural framerate.
 */
export function makeMotionPresentation(
  grid: AtlasGrid,
  fps: number,
): TilePresentation {
  const material = new THREE.MeshBasicMaterial({ map: grid.texture });
  grid.texture.repeat.set(CROP_REPEAT_X / grid.cols, 1 / grid.rows);
  let frame = Math.floor(Math.random() * grid.frames);
  let acc = Math.random() / fps;
  frameOffset(grid, frame, grid.texture.offset);
  return {
    material,
    tier: "motion",
    update(delta) {
      acc += delta;
      const step = 1 / fps;
      if (acc >= step) {
        frame = (frame + Math.floor(acc / step)) % grid.frames;
        acc %= step;
        frameOffset(grid, frame, grid.texture.offset);
      }
    },
    dispose() {
      material.dispose();
      grid.texture.dispose();
    },
  };
}

/**
 * Storyboard presentation: frames are ~2s apart in the source video, so hard
 * cuts read as either sped-up or laggy. Instead each frame holds, then
 * dissolves into the next — a slow cinematic slideshow.
 */
export function makeStoryboardPresentation(
  texture: THREE.Texture,
  meta: StoryboardMeta,
): TilePresentation {
  const grid: AtlasGrid = {
    texture,
    cols: meta.cols,
    rows: meta.rows,
    frames: Math.max(1, meta.frames),
  };
  const repeat = new THREE.Vector2(CROP_REPEAT_X / grid.cols, 1 / grid.rows);
  const offA = new THREE.Vector2();
  const offB = new THREE.Vector2();
  let frame = Math.floor(Math.random() * grid.frames);
  frameOffset(grid, frame, offA);
  frameOffset(grid, (frame + 1) % grid.frames, offB);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: texture },
      uRepeat: { value: repeat },
      uOffA: { value: offA },
      uOffB: { value: offB },
      uMix: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform vec2 uRepeat, uOffA, uOffB;
      uniform float uMix;
      varying vec2 vUv;
      void main() {
        vec4 a = texture2D(uMap, vUv * uRepeat + uOffA);
        vec4 b = texture2D(uMap, vUv * uRepeat + uOffB);
        gl_FragColor = mix(a, b, uMix);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });

  const FADE_SECONDS = 0.6;
  let holding = true;
  let t = Math.random() * 1.5; // desynchronize tiles
  let holdSeconds = 1.3 + Math.random() * 0.9;

  return {
    material,
    tier: "storyboard",
    update(delta) {
      t += delta;
      if (holding) {
        if (t >= holdSeconds) {
          holding = false;
          t = 0;
        }
      } else if (t >= FADE_SECONDS) {
        frame = (frame + 1) % grid.frames;
        frameOffset(grid, frame, offA);
        frameOffset(grid, (frame + 1) % grid.frames, offB);
        material.uniforms.uMix.value = 0;
        holding = true;
        t = 0;
        holdSeconds = 1.3 + Math.random() * 0.9;
      } else {
        const k = t / FADE_SECONDS;
        material.uniforms.uMix.value = k * k * (3 - 2 * k); // smoothstep
      }
    },
    dispose() {
      material.dispose();
      texture.dispose();
    },
  };
}

/**
 * Decode an an_webp motion preview into a 160x90-cell atlas canvas.
 * Returns null when unsupported (no ImageDecoder) or on any failure.
 */
export async function buildMotionAtlas(
  videoId: string,
): Promise<{ grid: AtlasGrid; fps: number } | null> {
  try {
    const ImageDecoderCtor = (window as any).ImageDecoder;
    if (
      !ImageDecoderCtor ||
      !(await ImageDecoderCtor.isTypeSupported("image/webp"))
    ) {
      return null;
    }
    const res = await fetch(`/api/motion-preview?v=${videoId}`);
    if (!res.ok) return null;
    const data = await res.arrayBuffer();
    const decoder = new ImageDecoderCtor({ data, type: "image/webp" });
    await decoder.tracks.ready;
    await decoder.completed;
    const frames = Math.min(decoder.tracks.selectedTrack?.frameCount ?? 0, 36);
    if (frames < 4) {
      decoder.close();
      return null;
    }
    const cols = 6;
    const rows = Math.ceil(frames / cols);
    const cellW = 160;
    const cellH = 90;
    const canvas = document.createElement("canvas");
    canvas.width = cols * cellW;
    canvas.height = rows * cellH;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      decoder.close();
      return null;
    }
    let totalUs = 0;
    for (let i = 0; i < frames; i++) {
      const { image } = await decoder.decode({ frameIndex: i });
      totalUs += image.duration ?? 100_000;
      ctx.drawImage(
        image,
        (i % cols) * cellW,
        Math.floor(i / cols) * cellH,
        cellW,
        cellH,
      );
      image.close();
    }
    decoder.close();
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    const fps = Math.min(15, Math.max(5, (1e6 * frames) / Math.max(totalUs, 1)));
    return { grid: { texture, cols, rows, frames }, fps };
  } catch {
    return null;
  }
}
