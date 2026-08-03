/** Phaser presentation for the first Road Madness demolition-derby slice. */

import Phaser from "phaser";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { arenaFeaturesForRound } from "../arena";
import { ROAD_ARENA_HEIGHT_M, ROAD_ARENA_WIDTH_M } from "../constants";
import type { CarState, PlayerId, RoadEvent, RoadWorld, VehicleClass } from "../types";
import { VEHICLES } from "../vehicles";
import { createRoadKeyboard, type RoadKeyboardReader } from "./keyboard";
import type { RoadHudState, RoadSceneConfig } from "./contract";

export type {
  RoadDriver,
  RoadHudState,
  RoadPlayerMeta,
  RoadRenderEvent,
  RoadSceneConfig,
} from "./contract";

const PX_PER_M = 28;
const Y_SCALE = 0.66;
const MARGIN_X = 60;
const OFFSET_Y = 90;
const BOTTOM_PAD = 106;
const FIELD_W = ROAD_ARENA_WIDTH_M * PX_PER_M;
const FIELD_H = ROAD_ARENA_HEIGHT_M * PX_PER_M * Y_SCALE;

export const ROAD_WIDTH = MARGIN_X * 2 + FIELD_W;
export const ROAD_HEIGHT = OFFSET_Y + FIELD_H + BOTTOM_PAD;

const COLORS = [0x22d3ee, 0xf43f5e, 0xfbbf24, 0xa3e635, 0xc084fc, 0xfb923c, 0x2dd4bf, 0xf8fafc];
const vehicleTexture = (vehicle: VehicleClass, colorIndex: number) =>
  `road-car-${vehicle}-${colorIndex % COLORS.length}`;
type ModelVehicleClass = "derby" | "monster";
const MODEL_VEHICLE_ASSETS: Record<ModelVehicleClass, string> = {
  derby: "/assets/road-madness/models/derby-cyber.glb",
  monster: "/assets/road-madness/models/monster-cyber.glb",
};
const MODEL_FRAME_COUNT = 32;
const MODEL_FRAME_SIZE = 180;
const modelVehicleTexture = (vehicle: ModelVehicleClass) => `road-model-car-${vehicle}`;
const FIELD_TEXTURE = "road-madness-pit";
const TERRAIN_TEXTURE = "road-madness-pit-terrain";

const sx = (x: number): number => MARGIN_X + x * PX_PER_M;
const sy = (y: number): number => OFFSET_Y + y * PX_PER_M * Y_SCALE;
const screenAngle = (heading: number): number =>
  Math.atan2(Math.sin(heading) * Y_SCALE, Math.cos(heading));
const hasModelVehicle = (vehicle: VehicleClass): vehicle is ModelVehicleClass =>
  vehicle === "derby" || vehicle === "monster";
const frameForAngle = (angle: number): number => {
  const normalized = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  return Math.round((normalized / (Math.PI * 2)) * MODEL_FRAME_COUNT) % MODEL_FRAME_COUNT;
};

interface VehicleViewSpec {
  width: number;
  height: number;
  originY: number;
  shadowWidth: number;
  shadowHeight: number;
  rearOffset: number;
  labelY: number;
  healthY: number;
  modelSize: number;
}

const VEHICLE_VIEW: Record<VehicleClass, VehicleViewSpec> = {
  derby: {
    width: 90,
    height: 54,
    originY: 0.6,
    shadowWidth: 64,
    shadowHeight: 20,
    rearOffset: 36,
    labelY: -42,
    healthY: 38,
    modelSize: 96,
  },
  monster: {
    width: 105,
    height: 79,
    originY: 0.64,
    shadowWidth: 82,
    shadowHeight: 27,
    rearOffset: 43,
    labelY: -52,
    healthY: 47,
    modelSize: 116,
  },
  sport: {
    width: 64,
    height: 42,
    originY: 0.5,
    shadowWidth: 48,
    shadowHeight: 19,
    rearOffset: 24,
    labelY: -31,
    healthY: 28,
    modelSize: 68,
  },
  street: {
    width: 64,
    height: 42,
    originY: 0.5,
    shadowWidth: 48,
    shadowHeight: 19,
    rearOffset: 24,
    labelY: -31,
    healthY: 28,
    modelSize: 68,
  },
};

