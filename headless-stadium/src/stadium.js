import * as THREE from 'three';
import { superPoint, loopStrip, loopWall, loopCurve, mulberry32 } from './geom.js';
import { BOWL } from './seats.js';

// ---------------------------------------------------------------- sky + light

function glowMaterial(inner, mid) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, inner);
  grad.addColorStop(0.4, mid);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(c),
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    fog: false, // glows keep their punch through the ground haze
  });
}

function buildSky(scene) {
  // Golden hour: deep blue overhead melting into a warm peach horizon,
  // sun low over the sea side.
  const uniforms = {
    zenith: { value: new THREE.Color('#33619f') },
    horizon: { value: new THREE.Color('#f6d3a4') },
    haze: { value: new THREE.Color('#ffe7c4') },
    sunDir: { value: new THREE.Vector3(-0.6, 0.34, 0.42).normalize() },
    sunColor: { value: new THREE.Color('#ffc97e') },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 zenith; uniform vec3 horizon; uniform vec3 haze;
      uniform vec3 sunDir; uniform vec3 sunColor;
      varying vec3 vDir;
      void main() {
        vec3 dir = normalize(vDir);
        float h = clamp(dir.y, 0.0, 1.0);
        vec3 col = mix(horizon, zenith, pow(h, 0.62));
        // fade below the horizon into warm ground haze instead of a hard line
        col = mix(col, vec3(0.90, 0.83, 0.72), smoothstep(0.0, -0.18, dir.y));
        // soft warm haze band just above the horizon
        col = mix(col, haze, smoothstep(0.26, 0.04, dir.y) * 0.55);
        float d = clamp(dot(dir, sunDir), 0.0, 1.0);
        col += sunColor * (pow(d, 1400.0) * 3.4 + pow(d, 18.0) * 0.45 + pow(d, 3.0) * 0.12);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 40, 24), mat);
  scene.add(sky);

  // soft sun glow low over the Hudson
  const sunGlow = new THREE.Sprite(glowMaterial('rgba(255,232,180,0.95)', 'rgba(255,190,120,0.28)'));
  sunGlow.position.copy(uniforms.sunDir.value).multiplyScalar(760);
  sunGlow.scale.setScalar(300);
  scene.add(sunGlow);

  buildClouds(scene);
  return uniforms.sunDir.value.clone();
}

// Soft billboard clouds drifting high above the city.
function cloudTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const g = c.getContext('2d');
  const rand = mulberry32(0xc10d);
  for (let i = 0; i < 26; i++) {
    const x = 34 + rand() * 188;
    const y = 46 + rand() * 42;
    const r = 12 + rand() * 26;
    const grad = g.createRadialGradient(x, y, 1, x, y, r);
    grad.addColorStop(0, 'rgba(255,248,238,0.5)');
    grad.addColorStop(1, 'rgba(255,248,238,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 128);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildClouds(scene) {
  const tex = cloudTexture();
  const rand = mulberry32(0x51c1);
  for (let i = 0; i < 16; i++) {
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      opacity: 0.38 + rand() * 0.3,
      depthWrite: false,
      fog: false,
      color: '#fff1dc', // sunset-lit undersides
    });
    const s = new THREE.Sprite(mat);
    const t = rand() * Math.PI * 2;
    const r = 460 + rand() * 280;
    s.position.set(Math.cos(t) * r, 140 + rand() * 160, Math.sin(t) * r);
    const w = 170 + rand() * 220;
    s.scale.set(w, w * 0.4, 1);
    scene.add(s);
  }
}

function buildLights(scene, sunDir) {
  const sun = new THREE.DirectionalLight('#ffe0b0', 2.45);
  sun.position.copy(sunDir).multiplyScalar(420);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -160;
  sun.shadow.camera.right = 160;
  sun.shadow.camera.top = 160;
  sun.shadow.camera.bottom = -160;
  sun.shadow.camera.near = 100;
  sun.shadow.camera.far = 800;
  sun.shadow.bias = -0.0006;
  scene.add(sun);
  scene.add(sun.target);

  scene.add(new THREE.HemisphereLight('#d8e0f5', '#8f8371', 1.2));
  const bounce = new THREE.PointLight('#eaf4ff', 90, 190, 1.8);
  bounce.position.set(0, 34, 0);
  scene.add(bounce); // soft skylight wash over the pitch
}

// --------------------------------------------------------------------- pitch

