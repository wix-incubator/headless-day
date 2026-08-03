import { useEffect, useRef, useState } from 'react';

/* ─── Design canvas constants ─── */
const SIZE = 480;

const INKS = [
  { name: 'Olive', hex: '#535e3a' },
  { name: 'Brown', hex: '#5a4632' },
  { name: 'Terracotta', hex: '#b5532e' },
  { name: 'Ink black', hex: '#2b2316' },
  { name: 'Navy', hex: '#1e3054' },
];

const STAMP_SHAPES = [
  { id: 'circle', label: '⬤', title: 'Circle' },
  { id: 'oval', label: '⬭', title: 'Oval' },
  { id: 'rounded-rect', label: '▬', title: 'Rounded' },
  { id: 'hexagon', label: '⬡', title: 'Hexagon' },
  { id: 'diamond', label: '◆', title: 'Diamond' },
] as const;
type StampShape = (typeof STAMP_SHAPES)[number]['id'];

/* ─── 3-D preview constants ─── */
type BaseShape   = 'rect' | 'square' | 'circle';
type HandleShape = 'round' | 'square';
type WoodTone    = 'light' | 'dark';

const BASE_SHAPES: { id: BaseShape; label: string }[] = [
  { id: 'rect',   label: 'Rectangular' },
  { id: 'square', label: 'Square' },
  { id: 'circle', label: 'Round' },
];
const HANDLE_SHAPES: { id: HandleShape; label: string }[] = [
  { id: 'round',  label: 'Round (turned)' },
  { id: 'square', label: 'Square block' },
];
const RUBBER_COLORS = [
  { name: 'Charcoal', hex: '#2d2416' },
  { name: 'Forest',   hex: '#2a4428' },
  { name: 'Navy',     hex: '#1a2a4e' },
  { name: 'Burgundy', hex: '#5c1c1c' },
  { name: 'Terracotta', hex: '#b04c28' },
  { name: 'Slate',    hex: '#354454' },
];

/* ─── Stamp-face shape path ─── */
function buildShapePath(
  ctx: CanvasRenderingContext2D, shape: StampShape,
  cx: number, cy: number, r: number,
) {
  ctx.beginPath();
  switch (shape) {
    case 'circle': ctx.arc(cx, cy, r, 0, Math.PI*2); break;
    case 'oval':   ctx.ellipse(cx, cy, r, r*0.72, 0, 0, Math.PI*2); break;
    case 'rounded-rect': {
      const w=r*1.85, h=r*1.45, rad=r*0.18;
      if ((ctx as any).roundRect) (ctx as any).roundRect(cx-w/2,cy-h/2,w,h,rad);
      else { ctx.moveTo(cx-w/2+rad,cy-h/2); ctx.arcTo(cx+w/2,cy-h/2,cx+w/2,cy+h/2,rad); ctx.arcTo(cx+w/2,cy+h/2,cx-w/2,cy+h/2,rad); ctx.arcTo(cx-w/2,cy+h/2,cx-w/2,cy-h/2,rad); ctx.arcTo(cx-w/2,cy-h/2,cx+w/2,cy-h/2,rad); ctx.closePath(); }
      break;
    }
    case 'hexagon':
      for (let i=0;i<6;i++){const a=(i*Math.PI)/3-Math.PI/6; i===0?ctx.moveTo(cx+r*Math.cos(a),cy+r*Math.sin(a)):ctx.lineTo(cx+r*Math.cos(a),cy+r*Math.sin(a));} ctx.closePath(); break;
    case 'diamond':
      ctx.moveTo(cx,cy-r); ctx.lineTo(cx+r*0.72,cy); ctx.lineTo(cx,cy+r); ctx.lineTo(cx-r*0.72,cy); ctx.closePath(); break;
  }
}

function arcText(ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number, radius: number, top: boolean) {
  if (!text) return;
  const chars = text.toUpperCase().split('');
  const per = 0.16, total = chars.length * per;
  ctx.save(); ctx.translate(cx, cy);
  if (top) {
    let a = -Math.PI/2 - total/2 + per/2;
    for (const ch of chars) { ctx.save(); ctx.rotate(a); ctx.translate(0,-radius); ctx.fillText(ch,0,0); ctx.restore(); a+=per; }
  } else {
    let a = Math.PI/2 + total/2 - per/2;
    for (const ch of chars) { ctx.save(); ctx.rotate(a); ctx.translate(0,radius); ctx.rotate(Math.PI); ctx.fillText(ch,0,0); ctx.restore(); a-=per; }
  }
  ctx.restore();
}