interface CarView {
  shadow: Phaser.GameObjects.Ellipse;
  body: Phaser.GameObjects.Image;
  smoke: Phaser.GameObjects.Ellipse;
  fire: Phaser.GameObjects.Ellipse;
  boostGlow: Phaser.GameObjects.Ellipse;
  label: Phaser.GameObjects.Text;
  healthBack: Phaser.GameObjects.Rectangle;
  healthFill: Phaser.GameObjects.Rectangle;
}

export class RoadMadnessScene extends Phaser.Scene {
  private cfg!: RoadSceneConfig;
  private keyboard!: RoadKeyboardReader;
  private views: Record<PlayerId, CarView> = {};
  private lastProcessedTick = -1;
  private ended = false;
  private safeBorder!: Phaser.GameObjects.Rectangle;
  private suddenLabel!: Phaser.GameObjects.Text;
  private readonly trailMarks = new Set<Phaser.GameObjects.Graphics>();
  private readonly lastTrailTick: Record<PlayerId, number> = {};
  private arenaFeatureRound = 0;
  private arenaFeatureViews: Phaser.GameObjects.GameObject[] = [];
  private modelAtlasesReady = false;
  private modelAtlasPromise: Promise<void> | null = null;

  constructor() {
    super("road-madness");
  }

  preload(): void {
    this.load.image(
      TERRAIN_TEXTURE,
      "/assets/road-madness/terrain/derby-pit-v1.webp",
    );
  }

  create(): void {
    this.cfg = this.registry.get("cfg") as RoadSceneConfig;
    this.keyboard = createRoadKeyboard(this);
    this.makeTextures();
    this.prepareModelAtlases();
    this.drawPit();
  }

  override update(_time: number, deltaMs: number): void {
    const { world, countdown, roundBreak } = this.cfg.driver.frame(
      Math.min(deltaMs / 1000, 0.1),
      this.keyboard.read(),
    );
    this.processEvents(world);
    this.renderSafeBounds(world);
    this.renderArenaFeatures(world);
    this.renderCars(world);
    this.renderTrails(world);
    this.emitHud(world, countdown, roundBreak);
    if (world.phase === "ended" && !this.ended) {
      this.ended = true;
      this.cfg.onEnd(world);
    }
  }

  private makeTextures(): void {
    this.makeFieldTexture();
    for (const vehicle of Object.keys(VEHICLES) as VehicleClass[]) {
      for (let color = 0; color < COLORS.length; color += 1) {
        this.makeCarTexture(vehicle, color);
      }
    }
  }

  private prepareModelAtlases(): void {
    const expected = Object.keys(MODEL_VEHICLE_ASSETS) as ModelVehicleClass[];
    if (expected.every((vehicle) => this.textures.exists(modelVehicleTexture(vehicle)))) {
      this.modelAtlasesReady = true;
      return;
    }
    this.modelAtlasPromise ??= this.makeModelAtlases()
      .then(() => {
        this.modelAtlasesReady = true;
      })
      .catch((error: unknown) => {
        console.warn("Road Madness model atlas generation failed; using procedural fallback cars.", error);
      });
  }

  private async makeModelAtlases(): Promise<void> {
    await Promise.all(
      (Object.keys(MODEL_VEHICLE_ASSETS) as ModelVehicleClass[]).map((vehicle) =>
        this.makeModelAtlas(vehicle),
      ),
    );
  }