function pitchTexture() {
  const W = 2048;
  const H = 1330; // 105m x 68m ≈ 19.5 px/m
  const px = W / 105;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');

  // mowing stripes along the length
  const stripes = 14;
  for (let i = 0; i < stripes; i++) {
    g.fillStyle = i % 2 ? '#3c9a4b' : '#4bb15c';
    g.fillRect((i * W) / stripes, 0, W / stripes + 1, H);
  }
  // soft vignette so the grass isn't flat
  const grad = g.createRadialGradient(W / 2, H / 2, H / 4, W / 2, H / 2, W / 1.4);
  grad.addColorStop(0, 'rgba(255,250,225,0.09)');
  grad.addColorStop(1, 'rgba(0,30,12,0.16)');
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);

  g.strokeStyle = 'rgba(250,252,255,0.92)';
  g.lineWidth = 3;
  const line = (x0, y0, x1, y1) => {
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(x1, y1);
    g.stroke();
  };
  g.strokeRect(2, 2, W - 4, H - 4);
  line(W / 2, 0, W / 2, H);
  const circle = (x, y, r, a0 = 0, a1 = Math.PI * 2) => {
    g.beginPath();
    g.arc(x, y, r, a0, a1);
    g.stroke();
  };
  circle(W / 2, H / 2, 9.15 * px);
  g.fillStyle = 'rgba(250,252,255,0.92)';
  g.beginPath();
  g.arc(W / 2, H / 2, 4, 0, Math.PI * 2);
  g.fill();

  for (const side of [0, 1]) {
    const dir = side ? -1 : 1;
    const gx = side ? W : 0;
    const bx = (w) => gx + dir * w * px;
    // penalty + six-yard boxes
    g.strokeRect(Math.min(gx, bx(16.5)), H / 2 - 20.16 * px, 16.5 * px * 1, 40.32 * px);
    g.strokeRect(Math.min(gx, bx(5.5)), H / 2 - 9.16 * px, 5.5 * px, 18.32 * px);
    // penalty spot + arc
    g.beginPath();
    g.arc(bx(11), H / 2, 4, 0, Math.PI * 2);
    g.fill();
    circle(bx(11), H / 2, 9.15 * px, side ? Math.PI - 0.93 : -0.93, side ? Math.PI + 0.93 : 0.93);
    // corner arcs
    circle(gx, 2, 1 * px, side ? Math.PI / 2 : 0, side ? Math.PI : Math.PI / 2);
    circle(gx, H - 2, 1 * px, side ? Math.PI : Math.PI * 1.5, side ? Math.PI * 1.5 : Math.PI * 2);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function buildPitch(scene) {
  const tex = pitchTexture();
  const pitch = new THREE.Mesh(
    new THREE.PlaneGeometry(105, 68),
    new THREE.MeshLambertMaterial({ map: tex })
  );
  pitch.rotation.x = -Math.PI / 2;
  pitch.position.y = 0.12; // keep well clear of the apron to avoid z-fighting
  pitch.receiveShadow = true;
  scene.add(pitch);

  // surrounding apron
  const apron = new THREE.Mesh(
    new THREE.PlaneGeometry(160, 122),
    new THREE.MeshLambertMaterial({ color: '#38854a' })
  );
  apron.rotation.x = -Math.PI / 2;
  apron.position.y = 0.01;
  apron.receiveShadow = true;
  scene.add(apron);

  // goals
  const goalMat = new THREE.MeshBasicMaterial({ color: '#f5f7fa' });
  const netMat = new THREE.MeshBasicMaterial({
    color: '#dfe6ef',
    transparent: true,
    opacity: 0.07,
    side: THREE.DoubleSide,
  });
  for (const dir of [-1, 1]) {
    const goal = new THREE.Group();
    const post = new THREE.CylinderGeometry(0.07, 0.07, 2.44, 8);
    for (const zc of [-3.66, 3.66]) {
      const p = new THREE.Mesh(post, goalMat);
      p.position.set(0, 1.22, zc);
      goal.add(p);
    }
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 7.46, 8), goalMat);
    bar.rotation.x = Math.PI / 2;
    bar.position.set(0, 2.44, 0);
    goal.add(bar);
    const net = new THREE.Mesh(new THREE.PlaneGeometry(7.32, 2.3), netMat);
    net.position.set(dir * 1.4, 1.15, 0);
    net.rotation.y = Math.PI / 2;
    goal.add(net);
    goal.position.set(dir * 52.5, 0, 0);
    scene.add(goal);
  }
}

// LED advertising boards around the pitch.
function adBoardTexture(text, fg, bg) {
  const c = document.createElement('canvas');
  c.width = 2048;
  c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = fg;
  g.font = '700 34px "Wix Madefor Text", system-ui, sans-serif';
  g.textBaseline = 'middle';
  let x = 30;
  while (x < c.width) {
    g.fillText(text, x, 34);
    x += g.measureText(text).width + 90;
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildAdBoards(scene, event) {
  // Both sidelines sell Wix Headless; the home end roars for Argentina and the
  // away end keeps a modest board for the travelling Spain fans.
  const texA = adBoardTexture('WIX HEADLESS ◤ BUILD ON YOUR TERMS', '#ffffff', '#116dff');
  const texB = adBoardTexture(`VAMOS ${event.home.name.toUpperCase()} ☀ ALBICELESTE`, '#0c2c4a', '#9fd0f2');
  const texC = adBoardTexture(`¡VAMOS ${event.away.name.toUpperCase()}!`, '#ffffff', '#c8102e');
  const texD = adBoardTexture('WIX.COM/HEADLESS · CMS · COMMERCE · BOOKINGS', '#116dff', '#f2f6fc');
  const mk = (w, tex) =>
    new THREE.Mesh(
      new THREE.PlaneGeometry(w, 0.95),
      new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })
    );
  const boards = [
    { w: 100, x: 0, z: 37.5, ry: Math.PI, tex: texA },
    { w: 100, x: 0, z: -37.5, ry: 0, tex: texD },
    { w: 62, x: 56.5, z: 0, ry: -Math.PI / 2, tex: texB },
    { w: 62, x: -56.5, z: 0, ry: Math.PI / 2, tex: texC },
  ];
  for (const b of boards) {
    const m = mk(b.w, b.tex);
    m.position.set(b.x, 0.5, b.z);
    m.rotation.y = b.ry;
    scene.add(m);
  }
}

