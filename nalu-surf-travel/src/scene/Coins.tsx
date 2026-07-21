import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Matrix4, Quaternion, Shape, Vector3, type Group } from 'three';
import { COINS, COIN_COLLECT_RANGE_DEG, type Coin } from '../data/coins';
import { useAchievements } from '../game/achievements';
import { useGame } from '../game/store';
import { angularDistanceDeg } from '../game/flight';
import { latLngToVec3 } from './geo';
import { BurstFX, type BurstFXHandle, type ParticleSpec } from './BurstFX';

// Scratch objects for the per-frame billboard maths — module-level so useFrame stays
// allocation-free (reused across every coin, every frame).
const _m = new Matrix4();
const _camWorld = new Vector3();
const _objWorld = new Vector3();
const _up = new Vector3();
const _viewDir = new Vector3();
const _q = new Quaternion();
const _parentQ = new Quaternion();
// The globe is centered on the world origin, so a coin's radial-outward direction (its "up"
// against gravity, which points at the world centre) is just its normalized world position.
const WORLD_UP = new Vector3(0, 1, 0);

// A classic video-game coin, faked glossy with a few UNLIT gold tones (light rim →
// mid face → deep recessed field → dark edge) so it reads as a shiny, embossed coin
// without any lighting that could blend it into the teal ocean.
const GOLD_EDGE = '#C88A16'; // the cylinder body/edge — the darkest tone, in shadow
const GOLD_FACE = '#FFD84D'; // bright front face
const GOLD_RIM = '#FFE9A0'; // raised rim highlight (the brightest ring)
const GOLD_FIELD = '#F0B42E'; // recessed inner field behind the star
const GOLD_STAR = '#FFF3C4'; // embossed centre star, catches the "light"
const SHINE = '#FFFDF2'; // small specular glint that sells the gloss on an unlit mesh

const COIN_RADIUS = 0.03; // small collectible, still clearly readable via the camera-facing billboard
const COIN_THICKNESS = COIN_RADIUS * 0.26;
const RIM_TUBE = COIN_RADIUS * 0.18;
const LAYER = 0.0008; // z-gap between stacked face layers — enough to beat z-fighting, small enough to read as embossing
// Float at flag-pole height above the water (Markers' POLE_HEIGHT is 0.085) so the coin
// hovers clearly above the sea rather than sitting in it.
const SURFACE_OFFSET = 0.085;
// The coin is billboarded to face the camera every frame (see CollectibleCoin) so its face is
// always readable — never the edge-on sliver a radially-flat disc becomes off-centre. Its up
// vector, though, is the RADIAL-outward direction, so "down" for the coin points at the world
// centre: gravity is toward the centre of the globe, exactly like the flags/markers lean. A coin
// near the top of the globe stands upright; one on the right leans right; one at the bottom
// points down — all away from the centre. Animation: a gentle yaw sway about that radial up axis
// (catches the light, stays standing) plus a float in/out along the radial.
const YAW_HZ = 0.3;
const YAW_AMP = 0.28; // rad, about the radial up axis; well short of edge-on
const BOB_HZ = 1;
const BOB_AMP = COIN_RADIUS * 0.18;
// Near the view centre the radial-outward direction is ~parallel to the camera's line of sight,
// so "up projected onto the screen" is undefined — fall back to screen-up to avoid a degenerate
// (spinning/flipping) orientation right where the player usually is.
const RADIAL_UP_DEGENERATE = 0.985;

/** A five-point star for the coin's embossed centre, built once at module load. */
function starShape(points: number, outer: number, inner: number): Shape {
  const s = new Shape();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  s.closePath();
  return s;
}
const STAR = starShape(5, COIN_RADIUS * 0.44, COIN_RADIUS * 0.19);

const SPARKLE_COLORS = ['#FFD166', '#FFFDF7', '#FFD166', '#FFFDF7', '#FFD166', '#FFFDF7'];

function sparkleSpecs(): ParticleSpec[] {
  return SPARKLE_COLORS.map((color, i) => {
    const angle = (i / SPARKLE_COLORS.length) * Math.PI * 2;
    return {
      position: [0, 0, 0], // the coin's outer group already sits at flag height above the sea
      velocity: [Math.cos(angle) * 0.12, Math.sin(angle) * 0.12, 0.18],
      gravity: 0.3, life: 0.45, color, size: 0.008,
    };
  });
}

/** One uncollected coin: a glossy flat gold coin — a thick disc with a raised rim, a recessed
 * inner field and an embossed star, faked shiny with stacked unlit gold tones. Its outer group
 * rides the globe (inside the Rig) at flag height above the sea; the `bb` group is re-oriented
 * every frame to face the camera with world-up as up (converted into the rotating Rig's local
 * space), so the coin stands upright and full-face wherever it sits — never the edge-on sliver a
 * radial disc becomes. The `wob` group adds a gentle yaw sway (about the vertical, so it stays
 * upright) and a vertical float on top of that camera-facing base. Per-frame proximity (reusing
 * `angularDistanceDeg`) collects it within `COIN_COLLECT_RANGE_DEG`. */
