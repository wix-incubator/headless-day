import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Quaternion, Vector3, type Mesh, type MeshBasicMaterial } from 'three';
import { DESTINATIONS } from '../data/destinations';
import { SWELL_SOURCES, type SwellSource } from '../data/swell';
import { latLngToVec3 } from './geo';

const RING_R = 1.002; // just above the ocean (globe radius 1) — avoids z-fighting
const RINGS_PER_SOURCE = 3; // x4 sources = 12 total, the perf budget
const ARC_RADIANS = Math.PI * 0.56; // partial torus — swell heading toward the breaks, not a full splash
const TUBE_THICKNESS = 0.011;
const RADIAL_SEGMENTS = 5;
const TUBULAR_SEGMENTS = 28;
const ALPHA_MAX = Math.PI * 0.92; // grows 0 -> ~π per the brief, short of the exact antipode
const CYCLE_S = 16; // slow, majestic march across the ocean
const MAX_OPACITY = 0.3; // translucent foam/cyan, reads as swell lines not neon
const SWELL_COLOR = '#BFEFEA';

// Reduced-motion snapshot: 3 rings frozen mid-cycle at staggered fractions instead of
// animating (each still visible, none at the invisible start/end of its life).
const STATIC_FRACTIONS = [0.32, 0.52, 0.72];

const Z_AXIS = new Vector3(0, 0, 1);

function unitVec(lat: number, lng: number): Vector3 {
  const [x, y, z] = latLngToVec3(lat, lng, 1);
  return new Vector3(x, y, z);
}

/** Opacity envelope over a ring's 0..1 life fraction: 0 at birth, peaks at `MAX_OPACITY`
 * mid-life, back to 0 at the end (brief: "opacity peaks mid-life, →0 at the end"). */
function envelopeOpacity(f: number): number {
  return MAX_OPACITY * Math.sin(Math.PI * f);
}

/** One-time (per source, not per frame) orientation: a quaternion aligning local +Z to the
 * source's unit vector S, plus a Z-rotation that centers the `ARC_RADIANS` sweep on the
 * mean bearing toward the destinations this source feeds. Because a small-circle's plane
 * never changes as α grows — only its position/radius along the fixed S axis do — the
 * per-frame loop needs none of this, just cos/sin(α). */
function useSourceOrientation(source: SwellSource): { baseQuat: Quaternion; ringRotationZ: number } {
  return useMemo(() => {
    const S = unitVec(source.lat, source.lng);
    const feeds = source.feeds
      .map((id) => DESTINATIONS.find((d) => d.id === id))
      .filter((d): d is NonNullable<typeof d> => !!d);
    const sum = new Vector3();
    for (const d of feeds) sum.add(unitVec(d.lat, d.lng));
    const tangent = sum.clone().addScaledVector(S, -sum.dot(S));
    if (tangent.lengthSq() < 1e-8) {
      // Degenerate only if the fed destinations average out exactly on the S axis —
      // shouldn't happen for real data, guarded so the arc never NaNs.
      const arbitrary = Math.abs(S.y) < 0.9 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0);
      tangent.copy(arbitrary).addScaledVector(S, -arbitrary.dot(S));
    }
    tangent.normalize();

    const baseQuat = new Quaternion().setFromUnitVectors(Z_AXIS, S);
    const localTangent = tangent.clone().applyQuaternion(baseQuat.clone().invert());
    const phi = Math.atan2(localTangent.y, localTangent.x);
    return { baseQuat, ringRotationZ: phi - ARC_RADIANS / 2 };
  }, [source]);
}

function SwellSourceRings({ source, animate }: { source: SwellSource; animate: boolean }) {
  const { baseQuat, ringRotationZ } = useSourceOrientation(source);
  const ringMeshes = useRef<(Mesh | null)[]>([]);
  const phase = useRef(
    Array.from({ length: RINGS_PER_SOURCE }, (_, i) => (i / RINGS_PER_SOURCE) * CYCLE_S),
  );

  useFrame((_, dt) => {
    for (let i = 0; i < RINGS_PER_SOURCE; i++) {
      const mesh = ringMeshes.current[i];
      if (!mesh) continue;
      const mat = mesh.material as MeshBasicMaterial;
      let f: number;
      if (!animate) {
        f = STATIC_FRACTIONS[i];
      } else {
        phase.current[i] = (phase.current[i] + dt) % CYCLE_S;
        f = phase.current[i] / CYCLE_S;
      }
      const alpha = f * ALPHA_MAX;
      mesh.position.z = Math.cos(alpha) * RING_R;
      mesh.scale.setScalar(Math.sin(alpha) * RING_R);
      mat.opacity = envelopeOpacity(f);
    }
  });

  return (
    <group onUpdate={(g) => g.quaternion.copy(baseQuat)}>
      {Array.from({ length: RINGS_PER_SOURCE }, (_, i) => (
        <mesh key={i} ref={(m) => { ringMeshes.current[i] = m; }} rotation={[0, 0, ringRotationZ]}>
          <torusGeometry args={[1, TUBE_THICKNESS, RADIAL_SEGMENTS, TUBULAR_SEGMENTS, ARC_RADIANS]} />
          <meshBasicMaterial color={SWELL_COLOR} transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

/** Storm-swell trains (thesis §2C): each real storm source emits ~3 concentric, staggered
 * expanding swell rings — small-circles at angular radius α from the source (`scene/swell.ts`'s
 * `ringTransform` math) — that march across the ocean toward the destinations they feed, then
 * loop. Arc-limited toward the mean bearing of the fed destinations (`torusGeometry`'s `arc`
 * param) so it reads as swell heading somewhere, not a full concentric splash. Always
 * visible — always-on weather, not month-gated. Rendered inside the Rig (a child alongside
 * Globe/Markers in GlobeScene) so it rotates with the globe. */
export function SwellTrains({ animate }: { animate: boolean }) {
  return (
    <group>
      {SWELL_SOURCES.map((s) => (
        <SwellSourceRings key={s.id} source={s} animate={animate} />
      ))}
    </group>
  );
}