// ------------------------------------------------------------ bowl structure

function buildBowl(scene) {
  const { n, a0, b0, tier1, tier2 } = BOWL;
  const concrete = new THREE.MeshLambertMaterial({ color: '#b9c0cf', side: THREE.DoubleSide });
  const concreteDark = new THREE.MeshLambertMaterial({ color: '#8d95a8', side: THREE.DoubleSide });
  const pickSurfaces = [];

  const ramp = (tier) => {
    const g = loopStrip(
      a0 + tier.baseOff - 0.6,
      b0 + tier.baseOff - 0.6,
      tier.baseY - 0.15,
      a0 + tier.baseOff + tier.rows * tier.depth + 0.5,
      b0 + tier.baseOff + tier.rows * tier.depth + 0.5,
      tier.baseY + tier.rows * tier.rise - 0.1,
      n
    );
    const mesh = new THREE.Mesh(g, concrete);
    mesh.receiveShadow = true;
    scene.add(mesh);
    pickSurfaces.push(mesh);
    return mesh;
  };
  ramp(tier1);
  ramp(tier2);

  // walkway between tiers + balcony face
  scene.add(
    new THREE.Mesh(
      loopStrip(
        a0 + tier1.topOff + 0.4, b0 + tier1.topOff + 0.4, tier1.topY,
        a0 + tier2.baseOff - 0.5, b0 + tier2.baseOff - 0.5, tier1.topY,
        n
      ),
      concreteDark
    )
  );
  const balcony = new THREE.Mesh(
    loopWall(a0 + tier2.baseOff - 0.5, b0 + tier2.baseOff - 0.5, tier1.topY, tier2.baseY - 0.05, n),
    concreteDark
  );
  scene.add(balcony);

  // inner wall down to pitch level
  scene.add(
    new THREE.Mesh(loopWall(a0 - 0.8, b0 - 0.8, 0, tier1.baseY - 0.05, n), concreteDark)
  );
  scene.add(
    new THREE.Mesh(
      loopStrip(a0 - 0.8, b0 - 0.8, tier1.baseY - 0.05, a0 - 0.4, b0 - 0.4, tier1.baseY - 0.05, n),
      concreteDark
    )
  );

  // outer facade
  const outA = a0 + tier2.topOff + 2.2;
  const outB = b0 + tier2.topOff + 2.2;
  const facade = new THREE.Mesh(
    loopWall(outA, outB, 0, tier2.topY + 1.6, n),
    new THREE.MeshLambertMaterial({ color: '#e8ebf1', side: THREE.DoubleSide })
  );
  scene.add(facade);
  // seal the gap between the top row and the facade
  scene.add(
    new THREE.Mesh(
      loopStrip(
        a0 + tier2.topOff + 0.4, b0 + tier2.topOff + 0.4, tier2.topY,
        outA, outB, tier2.topY + 1.6, n
      ),
      concreteDark
    )
  );

  // glowing facade band
  const bandCurve = loopCurve(outA + 0.3, outB + 0.3, 11.5, n);
  const band = new THREE.Mesh(
    new THREE.TubeGeometry(bandCurve, 200, 0.22, 6, true),
    new THREE.MeshBasicMaterial({ color: '#116dff', toneMapped: false })
  );
  scene.add(band);

  return { pickSurfaces, outA, outB };
}

