import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { fetchEvent } from './data.js';
import { buySeat, preloadTickets } from './wix.js';
import { generateSeats, buildSeatMesh, buildCrowdMesh, buildSeatGrid } from './seats.js';
import { buildStadium } from './stadium.js';
import { easeInOutCubic } from './geom.js';
import * as ui from './ui.js';

const canvas = document.getElementById('scene');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.3, 2000);

const HOME_POS = new THREE.Vector3(-138, 96, 158);
const HOME_TARGET = new THREE.Vector3(0, 10, 0);
camera.position.copy(HOME_POS);

const controls = new OrbitControls(camera, canvas);
controls.target.copy(HOME_TARGET);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 42;
controls.maxDistance = 340;
controls.minPolarAngle = 0.12;
controls.maxPolarAngle = 1.38;
controls.autoRotate = !reducedMotion;
controls.autoRotateSpeed = 0.45;
controls.update();

// ---------------------------------------------------------------- app state

const state = {
  mode: 'loading', // loading | orbit | flying | seat
  event: null,
  records: null,
  seatMesh: null,
  grid: null,
  stadium: null,
  hovered: null,
  selected: null,
  savedCam: null, // { pos, target } to restore after seat view
  look: { yaw: 0, pitch: 0 },
};

const raycaster = new THREE.Raycaster();
const pointerNdc = new THREE.Vector2();
const tmpColor = new THREE.Color();

function seatColor(rec, kind) {
  if (kind === 'hover') return tmpColor.set('#ffffff');
  if (kind === 'selected') return tmpColor.set('#fbbf24');
  return tmpColor.setHex(rec.color);
}

function paintSeat(rec, kind) {
  if (!rec) return;
  state.seatMesh.setColorAt(rec.i, seatColor(rec, kind));
  state.seatMesh.instanceColor.needsUpdate = true;
}

// ------------------------------------------------------------------- tweens

let activeTween = null;
function tween(dur, onUpdate, onDone) {
  if (reducedMotion) dur = 0;
  if (dur <= 0) {
    onUpdate(1);
    onDone && onDone();
    return;
  }
  activeTween = { t0: performance.now(), dur: dur * 1000, onUpdate, onDone };
}

function stepTween(now) {
  if (!activeTween) return;
  const k = Math.min(1, (now - activeTween.t0) / activeTween.dur);
  activeTween.onUpdate(easeInOutCubic(k));
  if (k >= 1) {
    const done = activeTween.onDone;
    activeTween = null;
    done && done();
  }
}

// Fly the camera along a gentle arc and land looking at `lookAt`.
function flyTo(endPos, lookAt, dur, onDone) {
  const startPos = camera.position.clone();
  const startQuat = camera.quaternion.clone();
  const mid = startPos.clone().lerp(endPos, 0.5);
  mid.y += Math.min(26, startPos.distanceTo(endPos) * 0.16);

  const probe = camera.clone();
  probe.position.copy(endPos);
  probe.lookAt(lookAt);
  const endQuat = probe.quaternion.clone();

  const p = new THREE.Vector3();
  tween(
    dur,
    (k) => {
      // quadratic bezier through the raised midpoint
      const a = startPos.clone().lerp(mid, k);
      const b = mid.clone().lerp(endPos, k);
      p.copy(a.lerp(b, k));
      camera.position.copy(p);
      camera.quaternion.slerpQuaternions(startQuat, endQuat, k);
    },
    onDone
  );
}

// -------------------------------------------------------------- seat view

function seatEyePosition(rec) {
  const pos = new THREE.Vector3(rec.x, rec.y + 1.16, rec.z);
  // nudge slightly toward the pitch so the seat back never clips the camera
  const toCenter = new THREE.Vector3(-rec.x, 0, -rec.z).normalize().multiplyScalar(0.35);
  return pos.add(toCenter);
}

// First click on a seat selects it and opens the card; flying in happens on a
// second click (or the card's "Preview this view" button) — see enterSeat.
function selectSeat(rec) {
  if (state.hovered && state.hovered !== rec) paintSeat(state.hovered, 'base');
  state.hovered = null;
  ui.hideSeatTip();
  if (state.selected && state.selected !== rec) paintSeat(state.selected, 'base');
  state.selected = rec;
  paintSeat(rec, 'selected');
  ui.showSeatCard(state.event, rec, false);
  ui.setHint('Click the seat again — or "Preview this view" — to fly in');
}