function CollectibleCoin({ coin, animate }: { coin: Coin; animate: boolean }) {
  const bb = useRef<Group>(null); // billboard: orientation faces the camera
  const wob = useRef<Group>(null); // relative tilt + wobble + bob on top of the billboard
  const burstRef = useRef<BurstFXHandle>(null);
  const clock = useRef(Math.random() * 10); // desync each coin's wobble/bob phase
  const collected = useRef(false);

  useFrame((state, dt) => {
    if (collected.current) return;
    const { flight } = useGame.getState();
    if (angularDistanceDeg(flight.lat, flight.lng, coin.lat, coin.lng) <= COIN_COLLECT_RANGE_DEG) {
      if (useAchievements.getState().collectCoin(coin.id)) {
        collected.current = true;
        burstRef.current?.spawn(sparkleSpecs());
        return;
      }
    }
    const bbGroup = bb.current;
    const wobGroup = wob.current;
    if (!bbGroup || !wobGroup) return;

    // Billboard: orient so local +Z points at the camera. Matrix4.lookAt(eye, target, up) puts +Z
    // along (eye - target), so eye = camera, target = coin → +Z toward the camera. The `up` we
    // hand it is the coin's RADIAL-outward direction (its normalized world position), so the coin
    // faces the camera yet "stands up" away from the globe centre — gravity toward the world
    // centre. The coin's parent (the Rig) is rotating, so bake that out by pre-multiplying the
    // inverse parent world quaternion — otherwise the globe's spin would drag it off.
    bbGroup.getWorldPosition(_objWorld);
    state.camera.getWorldPosition(_camWorld);
    _up.copy(_objWorld).normalize();
    _viewDir.copy(_camWorld).sub(_objWorld).normalize();
    if (Math.abs(_viewDir.dot(_up)) > RADIAL_UP_DEGENERATE) _up.copy(WORLD_UP);
    _m.lookAt(_camWorld, _objWorld, _up);
    _q.setFromRotationMatrix(_m);
    if (bbGroup.parent) {
      bbGroup.parent.getWorldQuaternion(_parentQ).invert();
      bbGroup.quaternion.copy(_parentQ).multiply(_q);
    } else {
      bbGroup.quaternion.copy(_q);
    }

    if (!animate) {
      wobGroup.rotation.set(0, 0, 0);
      wobGroup.position.y = 0;
      return;
    }
    clock.current += dt;
    wobGroup.rotation.set(0, Math.sin(clock.current * YAW_HZ * Math.PI * 2) * YAW_AMP, 0);
    wobGroup.position.y = Math.sin(clock.current * BOB_HZ * Math.PI * 2) * BOB_AMP;
  });

  return (
    <group position={latLngToVec3(coin.lat, coin.lng, 1 + SURFACE_OFFSET)}>
      <group ref={bb}>
        {/* Camera-facing frame. The coin lies in the XY plane facing +Z; layers stack up +Z
         * toward the viewer. `wob` adds the yaw sway + float relative to the camera-facing base. */}
        <group ref={wob}>
          {/* Body + edge: a full cylinder, flat faces along Z (dark gold, reads as the rim shadow) */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[COIN_RADIUS, COIN_RADIUS, COIN_THICKNESS, 40]} />
            <meshBasicMaterial color={GOLD_EDGE} />
          </mesh>
          {/* Bright front face just proud of the +Z cap */}
          <mesh position={[0, 0, COIN_THICKNESS / 2 + LAYER]}>
            <circleGeometry args={[COIN_RADIUS * 0.98, 40]} />
            <meshBasicMaterial color={GOLD_FACE} />
          </mesh>
          {/* Recessed inner field */}
          <mesh position={[0, 0, COIN_THICKNESS / 2 + LAYER * 2]}>
            <circleGeometry args={[COIN_RADIUS * 0.72, 36]} />
            <meshBasicMaterial color={GOLD_FIELD} />
          </mesh>
          {/* Raised rim ring */}
          <mesh position={[0, 0, COIN_THICKNESS / 2 + LAYER * 3]}>
            <torusGeometry args={[COIN_RADIUS * 0.82, RIM_TUBE, 12, 44]} />
            <meshBasicMaterial color={GOLD_RIM} />
          </mesh>
          {/* Embossed centre star */}
          <mesh position={[0, 0, COIN_THICKNESS / 2 + LAYER * 4]}>
            <shapeGeometry args={[STAR]} />
            <meshBasicMaterial color={GOLD_STAR} />
          </mesh>
          {/* Glossy glint — a small off-centre ellipse that fakes a specular highlight */}
          <mesh position={[-COIN_RADIUS * 0.34, COIN_RADIUS * 0.36, COIN_THICKNESS / 2 + LAYER * 5]} scale={[1, 0.55, 1]}>
            <circleGeometry args={[COIN_RADIUS * 0.2, 20]} />
            <meshBasicMaterial color={SHINE} transparent opacity={0.7} />
          </mesh>
        </group>
      </group>
      <BurstFX ref={burstRef} />
    </group>
  );
}

/** Rendered inside the Rig (rotates with the globe, same as Markers) — only uncollected coins
 * ever mount, so a collected one simply disappears once the achievements store's `coins` set
 * includes it. No counter, no hint of how many remain. */
export function Coins({ animate }: { animate: boolean }) {
  const collectedIds = useAchievements((s) => s.coins);
  const remaining = COINS.filter((c) => !collectedIds.includes(c.id));
  return (
    <group>
      {remaining.map((c) => <CollectibleCoin key={c.id} coin={c} animate={animate} />)}
    </group>
  );
}