function buildRoof(scene, outA, outB) {
  const { n, tier2 } = BOWL;
  // opening clears the whole lower tier so the bowl reads from outside
  const roofInA = BOWL.a0 + 15;
  const roofInB = BOWL.b0 + 15;
  const yIn = tier2.topY + 4.2;
  const yOut = tier2.topY + 8.2;

  const top = new THREE.Mesh(
    loopStrip(roofInA, roofInB, yIn, outA + 6, outB + 6, yOut, n),
    new THREE.MeshLambertMaterial({ color: '#f5f7fb', side: THREE.DoubleSide })
  );
  // no castShadow: a 320m shadow caster turns the pitch into blocky acne
  scene.add(top);
  const under = new THREE.Mesh(
    loopStrip(roofInA, roofInB, yIn - 0.5, outA + 6, outB + 6, yOut - 0.5, n),
    new THREE.MeshLambertMaterial({ color: '#c8cedb', side: THREE.DoubleSide })
  );
  scene.add(under);
  // fascia at the inner opening
  scene.add(
    new THREE.Mesh(
      loopWall(roofInA, roofInB, yIn - 0.5, yIn + 0.35, n),
      new THREE.MeshLambertMaterial({ color: '#9aa2b4', side: THREE.DoubleSide })
    )
  );

  // Wix-blue LED halo under the roof lip — the signature look of the arena
  const halo = new THREE.Mesh(
    new THREE.TubeGeometry(loopCurve(roofInA + 0.6, roofInB + 0.6, yIn - 0.75, n), 220, 0.3, 6, true),
    new THREE.MeshBasicMaterial({ color: '#116dff', toneMapped: false })
  );
  scene.add(halo);

  // glow sprites along the halo (fake bloom)
  const glowMat = glowMaterial('rgba(120,175,255,0.55)', 'rgba(17,109,255,0.16)');
  for (let k = 0; k < 30; k++) {
    const t = (k / 30) * Math.PI * 2;
    const [x, z] = superPoint(roofInA + 0.6, roofInB + 0.6, n, t);
    const s = new THREE.Sprite(glowMat);
    s.position.set(x, yIn - 0.75, z);
    s.scale.setScalar(4.5);
    scene.add(s);
  }

  // leaning support masts around the facade
  const mastMat = new THREE.MeshLambertMaterial({ color: '#aeb5c4' });
  for (let k = 0; k < 16; k++) {
    const t = ((k + 0.5) / 16) * Math.PI * 2;
    const [bx, bz] = superPoint(outA + 8.5, outB + 8.5, n, t);
    const [tx, tz] = superPoint(outA + 5.5, outB + 5.5, n, t);
    const base = new THREE.Vector3(bx, 0, bz);
    const tip = new THREE.Vector3(tx, yOut - 0.2, tz);
    const len = base.distanceTo(tip);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.7, len, 8), mastMat);
    mast.position.copy(base).lerp(tip, 0.5);
    mast.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      tip.clone().sub(base).normalize()
    );
    mast.castShadow = true;
    scene.add(mast);
  }

  return { yIn, roofInA, roofInB };
}

// ---------------------------------------------------------------- lettering

// "WIX HEADLESS STADIUM" written on the stadium itself: across both roof
// sidelines (the aerial money shot) and on all four facade walls.
function letteringTexture(color) {
  const c = document.createElement('canvas');
  c.width = 2048;
  c.height = 256;
  const g = c.getContext('2d');
  g.clearRect(0, 0, c.width, c.height);
  g.fillStyle = color;
  g.font = '800 148px "Wix Madefor Display", system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('WIX HEADLESS STADIUM', 1024, 132, 1960);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function buildLettering(scene, outA, outB, roof) {
  const blue = letteringTexture('#116dff');
  const mkMat = (tex) =>
    new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      alphaTest: 0.05,
      toneMapped: false,
      side: THREE.DoubleSide,
    });

  // roof sidelines — the roof strip runs from roofInB up to outB+6
  const rIn = roof.roofInB;
  const rOut = outB + 6;
  const rMid = (rIn + rOut) / 2;
  const yMid = (roof.yIn + roof.yIn + 4) / 2 + 0.24; // roof rises 4m outward
  const slope = Math.atan(4 / (rOut - rIn));
  for (const dir of [1, -1]) {
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(88, 11), mkMat(blue));
    plane.position.set(0, yMid, dir * rMid);
    plane.rotation.x = -Math.PI / 2 - dir * slope;
    if (dir < 0) plane.rotation.z = Math.PI;
    scene.add(plane);
  }

  // facade bands on all four sides
  const facade = (w, x, z, ry) => {
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 14), mkMat(blue));
    plane.position.set(x, 20.5, z);
    plane.rotation.y = ry;
    scene.add(plane);
  };
  facade(64, 0, outB + 0.5, 0);
  facade(64, 0, -(outB + 0.5), Math.PI);
  facade(48, outA + 0.5, 0, Math.PI / 2);
  facade(48, -(outA + 0.5), 0, -Math.PI / 2);
}

// --------------------------------------------------------------- scoreboards

function scoreboardPainter(event) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 448;
  const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;

  const paint = (clockSec) => {
    g.fillStyle = '#060911';
    g.fillRect(0, 0, c.width, c.height);
    g.strokeStyle = 'rgba(17,109,255,0.6)'; // Wix blue frame
    g.lineWidth = 6;
    g.strokeRect(10, 10, c.width - 20, c.height - 20);

    g.textAlign = 'center';
    g.fillStyle = '#8b93b8';
    g.font = '600 40px "Wix Madefor Text", system-ui, sans-serif';
    g.fillText(event.competition.toUpperCase(), c.width / 2, 78);

    // home side glows albiceleste, away side stays quiet
    g.font = '800 120px "Wix Madefor Display", system-ui, sans-serif';
    g.textAlign = 'right';
    g.fillStyle = '#9fd0f2';
    g.fillText(`${event.home.short}  ${event.score.home}`, c.width / 2 - 34, 222);
    g.textAlign = 'left';
    g.fillStyle = '#e9eef9';
    g.fillText(`${event.score.away}  ${event.away.short}`, c.width / 2 + 34, 222);
    g.textAlign = 'center';
    g.fillText(':', c.width / 2, 216);

    const mm = String(Math.floor(clockSec / 60)).padStart(2, '0');
    const ss = String(Math.floor(clockSec % 60)).padStart(2, '0');
    g.font = '700 92px ui-monospace, monospace';
    g.fillStyle = '#ffc36b';
    g.fillText(`${mm}:${ss}`, c.width / 2, 340);

    g.font = '700 36px "Wix Madefor Text", system-ui, sans-serif';
    g.fillStyle = '#5aa0ff';
    g.fillText('WIX HEADLESS STADIUM', c.width / 2, 408);
    tex.needsUpdate = true;
  };
  paint(event.score.clockStart);
  return { tex, paint };
}