function enterSeat(rec) {
  if (state.mode === 'flying') return;
  const hopping = state.mode === 'seat'; // seat-to-seat hop: shorter flight
  if (state.hovered && state.hovered !== rec) paintSeat(state.hovered, 'base');
  state.hovered = null;
  ui.hideSeatTip();
  if (state.selected && state.selected !== rec) paintSeat(state.selected, 'base');
  state.selected = rec;
  paintSeat(rec, 'selected');

  if (state.mode === 'orbit') {
    state.savedCam = { pos: camera.position.clone(), target: controls.target.clone() };
  }
  state.mode = 'flying';
  controls.enabled = false;
  canvas.style.cursor = 'grab';

  const eye = seatEyePosition(rec);
  const lookAt = new THREE.Vector3(0, 1.2, 0);
  flyTo(eye, lookAt, hopping ? 0.75 : 1.0, () => {
    state.mode = 'seat';
    const e = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
    state.look.yaw = e.y;
    state.look.pitch = e.x;
    if (!state.hopHintShown) {
      state.hopHintShown = true;
      ui.toast('You can move around from here — click any seat you see, or use the arrow keys', 4200);
    }
  });

  ui.showSeatCard(state.event, rec, true);
  ui.setHint('Drag to look around · Arrows or click a seat to move · Esc to go back');
}

function exitSeat() {
  if (state.mode !== 'seat') return;
  state.mode = 'flying';
  const { pos, target } = state.savedCam;
  flyTo(pos, target, 0.9, () => {
    state.mode = 'orbit';
    controls.target.copy(target);
    controls.enabled = true;
    controls.update();
    canvas.style.cursor = '';
  });
  if (state.selected) {
    paintSeat(state.selected, 'base');
    state.selected = null;
  }
  ui.hideSeatCard();
  ui.setHint('Drag to orbit · Scroll to zoom · Click any seat to preview its view');
}

// -------------------------------------------------------------- picking

function ndcFromEvent(e) {
  pointerNdc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
}

function pickSeat(e) {
  ndcFromEvent(e);
  raycaster.setFromCamera(pointerNdc, camera);
  const hits = raycaster.intersectObjects(state.stadium.pickSurfaces, false);
  if (!hits.length) return null;
  const p = hits[0].point;
  return state.grid.nearest(p.x, p.y, p.z);
}

let hoverPending = null;
canvas.addEventListener('pointermove', (e) => {
  if (state.mode === 'seat' && lookDrag) {
    state.look.yaw -= (e.clientX - lookDrag.x) * 0.0032;
    state.look.pitch -= (e.clientY - lookDrag.y) * 0.0032;
    state.look.pitch = Math.max(-1.1, Math.min(0.7, state.look.pitch));
    lookDrag = { x: e.clientX, y: e.clientY };
    camera.quaternion.setFromEuler(new THREE.Euler(state.look.pitch, state.look.yaw, 0, 'YXZ'));
    return;
  }
  // hover works while orbiting AND while seated (seat-to-seat browsing)
  if (state.mode !== 'orbit' && state.mode !== 'seat') return;
  hoverPending = e; // resolved at most once per frame in the render loop
});

function resolveHover() {
  const seated = state.mode === 'seat';
  if (!hoverPending || (state.mode !== 'orbit' && !seated)) return;
  const e = hoverPending;
  hoverPending = null;
  const rec = pickSeat(e);
  const hov = rec && rec !== state.selected ? rec : null;
  if (hov !== state.hovered) {
    if (state.hovered) paintSeat(state.hovered, 'base');
    state.hovered = hov;
    if (hov) {
      paintSeat(hov, 'hover');
      ui.showSeatTip(state.event, hov, seated);
    } else {
      ui.hideSeatTip();
    }
  }
  canvas.style.cursor = rec ? 'pointer' : seated ? 'grab' : '';
  if (state.hovered) ui.moveSeatTip(e.clientX, e.clientY);
}

canvas.addEventListener('pointerleave', () => {
  if (state.hovered && state.hovered !== state.selected) paintSeat(state.hovered, 'base');
  state.hovered = null;
  hoverPending = null;
  ui.hideSeatTip();
});