  private async makeModelAtlas(vehicle: ModelVehicleClass): Promise<void> {
    const textureKey = modelVehicleTexture(vehicle);
    if (this.textures.exists(textureKey)) return;

    const renderCanvas = document.createElement("canvas");
    renderCanvas.width = MODEL_FRAME_SIZE;
    renderCanvas.height = MODEL_FRAME_SIZE;
    const renderer = new THREE.WebGLRenderer({
      canvas: renderCanvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(MODEL_FRAME_SIZE, MODEL_FRAME_SIZE, false);
    renderer.setPixelRatio(1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xb9eaff, 1.7));
    const keyLight = new THREE.DirectionalLight(vehicle === "monster" ? 0xffd1bd : 0xc9fbff, 2.25);
    keyLight.position.set(-2.6, 6.4, 4.2);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(vehicle === "monster" ? 0xff402b : 0x22e8ff, 1.35);
    rimLight.position.set(3.5, 2.4, -3.2);
    scene.add(rimLight);

    const gltf = await new GLTFLoader().loadAsync(MODEL_VEHICLE_ASSETS[vehicle]);
    const model = gltf.scene;
    const bounds = new THREE.Box3().setFromObject(model);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    model.position.set(-center.x, -bounds.min.y - size.y * 0.18, -center.z);
    model.scale.setScalar(vehicle === "monster" ? 0.92 : 1.03);
    scene.add(model);

    const groundGlow = new THREE.Mesh(
      new THREE.CircleGeometry(vehicle === "monster" ? 1.15 : 1.05, 48),
      new THREE.MeshBasicMaterial({
        color: vehicle === "monster" ? 0xff2a1d : 0x00e5ff,
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide,
      }),
    );
    groundGlow.rotation.x = -Math.PI / 2;
    groundGlow.position.y = 0.025;
    scene.add(groundGlow);

    const camera = new THREE.OrthographicCamera(-2.05, 2.05, 2.05, -2.05, 0.1, 30);
    camera.position.set(0, 5.6, 4.8);
    camera.lookAt(0, 0.45, 0);
    camera.updateProjectionMatrix();

    const atlas = document.createElement("canvas");
    atlas.width = MODEL_FRAME_SIZE * MODEL_FRAME_COUNT;
    atlas.height = MODEL_FRAME_SIZE;
    const atlasCtx = atlas.getContext("2d");
    if (!atlasCtx) throw new Error("Unable to create Road Madness model atlas canvas.");

    for (let frame = 0; frame < MODEL_FRAME_COUNT; frame += 1) {
      const angle = (frame / MODEL_FRAME_COUNT) * Math.PI * 2;
      model.rotation.y = angle + Math.PI / 2;
      groundGlow.rotation.z = -angle;
      renderer.render(scene, camera);
      atlasCtx.drawImage(renderCanvas, frame * MODEL_FRAME_SIZE, 0);
      renderer.clear();
    }

    renderer.dispose();
    this.textures.addSpriteSheet(
      textureKey,
      atlas as unknown as HTMLImageElement,
      { frameWidth: MODEL_FRAME_SIZE, frameHeight: MODEL_FRAME_SIZE },
    );
  }

  private makeFieldTexture(): void {
    const width = Math.ceil(FIELD_W);
    const height = Math.ceil(FIELD_H);
    const g = this.add.graphics();
    g.fillStyle(0x28252b, 1);
    g.fillRect(0, 0, width, height);
    g.lineStyle(1, 0x3f3b43, 0.58);
    const cellX = PX_PER_M * 2;
    const cellY = PX_PER_M * 2 * Y_SCALE;
    for (let x = 0; x <= width; x += cellX) g.lineBetween(x, 0, x, height);
    for (let y = 0; y <= height; y += cellY) g.lineBetween(0, y, width, y);
    // Scuffed concentric pit markings make motion easier to read.
    g.lineStyle(3, 0xf59e0b, 0.16);
    g.strokeEllipse(width / 2, height / 2, width * 0.62, height * 0.58);
    g.lineStyle(2, 0xf8fafc, 0.1);
    g.strokeEllipse(width / 2, height / 2, width * 0.28, height * 0.32);
    g.generateTexture(FIELD_TEXTURE, width, height);
    g.destroy();
  }

  private makeCarTexture(vehicle: VehicleClass, colorIndex: number): void {
    const monster = vehicle === "monster";
    const derby = vehicle === "derby";
    const width = 76;
    const height = 54;
    const bodyW = monster ? 54 : 56;
    const bodyH = monster ? 34 : 27;
    const x = (width - bodyW) / 2;
    const y = (height - bodyH) / 2;
    const g = this.add.graphics();
    const bodyColor = derby ? 0x00d8ff : monster ? 0xef2b25 : COLORS[colorIndex]!;
    const glowColor = derby ? 0x22d3ee : monster ? 0xff3b2f : COLORS[colorIndex]!;

    // Wheels sit outside the shell, with larger tires on the monster truck.
    const wheelW = monster ? 15 : 12;
    const wheelH = monster ? 9 : 6;
    g.fillStyle(glowColor, monster || derby ? 0.2 : 0.08);
    g.fillEllipse(width / 2, height / 2 + 5, bodyW + 18, bodyH + 16);
    g.fillStyle(0x09090b, 1);
    g.fillRoundedRect(x + 4, y - wheelH / 2, wheelW, wheelH, 3);
    g.fillRoundedRect(x + bodyW - wheelW - 4, y - wheelH / 2, wheelW, wheelH, 3);
    g.fillRoundedRect(x + 4, y + bodyH - wheelH / 2, wheelW, wheelH, 3);
    g.fillRoundedRect(x + bodyW - wheelW - 4, y + bodyH - wheelH / 2, wheelW, wheelH, 3);

    g.fillStyle(bodyColor, 1);
    g.fillRoundedRect(x, y, bodyW, bodyH, monster ? 7 : 5);
    g.lineStyle(monster ? 4 : 3, 0x0b0f14, 0.78);
    g.strokeRoundedRect(x + 2, y + 2, bodyW - 4, bodyH - 4, monster ? 6 : 4);
    g.lineStyle(monster ? 4 : 3, 0xd1d5db, 0.78);
    g.lineBetween(x + bodyW + 1, y + 5, x + bodyW + 1, y + bodyH - 5); // front crash bar
    g.lineStyle(3, 0x27272a, 0.95);
    g.lineBetween(x - 1, y + 5, x - 1, y + bodyH - 5); // rear crash bar

    g.fillStyle(0x111827, 0.95);
    g.fillRoundedRect(x + bodyW * 0.37, y + 5, bodyW * 0.27, bodyH - 10, 3);
    g.fillStyle(0x020617, 0.88);
    g.fillRoundedRect(x + bodyW * 0.68, y + 6, bodyW * 0.18, bodyH - 12, 2);
    g.fillStyle(glowColor, 0.8);
    g.fillRect(x + bodyW - 5, y + 8, 2, bodyH - 16);
    if (derby) {
      g.lineStyle(3, 0x111827, 0.65);
      g.lineBetween(x + 8, y + bodyH - 4, x + bodyW - 8, y + 4);
      g.lineStyle(2, 0xfacc15, 0.65);
      g.lineBetween(x + 10, y + 4, x + bodyW - 10, y + bodyH - 4);
    }
    if (monster) {
      g.fillStyle(0x111827, 0.95);
      g.fillRoundedRect(x + bodyW * 0.2, y + 5, bodyW * 0.28, bodyH - 10, 3);
      for (let lamp = 0; lamp < 4; lamp += 1) {
        g.fillStyle(0xff5b3d, 0.9);
        g.fillCircle(x + bodyW * 0.36 + lamp * 5, y + 3, 2);
      }
    }
    g.generateTexture(vehicleTexture(vehicle, colorIndex), width, height);
    g.destroy();
  }

  private drawPit(): void {
    const terrainTexture = this.textures.exists(TERRAIN_TEXTURE)
      ? TERRAIN_TEXTURE
      : FIELD_TEXTURE;
    this.add
      .image(MARGIN_X + FIELD_W / 2, OFFSET_Y + FIELD_H / 2, terrainTexture)
      .setDisplaySize(FIELD_W, FIELD_H)
      .setDepth(-1000);
    const border = this.add
      .rectangle(MARGIN_X + FIELD_W / 2, OFFSET_Y + FIELD_H / 2, FIELD_W, FIELD_H)
      .setStrokeStyle(7, 0xf59e0b, 0.72)
      .setDepth(-990);
    border.setFillStyle(0x000000, 0);
    this.safeBorder = this.add
      .rectangle(MARGIN_X + FIELD_W / 2, OFFSET_Y + FIELD_H / 2, FIELD_W, FIELD_H)
      .setStrokeStyle(5, 0xef4444, 0.9)
      .setFillStyle(0x000000, 0)
      .setDepth(500)
      .setVisible(false);

    const title = this.add
      .text(ROAD_WIDTH / 2, 30, "THE PIT · LAST MADMAN STANDING", {
        fontFamily: "monospace",
        fontSize: "15px",
        color: "#fbbf24",
        fontStyle: "bold",
        letterSpacing: 2,
      })
      .setOrigin(0.5)
      .setDepth(-900)
      .setResolution(2);
    title.setAlpha(0.9);
    this.suddenLabel = this.add
      .text(ROAD_WIDTH / 2, 53, "SUDDEN DEATH · WALLS CLOSING", {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#fca5a5",
        fontStyle: "bold",
        letterSpacing: 1,
      })
      .setOrigin(0.5)
      .setDepth(510)
      .setResolution(2)
      .setVisible(false);
  }

  private renderArenaFeatures(world: RoadWorld): void {
    if (this.arenaFeatureRound === world.roundNumber) return;
    for (const view of this.arenaFeatureViews) {
      this.tweens.killTweensOf(view);
      view.destroy();
    }
    this.arenaFeatureViews = [];
    this.arenaFeatureRound = world.roundNumber;
    const features = arenaFeaturesForRound(world.roundNumber);

    for (const pad of features.speedPads) {
      const x = sx(pad.pos.x);
      const y = sy(pad.pos.y);
      const width = pad.radius * PX_PER_M * 2;
      const height = width * Y_SCALE;
      const glow = this.add
        .ellipse(x, y, width, height, 0x22d3ee, 0.2)
        .setStrokeStyle(3, 0x67e8f9, 0.82)
        .setDepth(pad.pos.y - 0.4);
      const core = this.add
        .ellipse(x, y, width * 0.72, height * 0.62, 0x075985, 0.74)
        .setStrokeStyle(2, 0xfef08a, 0.68)
        .setDepth(pad.pos.y - 0.39);
      const label = this.add
        .text(x, y, "BOOST", {
          fontFamily: "monospace",
          fontSize: "8px",
          color: "#cffafe",
          fontStyle: "bold",
          stroke: "#083344",
          strokeThickness: 2,
        })
        .setOrigin(0.5)
        .setResolution(2)
        .setDepth(pad.pos.y - 0.38);
      this.tweens.add({
        targets: glow,
        alpha: { from: 0.25, to: 0.72 },
        scaleX: { from: 0.96, to: 1.04 },
        scaleY: { from: 0.96, to: 1.04 },
        duration: 720,
        yoyo: true,
        repeat: -1,
      });
      this.arenaFeatureViews.push(glow, core, label);
    }

    for (const tower of features.towers) {
      const x = sx(tower.pos.x);
      const y = sy(tower.pos.y);
      const radius = tower.radius * PX_PER_M;
      const shadow = this.add
        .ellipse(x + 3, y + 7, radius * 2.25, radius * 0.9, 0x000000, 0.48)
        .setDepth(tower.pos.y - 0.02);
      const spikes = this.add.graphics().setPosition(x, y).setDepth(tower.pos.y + 0.01);
      spikes.fillStyle(0xd1d5db, 1);
      for (let index = 0; index < 10; index += 1) {
        const angle = (index / 10) * Math.PI * 2;
        const inner = radius * 0.68;
        const outer = radius * 1.22;
        spikes.fillTriangle(
          Math.cos(angle - 0.22) * inner,
          Math.sin(angle - 0.22) * inner,
          Math.cos(angle) * outer,
          Math.sin(angle) * outer,
          Math.cos(angle + 0.22) * inner,
          Math.sin(angle + 0.22) * inner,
        );
      }
      spikes.fillStyle(0x52525b, 1);
      spikes.fillCircle(0, 0, radius * 0.78);
      spikes.lineStyle(3, 0xf97316, 0.9);
      spikes.strokeCircle(0, 0, radius * 0.63);
      spikes.fillStyle(0x18181b, 1);
      spikes.fillCircle(0, 0, radius * 0.25);
      this.arenaFeatureViews.push(shadow, spikes);
    }
  }

  private renderSafeBounds(world: RoadWorld): void {
    const bounds = world.safeBounds;
    this.safeBorder
      .setPosition((sx(bounds.minX) + sx(bounds.maxX)) / 2, (sy(bounds.minY) + sy(bounds.maxY)) / 2)
      .setDisplaySize(
        (bounds.maxX - bounds.minX) * PX_PER_M,
        (bounds.maxY - bounds.minY) * PX_PER_M * Y_SCALE,
      )
      .setAlpha(0.68 + Math.sin(world.tick * 0.22) * 0.22)
      .setVisible(world.suddenDeath);
    this.suddenLabel
      .setText(`SUDDEN DEATH · IMPACTS ×${world.damageMultiplier.toFixed(1)}`)
      .setVisible(world.suddenDeath);
  }

  private makeCarView(car: CarState): CarView {
    const meta = this.cfg.driver.getMeta(car.id);
    const viewSpec = VEHICLE_VIEW[car.vehicle];
    const shadow = this.add.ellipse(0, 0, viewSpec.shadowWidth, viewSpec.shadowHeight, 0x000000, 0.36);
    const smoke = this.add.ellipse(0, 0, 20, 13, 0xa1a1aa, 0.42).setVisible(false);
    const fire = this.add.ellipse(0, 0, 15, 8, 0xfb923c, 0.82).setVisible(false);
    const boostGlow = this.add.ellipse(0, 0, 26, 10, 0x22d3ee, 0.66).setVisible(false);
    const body = this.add
      .image(0, 0, vehicleTexture(car.vehicle, meta.colorIndex))
      .setOrigin(0.5, viewSpec.originY)
      .setDisplaySize(viewSpec.width, viewSpec.height);
    const label = this.add
      .text(0, 0, `${meta.name} · ${car.id === this.cfg.driver.localId ? "#1" : `#${meta.colorIndex + 1}`}`, {
        fontFamily: "monospace",
        fontSize: "9px",
        color: "#f8fafc",
        stroke: "#09090b",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setResolution(2);
    const healthBack = this.add.rectangle(0, 0, 44, 5, 0x09090b, 0.9).setOrigin(0, 0.5);
    const healthFill = this.add.rectangle(0, 0, 42, 3, 0x22c55e, 1).setOrigin(0, 0.5);
    return { shadow, body, smoke, fire, boostGlow, label, healthBack, healthFill };
  }

  private renderCars(world: RoadWorld): void {
    for (const id of Object.keys(world.cars).sort()) {
      const car = world.cars[id]!;
      if (car.status === "removed") {
        const removed = this.views[id];
        if (removed) {
          this.destroyCarView(removed);
          delete this.views[id];
        }
        continue;
      }
      const view = this.views[id] ?? (this.views[id] = this.makeCarView(car));
      const viewSpec = VEHICLE_VIEW[car.vehicle];
      const x = sx(car.pos.x);
      const y = sy(car.pos.y);
      const depth = car.pos.y;
      const angle = screenAngle(car.heading);
      const modelVehicle = hasModelVehicle(car.vehicle) ? car.vehicle : null;
      const usingModelAtlas = this.modelAtlasesReady && modelVehicle !== null;
      const right = { x: -Math.sin(car.heading), y: Math.cos(car.heading) };
      const lateralSpeed = car.vel.x * right.x + car.vel.y * right.y;
      const visualLean = Phaser.Math.Clamp(lateralSpeed * 0.012, -0.06, 0.06);
      const rearX = x - Math.cos(angle) * viewSpec.rearOffset;
      const rearY = y - Math.sin(angle) * viewSpec.rearOffset;
      view.shadow.setPosition(x + 2, y + 8).setDepth(depth - 0.02).setRotation(angle);
      view.boostGlow
        .setPosition(rearX, rearY)
        .setDepth(depth - 0.01)
        .setRotation(angle)
        .setScale(0.85 + Math.sin(world.tick * 0.7 + car.colorIndex) * 0.16, 1)
        .setVisible(car.boosting);
      if (usingModelAtlas) {
        view.body
          .setTexture(modelVehicleTexture(modelVehicle), frameForAngle(-angle))
          .setOrigin(0.5, 0.57)
          .setDisplaySize(viewSpec.modelSize, viewSpec.modelSize)
          .setRotation(visualLean * 0.55);
      } else {
        view.body
          .setTexture(vehicleTexture(car.vehicle, car.colorIndex))
          .setOrigin(0.5, viewSpec.originY)
          .setDisplaySize(viewSpec.width, viewSpec.height)
          .setRotation(angle + visualLean);
      }
      view.body.setPosition(x, y).setDepth(depth);
      const healthFraction = Math.max(0, Math.min(1, car.health / car.maxHealth));
      const smokeVisible = healthFraction <= 0.5 || car.status === "wrecked";
      const fireVisible = healthFraction <= 0.25 || car.status === "wrecked";
      view.smoke
        .setPosition(rearX - Math.cos(angle) * 5, rearY - 10)
        .setDepth(depth + 0.01)
        .setScale(0.82 + Math.sin(world.tick * 0.17 + car.colorIndex) * 0.16)
        .setAlpha(0.28 + (1 - healthFraction) * 0.34)
        .setVisible(smokeVisible);
      view.fire
        .setPosition(rearX, rearY)
        .setDepth(depth + 0.015)
        .setRotation(angle)
        .setScale(0.72 + Math.sin(world.tick * 0.51 + car.colorIndex) * 0.18, 1)
        .setVisible(fireVisible);
      view.label.setPosition(x, y + viewSpec.labelY).setDepth(depth + 0.02);
      view.healthBack.setPosition(x - 22, y + viewSpec.healthY).setDepth(depth + 0.02);
      view.healthFill.setPosition(x - 21, y + viewSpec.healthY).setDepth(depth + 0.03);
      view.healthFill.setScale(healthFraction, 1);
      view.healthFill.setFillStyle(
        healthFraction > 0.55 ? 0x22c55e : healthFraction > 0.25 ? 0xf59e0b : 0xef4444,
        1,
      );
      if (car.status === "wrecked") {
        view.body.setTint(0x52525b).setAlpha(0.74);
        view.label.setText(`${this.cfg.driver.getMeta(id).name} · WRECKED`).setColor("#a1a1aa");
        view.healthBack.setVisible(false);
        view.healthFill.setVisible(false);
      } else {
        view.body.setAlpha(1).clearTint();
        if (healthFraction <= 0.25) view.body.setTint(0xb45309);
        else if (healthFraction <= 0.5) view.body.setTint(0xa1a1aa);
        else if (healthFraction <= 0.75) view.body.setTint(0xd6d3d1);
        const meta = this.cfg.driver.getMeta(id);
        view.label
          .setText(`${meta.name} · ${id === this.cfg.driver.localId ? "#1" : `#${meta.colorIndex + 1}`}`)
          .setColor("#f8fafc");
        view.healthBack.setVisible(true);
        view.healthFill.setVisible(true);
      }
    }
  }

  private destroyCarView(view: CarView): void {
    view.shadow.destroy();
    view.body.destroy();
    view.smoke.destroy();
    view.fire.destroy();
    view.boostGlow.destroy();
    view.label.destroy();
    view.healthBack.destroy();
    view.healthFill.destroy();
  }

  private renderTrails(world: RoadWorld): void {
    for (const car of Object.values(world.cars)) {
      if (car.status !== "alive") continue;
      const speed = Math.hypot(car.vel.x, car.vel.y);
      const right = { x: -Math.sin(car.heading), y: Math.cos(car.heading) };
      const lateralSpeed = Math.abs(car.vel.x * right.x + car.vel.y * right.y);
      if (!car.boosting && (speed < 4 || lateralSpeed < 1.05)) continue;
      if (world.tick - (this.lastTrailTick[car.id] ?? -99) < 3) continue;
      this.lastTrailTick[car.id] = world.tick;

      const forward = { x: Math.cos(car.heading), y: Math.sin(car.heading) };
      const rear = {
        x: car.pos.x - forward.x * 0.58,
        y: car.pos.y - forward.y * 0.58,
      };
      const mark = this.add.graphics().setDepth(car.pos.y - 0.03);
      mark.lineStyle(car.boosting ? 3 : 2, car.boosting ? 0x22d3ee : 0x09090b, car.boosting ? 0.6 : 0.48);
      for (const side of [-1, 1]) {
        const start = { x: rear.x + right.x * 0.34 * side, y: rear.y + right.y * 0.34 * side };
        const end = { x: start.x - forward.x * 0.46, y: start.y - forward.y * 0.46 };
        mark.lineBetween(sx(start.x), sy(start.y), sx(end.x), sy(end.y));
      }
      this.trailMarks.add(mark);
      while (this.trailMarks.size > 240) {
        const oldest = this.trailMarks.values().next().value as Phaser.GameObjects.Graphics | undefined;
        if (!oldest) break;
        this.trailMarks.delete(oldest);
        oldest.destroy();
      }
      this.tweens.add({
        targets: mark,
        alpha: 0,
        duration: car.boosting ? 850 : 4200,
        onComplete: () => {
          this.trailMarks.delete(mark);
          mark.destroy();
        },
      });
    }
  }

  private processEvents(world: RoadWorld): void {
    let newest = this.lastProcessedTick;
    for (const event of world.events) {
      if (event.tick <= this.lastProcessedTick) continue;
      newest = Math.max(newest, event.tick);
      this.renderEvent(event);
    }
    this.lastProcessedTick = newest;
  }

  private renderEvent(event: RoadEvent): void {
    const localId = this.cfg.driver.localId;
    if (event.kind === "impact") {
      this.cfg.onEvent({
        type: "impact",
        local: event.sourceId === localId || event.targetId === localId,
        damage: event.damage,
      });
      const x = sx(event.point.x);
      const y = sy(event.point.y);
      const g = this.add.graphics().setDepth(event.point.y + 10);
      g.lineStyle(2, 0xfef08a, 1);
      const rays = 7;
      for (let i = 0; i < rays; i += 1) {
        const angle = (i / rays) * Math.PI * 2 + event.tick * 0.37;
        const inner = 4;
        const outer = 10 + Math.min(10, event.damage * 0.25);
        g.lineBetween(
          x + Math.cos(angle) * inner,
          y + Math.sin(angle) * inner,
          x + Math.cos(angle) * outer,
          y + Math.sin(angle) * outer,
        );
      }
      this.tweens.add({ targets: g, alpha: 0, scale: 1.45, duration: 170, onComplete: () => g.destroy() });
      if (event.sourceId === localId || event.targetId === localId) {
        this.cameras.main.shake(85, Math.min(0.007, 0.0015 + event.damage * 0.00014));
      }
    } else if (event.kind === "tower-hit") {
      const local = event.carId === localId;
      this.cfg.onEvent({ type: "impact", local, damage: event.damage });
      const x = sx(event.point.x);
      const y = sy(event.point.y);
      const g = this.add.graphics().setDepth(event.point.y + 10);
      g.lineStyle(3, 0xfb7185, 1);
      for (let index = 0; index < 8; index += 1) {
        const angle = (index / 8) * Math.PI * 2 + event.tick * 0.29;
        g.lineBetween(
          x + Math.cos(angle) * 4,
          y + Math.sin(angle) * 4,
          x + Math.cos(angle) * 15,
          y + Math.sin(angle) * 15,
        );
      }
      this.tweens.add({
        targets: g,
        alpha: 0,
        scale: 1.5,
        duration: 190,
        onComplete: () => g.destroy(),
      });
      if (local) this.cameras.main.shake(100, Math.min(0.008, 0.002 + event.damage * 0.00016));
    } else if (event.kind === "wrecked") {
      this.cfg.onEvent({ type: "wrecked", local: event.carId === localId });
      const ring = this.add.circle(sx(event.point.x), sy(event.point.y), 12, 0xf97316, 0.55).setDepth(event.point.y + 9);
      this.tweens.add({
        targets: ring,
        alpha: 0,
        scale: 3.2,
        duration: 340,
        onComplete: () => ring.destroy(),
      });
    } else {
      this.cfg.onEvent({ type: "nitro", local: event.carId === localId });
      const speedPad = event.kind === "speed-pad";
      const burst = this.add
        .ellipse(
          sx(event.point.x),
          sy(event.point.y),
          speedPad ? 30 : 18,
          speedPad ? 14 : 8,
          speedPad ? 0xfacc15 : 0x22d3ee,
          0.72,
        )
        .setDepth(event.point.y + 8);
      this.tweens.add({
        targets: burst,
        alpha: 0,
        scaleX: 2.5,
        scaleY: 1.7,
        duration: 230,
        onComplete: () => burst.destroy(),
      });
    }
  }

  private emitHud(world: RoadWorld, countdown: number, roundBreak: number): void {
    const local = world.cars[this.cfg.driver.localId];
    if (!local) return;
    const hud: RoadHudState = {
      countdown,
      health: local.health,
      maxHealth: local.maxHealth,
      speed: Math.hypot(local.vel.x, local.vel.y),
      status: local.status,
      alive: Object.values(world.cars).filter((car) => car.status === "alive").length,
      total: Object.keys(world.cars).length,
      damageDealt: local.damageDealt,
      elapsed: world.elapsed,
      matchElapsed: world.matchElapsed,
      nitro: local.nitro,
      boosting: local.boosting,
      phase: world.phase,
      roundNumber: world.roundNumber,
      bestOf: world.rules.bestOf,
      roundWins: world.roundWins,
      roundWinnerId: world.roundWinnerId,
      roundEndReason: world.roundEndReason,
      roundBreak,
      suddenDeath: world.suddenDeath,
      damageMultiplier: world.damageMultiplier,
    };
    this.cfg.onHud(hud);
  }
}