function buildScoreboards(scene, event, roofYIn) {
  const { tex, paint } = scoreboardPainter(event);
  const mat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
  const frameMat = new THREE.MeshLambertMaterial({ color: '#131722' });
  for (const dir of [-1, 1]) {
    const grp = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.BoxGeometry(19, 8.6, 0.8), frameMat);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(18, 7.9), mat);
    screen.position.z = 0.46;
    grp.add(frame, screen);
    for (const off of [-6, 6]) {
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 5.4, 6), frameMat);
      rod.position.set(off, 6.9, 0);
      grp.add(rod);
    }
    grp.position.set(dir * (BOWL.a0 + 17.5), roofYIn - 4.6, 0);
    grp.rotation.y = dir > 0 ? -Math.PI / 2 : Math.PI / 2;
    scene.add(grp);
  }
  let last = -1;
  return (elapsed) => {
    const t = Math.floor(event.score.clockStart + elapsed);
    if (t !== last) {
      last = t;
      paint(t);
    }
  };
}

// ------------------------------------------------------------------- players

function makePlayer(kit, skin) {
  const grp = new THREE.Group();
  const torso = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.26, 0.5, 3, 8),
    new THREE.MeshLambertMaterial({ color: kit.shirt })
  );
  torso.position.y = 1.05;
  const legs = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.14, 0.62, 8),
    new THREE.MeshLambertMaterial({ color: kit.shorts })
  );
  legs.position.y = 0.48;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.17, 10, 8),
    new THREE.MeshLambertMaterial({ color: skin })
  );
  head.position.y = 1.62;
  grp.add(torso, legs, head);
  grp.traverse((o) => (o.castShadow = true));
  return grp;
}

function buildPlayers(scene, event) {
  const rand = mulberry32(event.seed + 7);
  const kits = [
    { shirt: event.home.color, shorts: '#0b1220' },
    { shirt: event.away.color, shorts: '#f1f5f9' },
  ];
  const skins = ['#8d5a3b', '#c68955', '#5c3a24', '#e0ac7e'];
  const players = [];
  for (let team = 0; team < 2; team++) {
    for (let i = 0; i < 7; i++) {
      const p = makePlayer(kits[team], skins[Math.floor(rand() * skins.length)]);
      const bx = (rand() - 0.5) * 84;
      const bz = (rand() - 0.5) * 52;
      p.position.set(bx, 0, bz);
      scene.add(p);
      players.push({
        obj: p,
        bx,
        bz,
        phase: rand() * Math.PI * 2,
        rx: 2.5 + rand() * 5,
        rz: 2.5 + rand() * 5,
        speed: 0.35 + rand() * 0.4,
      });
    }
  }

  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 12, 10),
    new THREE.MeshLambertMaterial({ color: '#f8fafc' })
  );
  ball.castShadow = true;
  scene.add(ball);
  const pass = { from: new THREE.Vector3(0, 0.32, 0), to: new THREE.Vector3(), t: 1, dur: 1.4 };
  const pickTarget = () => {
    const p = players[Math.floor(rand() * players.length)];
    pass.from.copy(ball.position);
    pass.to.set(p.bx + (rand() - 0.5) * 3, 0.32, p.bz + (rand() - 0.5) * 3);
    pass.t = 0;
    pass.dur = 0.9 + rand() * 1.1;
  };
  pickTarget();

  return (elapsed, dt) => {
    for (const p of players) {
      const t = elapsed * p.speed + p.phase;
      const x = p.bx + Math.sin(t) * p.rx;
      const z = p.bz + Math.cos(t * 0.8) * p.rz;
      const dx = x - p.obj.position.x;
      const dz = z - p.obj.position.z;
      p.obj.position.set(x, Math.abs(Math.sin(t * 6)) * 0.07, z);
      if (dx * dx + dz * dz > 1e-6) p.obj.rotation.y = Math.atan2(dx, dz);
    }
    if (pass.t < 1) {
      pass.t = Math.min(1, pass.t + dt / pass.dur);
      const k = pass.t;
      ball.position.lerpVectors(pass.from, pass.to, k);
      ball.position.y = 0.32 + Math.sin(k * Math.PI) * (2 + pass.dur * 2);
      ball.rotation.x += dt * 9;
    } else if (Math.floor(elapsed * 2) % 3 === 0) {
      pickTarget();
    }
  };
}

// ------------------------------------------------------------------ exterior

// Stylized New York around the arena — the 2026 final is in NYC. A
// Manhattan-style street grid of window-lit towers, a supertall midtown
// cluster, landmark spires, a park, piers and the Hudson on the sunset side,
// plus Times-Square-style Wix Headless billboards. All procedural — no
// imported models or photos.

// Facade texture: rows of dusk windows with a solid roof strip at the top of
// the canvas (the tower geometry parks its top face there).
const TOWER_ROOF_PX = 20;