// Nearest seat one step away in viewer terms: left/right along the row,
// up/down a row. Uses the picking grid; two probe distances for left/right so
// arrows also carry across aisle gaps. Returns null at the edge of a stand.
function neighborSeat(rec, dir) {
  const rl = Math.hypot(rec.x, rec.z);
  const rx = rec.x / rl;
  const rz = rec.z / rl; // radial unit, pointing away from the pitch
  const tx = rz;
  const tz = -rx; // viewer-right when facing the pitch

  const probes = [];
  if (dir === 'left' || dir === 'right') {
    const s = dir === 'right' ? 1 : -1;
    probes.push([0.56 * s, 0], [2.2 * s, 0]); // next seat, then across an aisle
  } else {
    const s = dir === 'up' ? 1 : -1;
    probes.push([0, s]); // one row out/up or in/down
  }
  for (const [along, rows] of probes) {
    const n = state.grid.nearest(
      rec.x + tx * along + rx * rows * 0.85,
      rec.y + rows * 0.85,
      rec.z + tz * along + rz * rows * 0.85,
      0.7,
    );
    if (n && n !== rec) return n;
  }
  return null;
}

let downInfo = null;
let lookDrag = null;
canvas.addEventListener('pointerdown', (e) => {
  downInfo = { x: e.clientX, y: e.clientY, t: performance.now() };
  if (state.mode === 'seat') {
    lookDrag = { x: e.clientX, y: e.clientY };
    canvas.style.cursor = 'grabbing';
    if (state.hovered) {
      paintSeat(state.hovered, 'base');
      state.hovered = null;
      ui.hideSeatTip();
    }
  }
  if (controls.autoRotate) {
    controls.autoRotate = false;
    ui.setRotateOn(false);
  }
});
window.addEventListener('pointerup', (e) => {
  if (state.mode === 'seat') {
    lookDrag = null;
    canvas.style.cursor = 'grab';
  }
  if (!downInfo) return;
  const moved = Math.hypot(e.clientX - downInfo.x, e.clientY - downInfo.y);
  const dt = performance.now() - downInfo.t;
  downInfo = null;
  if (moved > 6 || dt > 550 || e.target !== canvas) return;
  if (state.mode === 'orbit') {
    const rec = pickSeat(e);
    if (rec === state.selected && rec) enterSeat(rec); // second click flies in
    else if (rec) selectSeat(rec);
    else actions.closeCard(); // click on empty space deselects
  } else if (state.mode === 'seat') {
    // hop straight to any other seat you can see from here
    const rec = pickSeat(e);
    if (rec && rec !== state.selected) enterSeat(rec);
  }
});

// ------------------------------------------------------------- UI actions

const actions = {
  zoom(factor) {
    if (state.mode !== 'orbit') return;
    const offset = camera.position.clone().sub(controls.target).multiplyScalar(factor);
    const len = THREE.MathUtils.clamp(offset.length(), controls.minDistance, controls.maxDistance);
    offset.setLength(len);
    camera.position.copy(controls.target).add(offset);
    controls.update();
  },
  toggleRotate() {
    if (state.mode !== 'orbit') return;
    controls.autoRotate = !controls.autoRotate;
    ui.setRotateOn(controls.autoRotate);
  },
  resetView() {
    if (state.mode === 'seat') {
      exitSeat();
      return;
    }
    if (state.mode !== 'orbit') return;
    state.mode = 'flying';
    controls.enabled = false;
    flyTo(HOME_POS, HOME_TARGET, 1.2, () => {
      state.mode = 'orbit';
      controls.target.copy(HOME_TARGET);
      controls.enabled = true;
      controls.update();
    });
  },
  closeCard() {
    if (state.mode === 'seat') {
      exitSeat();
      return;
    }
    ui.hideSeatCard();
    if (state.selected) {
      paintSeat(state.selected, 'base');
      state.selected = null;
    }
    ui.setHint('Drag to orbit · Scroll to zoom · Click any seat to preview its view');
  },
  previewSeat() {
    if (state.mode === 'orbit' && state.selected) enterSeat(state.selected);
  },
  exitSeat,
  async reserve() {
    if (!state.selected || !state.selected.available || state.buying) return;
    const rec = state.selected;
    state.buying = true;
    ui.setReserveBusy('Preparing checkout…');
    try {
      const url = await buySeat(state.event, rec.tierId);
      ui.toast(`Ticket for Block ${rec.block} · Row ${rec.row} · Seat ${rec.seat} added — heading to checkout`);
      window.location.assign(url);
    } catch (err) {
      console.error(err);
      state.buying = false;
      ui.resetReserve(rec);
      ui.toast('Checkout is unavailable right now — please try again in a moment.');
    }
  },
};

