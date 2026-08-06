import * as THREE from 'three';

// Superellipse plan shape: |x/a|^n + |z/b|^n = 1
// n = 2 is an ellipse, higher n approaches a rounded rectangle.
export function superPoint(a, b, n, t) {
  const c = Math.cos(t);
  const s = Math.sin(t);
  const x = a * Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
  const z = b * Math.sign(s) * Math.pow(Math.abs(s), 2 / n);
  return [x, z];
}

// Arc-length sampler so seats can be placed at uniform spacing along the loop.
export function superSampler(a, b, n, steps = 4096) {
  const pts = [];
  const cum = [0];
  let prev = superPoint(a, b, n, 0);
  pts.push(prev);
  let len = 0;
  for (let i = 1; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const p = superPoint(a, b, n, t);
    len += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
    cum.push(len);
    pts.push(p);
    prev = p;
  }
  return {
    length: len,
    at(s) {
      s = ((s % len) + len) % len;
      let lo = 0;
      let hi = cum.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (cum[mid] < s) lo = mid + 1;
        else hi = mid;
      }
      const i = Math.max(1, lo);
      const f = (s - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
      const p0 = pts[i - 1];
      const p1 = pts[i];
      return {
        x: p0[0] + (p1[0] - p0[0]) * f,
        z: p0[1] + (p1[1] - p0[1]) * f,
        t: ((i - 1 + f) / steps) * Math.PI * 2,
      };
    },
  };
}

// Closed quad strip between two superellipse loops at different sizes/heights.
export function loopStrip(aIn, bIn, yIn, aOut, bOut, yOut, n, segs = 220) {
  const pos = [];
  const idx = [];
  for (let i = 0; i <= segs; i++) {
    const t = (i / segs) * Math.PI * 2;
    const [x1, z1] = superPoint(aIn, bIn, n, t);
    const [x2, z2] = superPoint(aOut, bOut, n, t);
    pos.push(x1, yIn, z1, x2, yOut, z2);
  }
  for (let i = 0; i < segs; i++) {
    const k = i * 2;
    idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Vertical wall following one superellipse loop between two heights.
export function loopWall(a, b, y0, y1, n, segs = 220) {
  return loopStrip(a, b, y0, a, b, y1, n, segs);
}

// Closed CatmullRom curve following a superellipse loop (for LED tubes).
export function loopCurve(a, b, y, n, segs = 96) {
  const pts = [];
  for (let i = 0; i < segs; i++) {
    const t = (i / segs) * Math.PI * 2;
    const [x, z] = superPoint(a, b, n, t);
    pts.push(new THREE.Vector3(x, y, z));
  }
  return new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.5);
}

// Deterministic PRNG so the demo data is stable between loads.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x9e3779b9) | 0;
    let t = a ^ (a >>> 16);
    t = Math.imul(t, 0x21f0aaad);
    t = t ^ (t >>> 15);
    t = Math.imul(t, 0x735a2d97);
    return ((t = t ^ (t >>> 15)) >>> 0) / 4294967296;
  };
}

export function easeInOutCubic(x) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}