/* ══════════════════════════════════════════════════════
   THREE.JS  —  loaded once from CDN (r128)
   ══════════════════════════════════════════════════════ */
let threePromise: Promise<any> | null = null;
function loadThree(): Promise<any> {
  const w = window as any;
  if (w.THREE) return Promise.resolve(w.THREE);
  if (!threePromise) {
    threePromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
      s.async = true;
      s.onload = () => resolve(w.THREE);
      s.onerror = () => reject(new Error('Failed to load three.js'));
      document.head.appendChild(s);
    });
  }
  return threePromise;
}

interface StampCfg { base: BaseShape; handle: HandleShape; wood: WoodTone; rubber: string; }

/* Build the whole stamp as a centred THREE.Group.
   Y axis = stamp axis: rubber sole at bottom, wooden body, then handle on top.
   The design canvas is textured onto the working (bottom) face. */
function buildStamp(THREE: any, cfg: StampCfg, designCanvas: HTMLCanvasElement | null) {
  const g = new THREE.Group();

  const woodColor = cfg.wood === 'light' ? 0xdfc396 : 0x7a5230;
  const woodMat = new THREE.MeshStandardMaterial({ color: woodColor, roughness: 0.7, metalness: 0.02 });
  const rubberMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(cfg.rubber), roughness: 0.86, metalness: 0.0 });

  const round = cfg.base === 'circle';
  const bodyH = 0.85, rubH = 0.2, over = 0.06;

  let bodyMesh: any, soleMesh: any, faceGeo: any;
  if (round) {
    const R = 0.92;
    bodyMesh = new THREE.Mesh(new THREE.CylinderGeometry(R, R, bodyH, 56), woodMat);
    soleMesh = new THREE.Mesh(new THREE.CylinderGeometry(R + over, R + over, rubH, 56), rubberMat);
    faceGeo  = new THREE.CircleGeometry(R + over - 0.02, 56);
  } else {
    const bw = cfg.base === 'rect' ? 2.0 : 1.5;
    const bd = cfg.base === 'rect' ? 1.25 : 1.5;
    bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(bw, bodyH, bd), woodMat);
    soleMesh = new THREE.Mesh(new THREE.BoxGeometry(bw + over, rubH, bd + over), rubberMat);
    faceGeo  = new THREE.PlaneGeometry(bw + over - 0.04, bd + over - 0.04);
  }
  soleMesh.position.y = rubH / 2;
  bodyMesh.position.y = rubH + bodyH / 2;
  soleMesh.castShadow = true; soleMesh.receiveShadow = true;
  bodyMesh.castShadow = true; bodyMesh.receiveShadow = true;
  g.add(soleMesh, bodyMesh);

  /* design on the working face (bottom, normal pointing down) */
  if (designCanvas) {
    const tex = new THREE.CanvasTexture(designCanvas);
    tex.anisotropy = 4;
    const faceMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.62, metalness: 0.0, side: THREE.DoubleSide });
    const face = new THREE.Mesh(faceGeo, faceMat);
    face.rotation.x = Math.PI / 2;   // normal → -Y (faces down)
    face.position.y = -0.004;         // just below the rubber sole so it reads as the working face
    g.add(face);
  }

  /* handle sits on top of the wooden body */
  const topY = rubH + bodyH;
  let handleMesh: any, handleH: number;
  if (cfg.handle === 'round') {
    const pts = [
      new THREE.Vector2(0.00, 0.00),
      new THREE.Vector2(0.36, 0.00),
      new THREE.Vector2(0.33, 0.11),
      new THREE.Vector2(0.16, 0.30),
      new THREE.Vector2(0.12, 0.52),
      new THREE.Vector2(0.27, 0.72),
      new THREE.Vector2(0.40, 0.90),
      new THREE.Vector2(0.37, 1.08),
      new THREE.Vector2(0.21, 1.20),
      new THREE.Vector2(0.00, 1.25),
    ];
    handleH = 1.25;
    handleMesh = new THREE.Mesh(new THREE.LatheGeometry(pts, 56), woodMat);
    handleMesh.position.y = topY;
  } else {
    handleH = 1.15;
    handleMesh = new THREE.Mesh(new THREE.BoxGeometry(0.62, handleH, 0.62), woodMat);
    handleMesh.position.y = topY + handleH / 2;
  }
  handleMesh.castShadow = true; handleMesh.receiveShadow = true;
  g.add(handleMesh);

  /* centre the group vertically around the origin */
  g.position.y = -(rubH + bodyH + handleH) / 2;
  return g;
}