function towerTexture(rows, seed) {
  const rand = mulberry32(0x7071 + seed * 131);
  const W = 128;
  const H = rows * 18 + TOWER_ROOF_PX;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#7d838f'; // roof strip
  g.fillRect(0, 0, W, TOWER_ROOF_PX);
  g.fillStyle = '#454e5e'; // facade
  g.fillRect(0, TOWER_ROOF_PX, W, H - TOWER_ROOF_PX);
  const cols = 7;
  for (let r = 0; r < rows; r++) {
    for (let q = 0; q < cols; q++) {
      const lit = rand() < 0.32; // dusk: plenty of offices still glowing
      if (lit) {
        g.fillStyle = `rgba(255, ${196 + Math.floor(rand() * 30)}, 140, ${0.75 + rand() * 0.25})`;
      } else {
        const b = Math.floor(120 + rand() * 55);
        g.fillStyle = `rgb(${b - 20}, ${b}, ${b + 22})`;
      }
      g.fillRect(6 + q * 17.4, TOWER_ROOF_PX + 5 + r * 18, 10, 9);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Unit box whose top/bottom faces sample the texture's roof strip so
// instanced towers don't grow windows on their roofs.
function towerGeometry(rows) {
  const H = rows * 18 + TOWER_ROOF_PX;
  const sideVMax = 1 - TOWER_ROOF_PX / H;
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const uv = geo.attributes.uv;
  for (let f = 0; f < 6; f++) {
    for (let k = 0; k < 4; k++) {
      const i = f * 4 + k;
      if (f === 2 || f === 3) {
        uv.setXY(i, 0.4 + 0.02 * k, sideVMax + (1 - sideVMax) * 0.55);
      } else {
        uv.setXY(i, uv.getX(i), uv.getY(i) * sideVMax);
      }
    }
  }
  return geo;
}

// Instance tints over the neutral facade texture.
const TOWER_TINTS = [
  [0.94, 0.96, 1.0], // steel
  [1.0, 0.85, 0.72], // brick
  [1.0, 0.95, 0.84], // limestone
  [0.8, 0.88, 1.0], // blue glass
  [0.9, 0.9, 0.94], // concrete
];

// One tile = one city block: lighter block interior, darker avenues along
// two edges, faint lane lines. Tiled over the ground it reads as the grid.
function streetsTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#71747c';
  g.fillRect(0, 0, 256, 256);
  const rand = mulberry32(0xa5f);
  for (let i = 0; i < 900; i++) {
    g.fillStyle = `rgba(28,30,36,${0.04 + rand() * 0.07})`;
    g.fillRect(rand() * 256, rand() * 256, 2, 2);
  }
  g.fillStyle = '#4a4d54';
  g.fillRect(0, 0, 256, 16);
  g.fillRect(0, 0, 16, 256);
  g.fillStyle = 'rgba(235,225,200,0.3)';
  g.fillRect(0, 7, 256, 2);
  g.fillRect(7, 0, 2, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function plazaTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#c9c0b0';
  g.fillRect(0, 0, 512, 512);
  const rand = mulberry32(0x9a7a);
  for (let i = 0; i < 2600; i++) {
    const v = Math.floor(rand() * 40);
    g.fillStyle = `rgba(${120 + v}, ${112 + v}, ${96 + v}, ${0.1 + rand() * 0.12})`;
    g.fillRect(rand() * 512, rand() * 512, 2, 2);
  }
  g.strokeStyle = 'rgba(70,62,48,0.12)'; // pavers
  g.lineWidth = 1;
  for (let k = 0; k <= 16; k++) {
    g.beginPath();
    g.moveTo(k * 32, 0);
    g.lineTo(k * 32, 512);
    g.stroke();
    g.beginPath();
    g.moveTo(0, k * 32);
    g.lineTo(512, k * 32);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(7, 7);
  return tex;
}

function signTexture(text, fg, bg) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 192;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, 1024, 192);
  g.fillStyle = fg;
  g.font = '800 92px "Wix Madefor Display", system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 512, 104, 980);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Times-Square-style tower with a glowing billboard aimed at the stadium.
function billboardTower(scene, x, z, tex) {
  const h = 50 + Math.hypot(x, z) * 0.02;
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(20, h, 16),
    new THREE.MeshLambertMaterial({ color: '#3d434f' })
  );
  body.position.set(x, h / 2, z);
  scene.add(body);
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 5.6),
    new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })
  );
  sign.position.set(x, h + 3.6, z);
  sign.lookAt(0, 30, 0);
  scene.add(sign);
  const glow = new THREE.Sprite(glowMaterial('rgba(255,255,255,0.35)', 'rgba(140,190,255,0.12)'));
  glow.position.set(x, h + 3.6, z);
  glow.scale.set(38, 12, 1);
  scene.add(glow);
}

