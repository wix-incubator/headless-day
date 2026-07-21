import { DataTexture, NearestFilter, RedFormat } from 'three';

let shared: DataTexture | null = null;

/** One shared 3-step gradient map for every MeshToonMaterial in the scene (art-direction §0). */
export function getToonGradientMap(): DataTexture {
  if (shared) return shared;
  const tex = new DataTexture(new Uint8Array([96, 176, 255]), 3, 1, RedFormat);
  tex.minFilter = NearestFilter;
  tex.magFilter = NearestFilter;
  tex.needsUpdate = true;
  shared = tex;
  return shared;
}
