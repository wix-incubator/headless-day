import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { superPoint, superSampler, mulberry32 } from './geom.js';

// Bowl layout constants — shared with stadium.js so structure hugs the seats.
export const BOWL = {
  n: 3.2,          // superellipse exponent (rounded rectangle)
  a0: 66.5,        // half-length of the innermost seat row
  b0: 47.0,
  seatPitch: 0.56, // seat spacing along a row
  aisles: 20,
  aisleHalf: 0.85,
  tier1: { rows: 16, rise: 0.6, depth: 0.86, baseY: 2.1, baseOff: 0 },
  gapWalk: 2.6,    // walkway between tiers
  tier2: { rows: 14, rise: 0.82, depth: 0.84, baseY: 0, baseOff: 0 }, // filled below
};

BOWL.tier1.topY = BOWL.tier1.baseY + BOWL.tier1.rows * BOWL.tier1.rise;
BOWL.tier1.topOff = BOWL.tier1.baseOff + BOWL.tier1.rows * BOWL.tier1.depth;
BOWL.tier2.baseY = BOWL.tier1.topY + 1.4;
BOWL.tier2.baseOff = BOWL.tier1.topOff + BOWL.gapWalk;
BOWL.tier2.topY = BOWL.tier2.baseY + BOWL.tier2.rows * BOWL.tier2.rise;
BOWL.tier2.topOff = BOWL.tier2.baseOff + BOWL.tier2.rows * BOWL.tier2.depth;

const STANDS = [
  { name: 'North Stand', letter: 'N' },
  { name: 'East End', letter: 'E' },
  { name: 'South Stand', letter: 'S' },
  { name: 'West End', letter: 'W' },
];

function standFor(x, z) {
  const deg = (Math.atan2(z, x) * 180) / Math.PI; // -180..180
  if (deg > -45 && deg <= 45) return STANDS[1]; // +x → East End
  if (deg > 45 && deg <= 135) return STANDS[2]; // +z → South Stand
  if (deg > -135 && deg <= -45) return STANDS[0]; // -z → North Stand
  return STANDS[3]; // -x → West End
}

// Tier id for a seat: club = lower-tier sideline center, end = lower behind
// goals, lower = rest of tier 1, upper = all of tier 2.
function tierIdFor(tierIdx, stand, t) {
  if (tierIdx === 1) return 'upper';
  if (stand.letter === 'E' || stand.letter === 'W') return 'end';
  // Central slice of the north sideline is the club section.
  const c = Math.cos(t);
  if (stand.letter === 'N' && Math.abs(c) < 0.45) return 'club';
  return 'lower';
}

export function generateSeats(event) {
  const records = [];
  const rand = mulberry32(event.seed);
  const tiers = [BOWL.tier1, BOWL.tier2];
  const tmpColor = new THREE.Color();

  for (let ti = 0; ti < tiers.length; ti++) {
    const tier = tiers[ti];
    for (let r = 0; r < tier.rows; r++) {
      const off = tier.baseOff + r * tier.depth;
      const a = BOWL.a0 + off;
      const b = BOWL.b0 + off;
      const y = tier.baseY + r * tier.rise;
      const sampler = superSampler(a, b, BOWL.n, 2048);

      // Aisle gaps at fixed parameter angles so they line up radially.
      const aislePts = [];
      for (let k = 0; k < BOWL.aisles; k++) {
        const [ax, az] = superPoint(a, b, BOWL.n, (k / BOWL.aisles) * Math.PI * 2);
        aislePts.push([ax, az]);
      }

      const count = Math.floor(sampler.length / BOWL.seatPitch);
      const blockSeatCounter = new Map();
      for (let i = 0; i < count; i++) {
        const s = i * BOWL.seatPitch;
        const p = sampler.at(s);
        let nearAisle = false;
        for (let k = 0; k < aislePts.length; k++) {
          const dx = p.x - aislePts[k][0];
          const dz = p.z - aislePts[k][1];
          if (dx * dx + dz * dz < BOWL.aisleHalf * BOWL.aisleHalf) {
            nearAisle = true;
            break;
          }
        }
        if (nearAisle) continue;

        const stand = standFor(p.x, p.z);
        const tierId = tierIdFor(ti, stand, p.t);
        const tierInfo = event.priceTiers.find((pt) => pt.id === tierId);
        const blockIdx = Math.floor((p.t / (Math.PI * 2)) * BOWL.aisles) % BOWL.aisles;
        const block = `${stand.letter}${(ti === 1 ? 100 : 0) + blockIdx + 1}`;
        const rowLabel = `${ti === 1 ? 'U' : 'L'}${r + 1}`;
        const blockKey = `${block}:${rowLabel}`;
        const seatNo = (blockSeatCounter.get(blockKey) || 0) + 1;
        blockSeatCounter.set(blockKey, seatNo);

        // Roughly half the bowl is still buyable inventory; the rest holds
        // fans so the final still looks busy.
        const available = rand() > 0.55;
        const price = Math.round(tierInfo.price * (1 + (r / tier.rows - 0.5) * -0.12));

        tmpColor.set(tierInfo.color);
        const v = 0.86 + rand() * 0.26; // subtle per-seat variation
        tmpColor.multiplyScalar(v);
        if (!available) tmpColor.set('#343946').multiplyScalar(0.9 + rand() * 0.2);

        records.push({
          i: records.length,
          x: p.x,
          y,
          z: p.z,
          yaw: Math.atan2(p.x, p.z),
          tier: ti === 1 ? 'upper' : 'lower',
          tierId,
          stand: stand.name,
          block,
          row: rowLabel,
          seat: seatNo,
          price,
          available,
          color: tmpColor.getHex(),
        });
      }
    }
  }
  return records;
}

