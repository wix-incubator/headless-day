import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BufferGeometry, Color, Float32BufferAttribute, SphereGeometry, type Group } from 'three';
import { latLngToVec3, vec3ToLatLng } from './geo';
import { createEarthTexture, earthTextureWidth } from './earthTexture';
import { getToonGradientMap } from './toonGradient';
import { heightAt, MAX_LAND_HEIGHT } from './terrain';

const CLOUD_POSITIONS: [number, number][] = [[18, -35], [-28, 95], [42, 170], [-8, -120]];

// Unlit flat color (not toon-shaded): a warm key light multiplied into a toon-shaded
// near-white cloud reads as sandy tan — exactly the "reads as an extra continent"
// problem the brief calls out. Flat shading is one of the two shading modes the brief
// allows, and it's how the sun disc already stays a clean, un-tinted color too.
function CloudPuff({ lat, lng }: { lat: number; lng: number }) {
  return (
    <group position={latLngToVec3(lat, lng, 1.2)} onUpdate={(g) => g.lookAt(0, 0, 0)}>
      <mesh scale={[0.1, 0.075, 0.09]}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshBasicMaterial color="#FFFDF7" />
      </mesh>
      <mesh position={[0.085, -0.01, 0]} scale={[0.065, 0.05, 0.06]}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshBasicMaterial color="#FFFDF7" />
      </mesh>
      <mesh position={[-0.085, -0.01, 0]} scale={[0.065, 0.05, 0.06]}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshBasicMaterial color="#FFFDF7" />
      </mesh>
    </group>
  );
}

function Clouds({ animate }: { animate: boolean }) {
  const ref = useRef<Group>(null);
  useFrame((_, dt) => { if (animate && ref.current) ref.current.rotation.y += dt * 0.015; });
  return (
    <group ref={ref}>
      {CLOUD_POSITIONS.map(([lat, lng], i) => <CloudPuff key={i} lat={lat} lng={lng} />)}
    </group>
  );
}

// Bumped from the art-direction baseline (48x32, ~3k tris) for a cleaner relief silhouette;
// still leaves the whole scene comfortably under the addendum's <50k-tri ceiling.
const SPHERE_WIDTH_SEGMENTS = 96;
const SPHERE_HEIGHT_SEGMENTS = 64;

// Vertex-color tint at higher land elevations (cheap "deeper green/brown" read for toy
// mountain relief) — multiplies against the earth texture, so sea level (tint 1,1,1) and
// all of the ocean stay exactly as painted.
const HIGH_LAND_TINT = new Color('#6E8F52');

/** Builds the sphere once with land vertices pushed outward by `heightAt` and a per-vertex
 * elevation tint — memoized at mount, never rebuilt per-frame (terrain addendum). */
function buildDisplacedGlobeGeometry(widthSegments: number, heightSegments: number): BufferGeometry {
  const geometry = new SphereGeometry(1, widthSegments, heightSegments);
  const position = geometry.attributes.position;
  const colors = new Float32Array(position.count * 3);
  const white = new Color(1, 1, 1);
  const tint = new Color();
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
    const { lat, lng } = vec3ToLatLng(x, y, z);
    const h = heightAt(lat, lng);
    if (h > 0) {
      const scale = 1 + h;
      position.setXYZ(i, x * scale, y * scale, z * scale);
    }
    const highness = Math.min(1, h / MAX_LAND_HEIGHT);
    tint.copy(white).lerp(HIGH_LAND_TINT, highness * 0.5);
    colors[i * 3] = tint.r;
    colors[i * 3 + 1] = tint.g;
    colors[i * 3 + 2] = tint.b;
  }
  position.needsUpdate = true;
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

export function Globe({ animateClouds }: { animateClouds: boolean }) {
  const texture = useMemo(() => createEarthTexture(earthTextureWidth()), []);
  useEffect(() => () => texture.dispose(), [texture]);
  const geometry = useMemo(
    () => buildDisplacedGlobeGeometry(SPHERE_WIDTH_SEGMENTS, SPHERE_HEIGHT_SEGMENTS),
    [],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <group>
      <mesh geometry={geometry}>
        <meshToonMaterial map={texture} vertexColors color="#FFFFFF" gradientMap={getToonGradientMap()} />
      </mesh>
      <Clouds animate={animateClouds} />
    </group>
  );
}