const ARROW_DIRS = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') actions.closeCard();
  if (e.key === 'Enter' && !document.getElementById('seat-card').hidden) actions.reserve();
  if (e.key === '+' || e.key === '=') actions.zoom(0.8);
  if (e.key === '-') actions.zoom(1.25);
  if (e.key === 'r' || e.key === 'R') actions.resetView();
  if (e.key === 'a' || e.key === 'A') actions.toggleRotate();
  if (ARROW_DIRS[e.key] && state.mode === 'seat' && state.selected) {
    e.preventDefault();
    const next = neighborSeat(state.selected, ARROW_DIRS[e.key]);
    if (next) enterSeat(next);
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ------------------------------------------------------------------- boot

// setTimeout, not requestAnimationFrame: rAF is paused/throttled in hidden or
// backgrounded tabs, which would stall the boot sequence on the loader screen.
const nextFrame = () => new Promise((r) => setTimeout(r, 25));

async function boot() {
  ui.loaderProgress(0.08, 'Contacting the arena…');
  const event = await fetchEvent();
  state.event = event;
  document.title = `${event.home.name} vs ${event.away.name} · Wix Headless Arena`;

  // Wix Madefor is painted into canvas textures (scoreboards, LED boards),
  // so wait for it briefly — but never block the arena on a slow font CDN.
  ui.loaderProgress(0.14, 'Loading Wix Madefor…');
  await Promise.race([
    Promise.all([
      document.fonts.load('800 104px "Wix Madefor Display"'),
      document.fonts.load('700 34px "Wix Madefor Text"'),
    ]),
    new Promise((r) => setTimeout(r, 1600)),
  ]).catch(() => {});

  ui.loaderProgress(0.24, 'Pouring the concrete…');
  await nextFrame();
  state.stadium = buildStadium(scene, event);

  ui.loaderProgress(0.44, 'Bolting in 24,000 seats…');
  await nextFrame();
  state.records = generateSeats(event);

  ui.loaderProgress(0.6, 'Painting the price tiers…');
  await nextFrame();
  state.seatMesh = buildSeatMesh(state.records);
  scene.add(state.seatMesh);
  state.grid = buildSeatGrid(state.records);

  ui.loaderProgress(0.78, 'Seating the albiceleste crowd…');
  await nextFrame();
  scene.add(buildCrowdMesh(state.records));

  ui.loaderProgress(0.9, 'Warming up the floodlights…');
  await nextFrame();
  ui.initUI(event, actions);
  ui.setRotateOn(controls.autoRotate);

  ui.loaderProgress(1, 'Kick-off!');
  state.mode = 'orbit';
  await nextFrame();
  ui.loaderDone();

  // Warm the Wix ticket catalog once the browser is idle, so the first "Buy
  // this seat" click doesn't pay the product-lookup latency while the arena
  // keeps every frame to itself. Failure is fine — buySeat() retries on demand.
  const warm = () => preloadTickets(event.priceTiers).catch(() => {});
  if (window.requestIdleCallback) requestIdleCallback(warm, { timeout: 4000 });
  else setTimeout(warm, 2000);
}

// ------------------------------------------------------------- render loop

let lastFrame = performance.now();
let elapsed = 0;
// adaptive quality: drop pixel ratio if the frame rate stays low
let fpsEma = 60;

function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt = Math.min((now - lastFrame) / 1000, 0.1);
  lastFrame = now;
  elapsed += dt;

  fpsEma = fpsEma * 0.97 + (1 / Math.max(dt, 1e-4)) * 0.03;
  if (fpsEma < 26 && renderer.getPixelRatio() > 1) {
    renderer.setPixelRatio(1);
    fpsEma = 60;
  }

  stepTween(performance.now());
  if (state.mode === 'orbit') controls.update();
  resolveHover();
  if (state.stadium) state.stadium.update(elapsed, dt);
  renderer.render(scene, camera);
}

boot().catch((err) => {
  console.error(err);
  ui.loaderProgress(1, 'Something went wrong — see the browser console.');
});
animate();