function seatGeometry() {
  const pan = new THREE.BoxGeometry(0.46, 0.07, 0.42);
  pan.translate(0, 0.4, 0.02);
  const back = new THREE.BoxGeometry(0.46, 0.46, 0.07);
  back.translate(0, 0.58, 0.23);
  const geo = mergeGeometries([pan, back]);
  pan.dispose();
  back.dispose();
  return geo;
}

export function buildSeatMesh(records) {
  const geo = seatGeometry();
  const mat = new THREE.MeshLambertMaterial();
  const mesh = new THREE.InstancedMesh(geo, mat, records.length);
  mesh.name = 'seats';
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const pos = new THREE.Vector3();
  const scale = new THREE.Vector3(1, 1, 1);
  const color = new THREE.Color();
  for (const rec of records) {
    q.setFromAxisAngle(up, rec.yaw);
    pos.set(rec.x, rec.y, rec.z);
    m.compose(pos, q, scale);
    mesh.setMatrixAt(rec.i, m);
    mesh.setColorAt(rec.i, color.setHex(rec.color));
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.instanceColor.needsUpdate = true;
  mesh.frustumCulled = false;
  return mesh;
}

// The crowd: one low-poly seated fan per occupied seat, in a single
// InstancedMesh. Colors paint the stands albiceleste — the East End is a
// striped sky-and-white tifo, the West End hosts a pocket of Spain fans.
function personGeometry() {
  const torso = new THREE.BoxGeometry(0.38, 0.6, 0.26);
  torso.translate(0, 0.68, 0.05);
  const head = new THREE.SphereGeometry(0.15, 5, 4);
  head.translate(0, 1.08, 0.03);
  const geo = mergeGeometries([torso, head]);
  torso.dispose();
  head.dispose();
  return geo;
}

const CASUAL = ['#e9c46a', '#e76f51', '#2a9d8f', '#264653', '#f4f1de', '#8e7dbe'];

function crowdColor(rec, rand, tmp) {
  const roll = rand();
  if (rec.stand === 'East End') {
    // tifo stripes: alternate sky / white by row
    const rowNum = parseInt(rec.row.slice(1), 10);
    tmp.set(rowNum % 2 ? '#74acdf' : '#f2f6fa');
  } else if (rec.stand === 'West End' && roll < 0.3) {
    tmp.set(rand() < 0.7 ? '#d0342c' : '#ffc400'); // travelling Spain fans
  } else if (roll < 0.54) {
    tmp.set('#74acdf');
  } else if (roll < 0.78) {
    tmp.set('#eef2f6');
  } else if (roll < 0.87) {
    tmp.set('#1d3557');
  } else {
    tmp.set(CASUAL[Math.floor(rand() * CASUAL.length)]);
  }
  return tmp.multiplyScalar(0.82 + rand() * 0.3);
}

export function buildCrowdMesh(records) {
  const occupied = records.filter((r) => !r.available);
  const geo = personGeometry();
  const mat = new THREE.MeshLambertMaterial();
  const mesh = new THREE.InstancedMesh(geo, mat, occupied.length);
  mesh.name = 'crowd';
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3();
  const color = new THREE.Color();
  const rand = mulberry32(0xc0ffee);
  for (let k = 0; k < occupied.length; k++) {
    const rec = occupied[k];
    q.setFromAxisAngle(up, rec.yaw);
    pos.set(rec.x, rec.y, rec.z);
    const s = 0.92 + rand() * 0.16;
    scl.set(s, s * (0.94 + rand() * 0.14), s);
    m.compose(pos, q, scl);
    mesh.setMatrixAt(k, m);
    mesh.setColorAt(k, crowdColor(rec, rand, color));
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.instanceColor.needsUpdate = true;
  mesh.frustumCulled = false;
  return mesh;
}

// Spatial hash over seat positions: picking raycasts a coarse bowl surface,
// then snaps to the nearest seat via this grid (raycasting 24k instances
// directly would be far too slow).
export function buildSeatGrid(records) {
  const cell = 1.4;
  const map = new Map();
  const key = (ix, iz) => ix * 100000 + iz;
  for (const rec of records) {
    const ix = Math.round(rec.x / cell);
    const iz = Math.round(rec.z / cell);
    const k = key(ix, iz);
    let arr = map.get(k);
    if (!arr) map.set(k, (arr = []));
    arr.push(rec);
  }
  return {
    nearest(x, y, z, maxDist = 0.9) {
      const ix = Math.round(x / cell);
      const iz = Math.round(z / cell);
      let best = null;
      let bestD = maxDist * maxDist;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          const arr = map.get(key(ix + dx, iz + dz));
          if (!arr) continue;
          for (const rec of arr) {
            if (Math.abs(rec.y - y) > 2.2) continue;
            const d = (rec.x - x) ** 2 + (rec.z - z) ** 2;
            if (d < bestD) {
              bestD = d;
              best = rec;
            }
          }
        }
      }
      return best;
    },
  };
}