/* ══════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════ */
interface Props { bookingHref?: string; }

export default function ExLibrisStudio({ bookingHref }: Props) {
  /* design state */
  const designRef   = useRef<HTMLCanvasElement>(null);
  const [uploadedImg, setUploadedImg] = useState<HTMLImageElement | null>(null);
  const [ink, setInk]                 = useState(INKS[3].hex);
  const [threshold, setThreshold]     = useState(150);
  const [name, setName]               = useState('Your Name');
  const [stampShape, setStampShape]   = useState<StampShape>('circle');
  const [ready, setReady]             = useState(false);

  /* 3-D state */
  const [base,   setBase]   = useState<BaseShape>('rect');
  const [handle, setHandle] = useState<HandleShape>('round');
  const [wood,   setWood]   = useState<WoodTone>('light');
  const [rubber, setRubber] = useState(RUBBER_COLORS[0].hex);

  /* tab */
  const [tab, setTab] = useState<'design'|'preview'>('preview');

  /* three.js scene handles */
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<any>(null);
  const [sceneReady, setSceneReady] = useState(false);

  /* seed a default artwork so the 3-D stamp shows a design on first view */
  useEffect(() => {
    const img = new Image();
    img.onload = () => { setUploadedImg(img); setReady(true); };
    img.src = '/ex-libris-default.png';
  }, []);

  /* ── draw design canvas ── */
  useEffect(() => {
    const canvas = designRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const cx=SIZE/2, cy=SIZE/2, outer=SIZE/2-12, innerR=outer-70;
    ctx.clearRect(0,0,SIZE,SIZE);

    buildShapePath(ctx, stampShape, cx, cy, outer);
    ctx.fillStyle='#f6efe0'; ctx.fill();
    ctx.save();
    buildShapePath(ctx, stampShape, cx, cy, outer);
    ctx.clip();

    if (uploadedImg) {
      const off=document.createElement('canvas'); off.width=SIZE; off.height=SIZE;
      const octx=off.getContext('2d')!;
      const sc=Math.min((innerR*2)/uploadedImg.width,(innerR*2)/uploadedImg.height);
      octx.drawImage(uploadedImg,cx-uploadedImg.width*sc/2,cy-uploadedImg.height*sc/2,uploadedImg.width*sc,uploadedImg.height*sc);
      const d=octx.getImageData(0,0,SIZE,SIZE); const px=d.data;
      const [ir,ig,ib]=[parseInt(ink.slice(1,3),16),parseInt(ink.slice(3,5),16),parseInt(ink.slice(5,7),16)];
      for(let i=0;i<px.length;i+=4){
        const lum=0.299*px[i]+0.587*px[i+1]+0.114*px[i+2];
        if(px[i+3]>10&&lum<threshold){px[i]=ir;px[i+1]=ig;px[i+2]=ib;px[i+3]=255;}else{px[i+3]=0;}
      }
      octx.putImageData(d,0,0);
      ctx.save(); ctx.beginPath(); ctx.arc(cx,cy,innerR+8,0,Math.PI*2); ctx.clip(); ctx.drawImage(off,0,0); ctx.restore();
    } else {
      ctx.save(); ctx.fillStyle=ink; ctx.globalAlpha=0.4; ctx.textAlign='center';
      ctx.font=`italic 18px 'Fraunces',serif`; ctx.fillText('upload art',cx,cy-5);
      ctx.font=`12px 'Inter',sans-serif`; ctx.fillText('to place it here',cx,cy+16); ctx.restore();
    }

    ctx.strokeStyle=ink; ctx.lineWidth=3.5;
    ctx.beginPath(); ctx.arc(cx,cy,outer-5,0,Math.PI*2); ctx.stroke();
    ctx.lineWidth=1.8;
    ctx.beginPath(); ctx.arc(cx,cy,outer-32,0,Math.PI*2); ctx.stroke();

    ctx.fillStyle=ink; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.font=`600 24px 'Fraunces',serif`; arcText(ctx,'Ex Libris',cx,cy,outer-18,true);
    ctx.font=`600 18px 'Fraunces',serif`; arcText(ctx,name||'',cx,cy,outer-19,false);
    ctx.font=`16px serif`; ctx.fillText('❧',cx-outer+24,cy); ctx.fillText('❧',cx+outer-24,cy);

    ctx.restore();
    buildShapePath(ctx,stampShape,cx,cy,outer);
    ctx.strokeStyle=ink; ctx.lineWidth=3.5; ctx.stroke();
  }, [uploadedImg, ink, threshold, name, stampShape]);

  /* ── init three.js scene once the preview tab is first shown ── */
  useEffect(() => {
    if (tab !== 'preview' || sceneRef.current) return;
    const mount = mountRef.current; if (!mount) return;
    let cancelled = false;

    loadThree().then((THREE) => {
      if (cancelled || !mountRef.current) return;

      const W = 380, H = 420;
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(W, H);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.08;
      renderer.domElement.className = 'els-3d-canvas';
      mountRef.current.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 50);
      camera.position.set(0, 0.55, 5.6);
      camera.lookAt(0, 0, 0);

      scene.add(new THREE.AmbientLight(0xfff2dc, 0.42));
      const key = new THREE.DirectionalLight(0xfff4e2, 1.35);
      key.position.set(3.5, 6, 4.5);
      key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024);
      key.shadow.camera.near = 1; key.shadow.camera.far = 20;
      key.shadow.camera.left = key.shadow.camera.bottom = -5;
      key.shadow.camera.right = key.shadow.camera.top = 5;
      key.shadow.bias = -0.0004;
      scene.add(key);
      const fill = new THREE.DirectionalLight(0xffd9a8, 0.35);
      fill.position.set(-3, 2, 3); scene.add(fill);
      const rim = new THREE.DirectionalLight(0x9fb8ff, 0.2);
      rim.position.set(0, 2, -4); scene.add(rim);

      /* soft shadow-catching floor */
      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(20, 20),
        new THREE.ShadowMaterial({ opacity: 0.22 }),
      );
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -1.75;
      floor.receiveShadow = true;
      scene.add(floor);

      const pivot = new THREE.Group();     // spins around world-Y
      const tilt  = new THREE.Group();      // fixed forward tilt
      tilt.rotation.x = -1.02;
      pivot.add(tilt);
      scene.add(pivot);

      sceneRef.current = { THREE, renderer, scene, camera, pivot, tilt, raf: 0, t: 0 };

      const tick = () => {
        const s = sceneRef.current; if (!s) return;
        s.raf = requestAnimationFrame(tick);
        s.t += 0.006;
        s.pivot.rotation.y = Math.sin(s.t * 0.5) * 0.6;
        s.tilt.rotation.x = -1.02 + Math.sin(s.t * 0.4) * 0.05;
        s.renderer.render(s.scene, s.camera);
      };
      tick();
      setSceneReady(true);
    }).catch(() => {});

    return () => {
      cancelled = true;
      setSceneReady(false);
      const s = sceneRef.current;
      if (s) {
        cancelAnimationFrame(s.raf);
        s.renderer.dispose();
        s.renderer.domElement.remove();
        sceneRef.current = null;
      }
    };
  }, [tab]);

  /* ── (re)build the stamp whenever config or design changes ── */
  useEffect(() => {
    if (tab !== 'preview') return;
    const s = sceneRef.current; if (!s) return;
    const { THREE, tilt } = s;

    while (tilt.children.length) {
      const c = tilt.children.pop();
      c.traverse?.((o: any) => {
        o.geometry?.dispose?.();
        if (o.material) {
          o.material.map?.dispose?.();
          o.material.dispose?.();
        }
      });
    }
    tilt.add(buildStamp(THREE, { base, handle, wood, rubber }, designRef.current));
  }, [tab, sceneReady, base, handle, wood, rubber, uploadedImg, ink, threshold, name, stampShape]);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { setUploadedImg(image); setReady(true); URL.revokeObjectURL(url); };
    image.src = url;
  }

  function download() {
    const c = designRef.current; if (!c) return;
    const a = document.createElement('a'); a.download='warm-shelf-ex-libris.png'; a.href=c.toDataURL('image/png'); a.click();
  }

  function bookSession() {
    try { sessionStorage.setItem('els-preview', designRef.current?.toDataURL('image/png',0.8)??''); } catch {}
    window.location.href = bookingHref ?? '/services';
  }

  return (
    <div className="els">
      {/* ── tabs ── */}
      <div className="els-tabs">
        <button className={`els-tab${tab==='design'?' on':''}`} onClick={()=>setTab('design')}>✏ Design</button>
        <button className={`els-tab${tab==='preview'?' on':''}`} onClick={()=>setTab('preview')}>⬛ 3D stamp</button>
      </div>

      {/* ── left: canvas ── */}
      <div className="els-left">
        <div className={`els-canvas-wrap${tab==='design'?' active':''}`}>
          <div className="els-wood">
            <canvas ref={designRef} width={SIZE} height={SIZE} className="els-canvas" />
          </div>
        </div>

        <div className={`els-preview-wrap${tab==='preview'?' active':''}`}>
          <div ref={mountRef} className="els-3d-mount" />
        </div>

        <div className="els-actions">
          <button className="btn-sm" onClick={download} disabled={!ready}>↓ PNG</button>
          <button className="btn-sm btn-sm-accent" onClick={bookSession}>Book a session →</button>
        </div>
      </div>

      {/* ── right: controls ── */}
      <div className="els-controls">
        {tab === 'design' ? (<>
          <div className="field">
            <label htmlFor="els-file">1 · Upload artwork</label>
            <input id="els-file" type="file" accept="image/*" onChange={onFile} />
            <span className="els-tip">Bold, high-contrast art works best.</span>
          </div>
          <div className="field">
            <label htmlFor="els-name">2 · Name on the plate</label>
            <input id="els-name" value={name} maxLength={22} onChange={e=>setName(e.target.value)} />
          </div>
          <div className="field">
            <label>3 · Design shape</label>
            <div className="shape-row">
              {STAMP_SHAPES.map(s=>(
                <button key={s.id} type="button" title={s.title}
                  className={`shape-btn${stampShape===s.id?' on':''}`}
                  onClick={()=>setStampShape(s.id)}>
                  <span className="shape-glyph">{s.label}</span>
                  <span className="shape-label">{s.title}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label>4 · Ink colour</label>
            <div className="swatch-row">
              {INKS.map(c=>(
                <button key={c.hex} type="button" aria-label={c.name}
                  className={`swatch${ink===c.hex?' on':''}`}
                  style={{background:c.hex}} onClick={()=>setInk(c.hex)} />
              ))}
            </div>
          </div>
          <div className="field">
            <label htmlFor="els-thr">5 · Detail / coverage</label>
            <input id="els-thr" type="range" min={60} max={230} value={threshold} onChange={e=>setThreshold(Number(e.target.value))} />
          </div>
        </>) : (<>
          <div className="field">
            <label>Base shape</label>
            <div className="btn-group">
              {BASE_SHAPES.map(b=>(
                <button key={b.id} type="button"
                  className={`grp-btn${base===b.id?' on':''}`}
                  onClick={()=>setBase(b.id)}>{b.label}</button>
              ))}
            </div>
          </div>
          <div className="field">
            <label>Handle</label>
            <div className="btn-group">
              {HANDLE_SHAPES.map(h=>(
                <button key={h.id} type="button"
                  className={`grp-btn${handle===h.id?' on':''}`}
                  onClick={()=>setHandle(h.id)}>{h.label}</button>
              ))}
            </div>
          </div>
          <div className="field">
            <label>Wood</label>
            <div className="btn-group">
              <button type="button" className={`grp-btn wood-light${wood==='light'?' on':''}`} onClick={()=>setWood('light')}>Light birch</button>
              <button type="button" className={`grp-btn wood-dark${wood==='dark'?' on':''}`}  onClick={()=>setWood('dark')}>Dark walnut</button>
            </div>
          </div>
          <div className="field">
            <label>Rubber colour</label>
            <div className="swatch-row">
              {RUBBER_COLORS.map(c=>(
                <button key={c.hex} type="button" aria-label={c.name}
                  className={`swatch${rubber===c.hex?' on':''}`}
                  style={{background:c.hex}} onClick={()=>setRubber(c.hex)} />
              ))}
            </div>
          </div>
          <p className="els-tip" style={{marginTop:'1rem'}}>Your design is carved into the working face — switch to Design tab to edit it.</p>
        </>)}
      </div>

      <style>{`
        .els {
          display: grid;
          grid-template-rows: auto;
          grid-template-columns: minmax(220px,360px) 1fr;
          grid-template-areas: "tabs tabs" "left ctrl";
          gap: 0.6rem clamp(1.5rem,4vw,3rem);
          align-items: start;
        }
        .els-tabs { grid-area: tabs; display: flex; gap: 0.4rem; }
        .els-tab {
          padding: 0.4rem 1.1rem; font-size: 0.88rem; border-radius: 999px;
          border: 1.5px solid var(--line); background: var(--cream); color: var(--ink);
          cursor: pointer; font-family: var(--font-body); transition: all 0.15s;
        }
        .els-tab.on { background: var(--olive-deep); color: var(--cream); border-color: transparent; }

        .els-left { grid-area: left; position: sticky; top: 90px; }
        .els-controls { grid-area: ctrl; display: flex; flex-direction: column; gap: 1.1rem; }

        .els-canvas-wrap, .els-preview-wrap { display: none; }
        .els-canvas-wrap.active, .els-preview-wrap.active { display: block; }

        .els-3d-mount {
          width: 380px; max-width: 100%; height: 420px; display: block;
          border-radius: var(--radius);
          background: linear-gradient(160deg, var(--sand) 0%, var(--cream) 100%);
          overflow: hidden;
        }
        .els-3d-canvas { width: 100% !important; height: 100% !important; display: block; }

        .els-wood {
          padding: 20px;
          border-radius: 999px;
          background: radial-gradient(circle at 40% 30%, #a9855c, #7c5c3a 55%, #5f4529 100%);
          box-shadow: 0 24px 48px -20px rgba(59,50,38,0.7), inset 0 2px 5px rgba(255,255,255,0.18);
        }
        .els-canvas { width:100%; height:auto; display:block; border-radius:999px; }

        .els-actions { display:flex; gap:0.5rem; flex-wrap:wrap; margin-top:1rem; justify-content:center; }
        .btn-sm {
          padding: 0.45rem 1rem; font-size: 0.85rem; border-radius: var(--radius-sm);
          border: 1.5px solid var(--line); background: var(--cream); color: var(--ink);
          cursor: pointer; font-family: var(--font-body); transition: background 0.15s;
        }
        .btn-sm:hover { background: var(--sand); }
        .btn-sm:disabled { opacity:.45; cursor:default; }
        .btn-sm-accent { background:var(--terracotta); color:#fff; border-color:transparent; }
        .btn-sm-accent:hover { background:#9e4626; }

        .swatch-row { display:flex; gap:0.6rem; flex-wrap:wrap; }
        .swatch { width:30px; height:30px; border-radius:999px; border:2px solid var(--line); cursor:pointer; transition:box-shadow .15s; }
        .swatch.on { border-color:var(--ink); box-shadow:0 0 0 2px var(--cream),0 0 0 4px var(--ink); }

        .shape-row { display:flex; gap:0.4rem; flex-wrap:wrap; }
        .shape-btn {
          display:flex; flex-direction:column; align-items:center; gap:.15rem;
          padding:.4rem .55rem; border-radius:var(--radius-sm); min-width:54px;
          border:1.5px solid var(--line); background:var(--cream); cursor:pointer; transition:all .15s;
        }
        .shape-btn.on { border-color:var(--olive-deep); background:var(--sage-soft); }
        .shape-btn:hover:not(.on) { background:var(--sand); }
        .shape-glyph { font-size:1.3rem; line-height:1; }
        .shape-label { font-size:.7rem; color:var(--ink-soft); }

        .btn-group { display:flex; flex-direction:column; gap:.4rem; }
        .grp-btn {
          padding:.45rem .8rem; text-align:left; border-radius:var(--radius-sm);
          border:1.5px solid var(--line); background:var(--cream); color:var(--ink);
          cursor:pointer; font-family:var(--font-body); font-size:.88rem; transition:all .15s;
        }
        .grp-btn.on { border-color:var(--olive-deep); background:var(--sage-soft); }
        .grp-btn:hover:not(.on) { background:var(--sand); }
        .wood-light { border-left:4px solid #dfc396; }
        .wood-dark  { border-left:4px solid #7a5230; }

        .els-tip { font-size:.8rem; color:var(--ink-soft); margin-top:.2rem; }
        input[type="range"] { accent-color:var(--olive-deep); width:100%; }

        @media(max-width:820px){
          .els { grid-template-columns:1fr; grid-template-areas:"tabs""left""ctrl"; }
          .els-left { position:static; max-width:360px; margin:0 auto; }
        }
      `}</style>
    </div>
  );
}