// Two unmistakable silhouettes on the skyline.
function buildLandmarks(scene) {
  // Empire-style stepped stone spire
  const stone = new THREE.MeshLambertMaterial({ color: '#a99b85' });
  const empire = new THREE.Group();
  let y = 0;
  for (const [w, h, d] of [[44, 30, 34], [30, 42, 24], [18, 30, 15]]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), stone);
    b.position.y = y + h / 2;
    empire.add(b);
    y += h;
  }
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 3, 24, 6), stone);
  spire.position.y = y + 12;
  empire.add(spire);
  const tip = new THREE.Sprite(glowMaterial('rgba(255,220,170,0.9)', 'rgba(255,190,120,0.2)'));
  tip.position.y = y + 26;
  tip.scale.setScalar(10);
  empire.add(tip);
  empire.position.set(430, 0, -110);
  scene.add(empire);

  // One-WTC-style tapered glass spire
  const wtc = new THREE.Mesh(
    new THREE.CylinderGeometry(9, 15, 130, 4, 1),
    new THREE.MeshLambertMaterial({ color: '#8ea3bd', flatShading: true })
  );
  wtc.rotation.y = Math.PI / 4;
  wtc.position.set(540, 65, 150);
  scene.add(wtc);
  const antenna = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.9, 34, 5),
    new THREE.MeshLambertMaterial({ color: '#5b6472' })
  );
  antenna.position.set(540, 147, 150);
  scene.add(antenna);
}

function buildCity(scene, outA, outB) {
  // street grid stretching into the haze
  const streets = streetsTexture();
  streets.repeat.set(1880 / 64, 1880 / 64);
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(940, 64),
    new THREE.MeshLambertMaterial({ map: streets })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.3;
  ground.receiveShadow = true;
  scene.add(ground);

  // stadium plaza + ring road
  const plaza = new THREE.Mesh(
    new THREE.CircleGeometry(178, 64),
    new THREE.MeshLambertMaterial({ map: plazaTexture() })
  );
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.y = -0.05;
  plaza.receiveShadow = true;
  scene.add(plaza);
  const road = new THREE.Mesh(
    new THREE.RingGeometry(179, 196, 96),
    new THREE.MeshLambertMaterial({ color: '#4a4d54' })
  );
  road.rotation.x = -Math.PI / 2;
  road.position.y = -0.04;
  scene.add(road);

  // the Hudson on the sunset side, with piers and a sun-glitter path
  const river = new THREE.Mesh(
    new THREE.PlaneGeometry(760, 1900),
    new THREE.MeshLambertMaterial({ color: '#3d7191' })
  );
  river.rotation.x = -Math.PI / 2;
  river.position.set(-625, -0.2, 0);
  scene.add(river);
  const glitter = new THREE.Mesh(
    new THREE.PlaneGeometry(430, 30),
    new THREE.MeshBasicMaterial({ color: '#ffe9c4', transparent: true, opacity: 0.4, toneMapped: false })
  );
  glitter.rotation.x = -Math.PI / 2;
  glitter.rotation.z = -0.62;
  glitter.position.set(-500, -0.1, 300);
  scene.add(glitter);
  const pierMat = new THREE.MeshLambertMaterial({ color: '#6b6e76' });
  for (const pz of [-180, 40, 240]) {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(64, 1.2, 12), pierMat);
    pier.position.set(-278, 0.3, pz);
    scene.add(pier);
  }

  // towers on the grid — bucketed into three InstancedMeshes by height so
  // ~200 buildings cost three draw calls
  const rand = mulberry32(0x90210);
  const buckets = { low: [], mid: [], tall: [] };
  for (let gx = -4; gx <= 9; gx++) {
    for (let gz = -9; gz <= 9; gz++) {
      const cx = gx * 64 + 32;
      const cz = gz * 64 + 32;
      const r = Math.hypot(cx, cz);
      if (r < 240 || r > 680) continue;
      if (cx < -230) continue; // the Hudson
      if (cx > -30 && cx < 300 && cz > 270 && cz < 460) continue; // the park
      const midtown = cx > 260 && Math.abs(cz) < 210;
      const nTowers = 1 + (rand() < 0.5 ? 1 : 0);
      for (let i = 0; i < nTowers; i++) {
        let h, bucket;
        if (midtown && rand() < 0.6) {
          h = 70 + rand() * 85;
          bucket = 'tall';
        } else if (rand() < 0.45) {
          h = 40 + rand() * 34;
          bucket = 'mid';
        } else {
          h = 16 + rand() * 22;
          bucket = 'low';
        }
        buckets[bucket].push({
          x: cx + (rand() - 0.5) * 22,
          z: cz + (rand() - 0.5) * 22,
          w: 20 + rand() * 20,
          d: 20 + rand() * 20,
          h,
          tint: TOWER_TINTS[Math.floor(rand() * TOWER_TINTS.length)],
        });
      }
    }
  }
  const rowsFor = { low: 5, mid: 10, tall: 18 };
  Object.entries(buckets).forEach(([key, lots], bi) => {
    if (!lots.length) return;
    const mesh = new THREE.InstancedMesh(
      towerGeometry(rowsFor[key]),
      new THREE.MeshLambertMaterial({ map: towerTexture(rowsFor[key], bi + 1) }),
      lots.length
    );
    const m = new THREE.Matrix4();
    const col = new THREE.Color();
    lots.forEach((L, i) => {
      m.makeScale(L.w, L.h, L.d);
      m.setPosition(L.x, L.h / 2 - 0.2, L.z);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, col.setRGB(L.tint[0], L.tint[1], L.tint[2]));
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
    scene.add(mesh);
  });

  buildLandmarks(scene);

  // Times-Square-style billboards facing the arena
  billboardTower(scene, 265, -145, signTexture('WIX HEADLESS', '#ffffff', '#116dff'));
  billboardTower(scene, 215, 235, signTexture('VAMOS ARGENTINA', '#0c2c4a', '#9fd0f2'));
  billboardTower(scene, -95, -290, signTexture('WORLD CUP FINAL · NYC', '#ffffff', '#0c1220'));

  // a green park with instanced trees, plus street trees around the plaza
  const park = new THREE.Mesh(
    new THREE.PlaneGeometry(330, 190),
    new THREE.MeshLambertMaterial({ color: '#5f8a4e' })
  );
  park.rotation.x = -Math.PI / 2;
  park.position.set(135, -0.22, 365);
  scene.add(park);

  const trunkGeo = new THREE.CylinderGeometry(0.28, 0.42, 3.2, 5);
  trunkGeo.translate(0, 1.6, 0);
  const crownGeo = new THREE.IcosahedronGeometry(2.9, 0);
  crownGeo.scale(1, 1.2, 1);
  crownGeo.translate(0, 5, 0);
  const NTREES = 140;
  const trunks = new THREE.InstancedMesh(
    trunkGeo,
    new THREE.MeshLambertMaterial({ color: '#6b533d' }),
    NTREES
  );
  const crowns = new THREE.InstancedMesh(crownGeo, new THREE.MeshLambertMaterial(), NTREES);
  const tm = new THREE.Matrix4();
  const tcol = new THREE.Color();
  const greens = ['#4d7a3f', '#5d8a4a', '#6e9c52', '#42683a'];
  for (let i = 0; i < NTREES; i++) {
    let x, z;
    if (i < 95) {
      x = 135 + (rand() - 0.5) * 310;
      z = 365 + (rand() - 0.5) * 170;
    } else {
      const t = rand() * Math.PI * 2;
      const rr = 202 + rand() * 26;
      x = Math.cos(t) * rr;
      z = Math.sin(t) * rr;
    }
    const s = 0.85 + rand() * 1.1;
    tm.makeScale(s, s * (0.9 + rand() * 0.3), s);
    tm.setPosition(x, -0.15, z);
    trunks.setMatrixAt(i, tm);
    crowns.setMatrixAt(i, tm);
    crowns.setColorAt(i, tcol.set(greens[Math.floor(rand() * greens.length)]).multiplyScalar(0.85 + rand() * 0.3));
  }
  trunks.instanceMatrix.needsUpdate = true;
  crowns.instanceMatrix.needsUpdate = true;
  crowns.instanceColor.needsUpdate = true;
  scene.add(trunks, crowns);

  // fan-zone flag poles around the stadium — a sea of Argentina with the odd
  // Spain flag for the travelling support
  const poleMat = new THREE.MeshLambertMaterial({ color: '#9aa2b4' });
  const flagGeo = new THREE.PlaneGeometry(3.6, 2.3, 8, 1);
  flagGeo.translate(1.8, 0, 0);
  const flagMats = [flagTexture('esp'), flagTexture('arg')].map(
    (tex) => new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide })
  );
  for (let k = 0; k < 14; k++) {
    const t = (k / 14) * Math.PI * 2 + 0.11;
    const [x, z] = superPoint(outA + 34, outB + 30, 2.4, t);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 10.5, 6), poleMat);
    pole.position.set(x, 5.25, z);
    const flag = new THREE.Mesh(flagGeo, flagMats[k % 4 === 0 ? 0 : 1]);
    flag.position.set(x, 9.4, z);
    flag.rotation.y = t + Math.PI / 2;
    scene.add(pole, flag);
  }
}

// Simple procedural national flags for the fan-zone poles.
function flagTexture(team) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 160;
  const g = c.getContext('2d');
  if (team === 'esp') {
    g.fillStyle = '#c8102e';
    g.fillRect(0, 0, 256, 160);
    g.fillStyle = '#ffc400';
    g.fillRect(0, 40, 256, 80);
  } else {
    g.fillStyle = '#74acdf';
    g.fillRect(0, 0, 256, 160);
    g.fillStyle = '#ffffff';
    g.fillRect(0, 53, 256, 54);
    g.fillStyle = '#f6b40e';
    g.beginPath();
    g.arc(128, 80, 14, 0, Math.PI * 2);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ------------------------------------------------------------------ assemble

export function buildStadium(scene, event) {
  const sunDir = buildSky(scene);
  buildLights(scene, sunDir);
  // warm haze that melts the city into the horizon
  scene.fog = new THREE.FogExp2('#eedcc0', 0.0011);

  buildPitch(scene);
  buildAdBoards(scene, event);
  const { pickSurfaces, outA, outB } = buildBowl(scene);
  const roof = buildRoof(scene, outA, outB);
  buildLettering(scene, outA, outB, roof);
  const updateScoreboard = buildScoreboards(scene, event, roof.yIn);
  const updatePlayers = buildPlayers(scene, event);
  buildCity(scene, outA, outB);

  return {
    pickSurfaces,
    update(elapsed, dt) {
      updateScoreboard(elapsed);
      updatePlayers(elapsed, dt);
    },
  };
}
