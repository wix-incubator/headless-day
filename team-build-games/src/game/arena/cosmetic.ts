/**
 * Cosmetic-only player identity. Legacy shape ids now select fighter artwork; avatar photos are
 * layered over the fighter's head. Carried on the wire and drawn
 * by the renderer, but NEVER read by the sim core — purely visual, so it can't affect determinism.
 * `coerceShape` is the wire trust boundary (a peer can only ever send a known shape), mirroring
 * `protocol.coerceIntent`.
 */

export type Shape = "circle" | "square" | "triangle" | "diamond" | "neon-ronin" | "solar-warden";

export const FREE_SHAPES: Shape[] = ["circle", "square", "triangle", "diamond"];
export const PREMIUM_SHAPES: Shape[] = ["neon-ronin", "solar-warden"];
export const SHAPES: Shape[] = [...FREE_SHAPES, ...PREMIUM_SHAPES];

export const DEFAULT_SHAPE: Shape = "circle";

export function coerceShape(raw: unknown): Shape {
  return SHAPES.includes(raw as Shape) ? (raw as Shape) : DEFAULT_SHAPE;
}

export function coercePremiumShapes(raw: unknown): Shape[] {
  if (!Array.isArray(raw)) return [];
  const unique = new Set<Shape>();
  for (const item of raw) {
    const shape = coerceShape(item);
    if (PREMIUM_SHAPES.includes(shape)) unique.add(shape);
  }
  return [...unique];
}

export function isPremiumShape(shape: Shape): boolean {
  return PREMIUM_SHAPES.includes(shape);
}

export function ownsShape(shape: Shape, ownedPremiumShapes: readonly Shape[]): boolean {
  return !isPremiumShape(shape) || ownedPremiumShapes.includes(shape);
}

export function randomFreeShape(seed: string): Shape {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return FREE_SHAPES[hash % FREE_SHAPES.length] ?? DEFAULT_SHAPE;
}

export function playableShape(shape: Shape, ownedPremiumShapes: readonly Shape[], seed: string): Shape {
  return ownsShape(shape, ownedPremiumShapes) ? shape : randomFreeShape(seed);
}

export interface ArenaSkinInfo {
  id: Shape;
  name: string;
  blurb: string;
  priceCents: number;
  preview: string;
}

export const PREMIUM_SKINS: ArenaSkinInfo[] = [
  {
    id: "neon-ronin",
    name: "Neon Ronin",
    blurb: "Cyber duelist armor with cyan edge light and magenta cloth.",
    priceCents: 200,
    preview: "/assets/arena/skins/neon-ronin.png",
  },
  {
    id: "solar-warden",
    name: "Solar Warden",
    blurb: "Ivory-gold guardian plate with ember glow.",
    priceCents: 200,
    preview: "/assets/arena/skins/solar-warden.png",
  },
];

export function premiumSkinById(id: string): ArenaSkinInfo | undefined {
  return PREMIUM_SKINS.find((skin) => skin.id === id);
}

export const RIG_FIGHTER: Record<Shape, string> = {
  circle: "swordsman",
  square: "spearman",
  triangle: "knife-fighter",
  diamond: "archer",
  "neon-ronin": "swordsman",
  "solar-warden": "spearman",
};

export interface ShapeRenderStyle {
  tint?: [number, number, number, number];
  glow?: number;
}

export const SHAPE_RENDER_STYLE: Record<Shape, ShapeRenderStyle> = {
  circle: {},
  square: {},
  triangle: {},
  diamond: {},
  "neon-ronin": { glow: 0x00e5ff },
  "solar-warden": { glow: 0xffc247 },
};

export const BODY_ASSET: Record<Shape, string> = {
  circle:   "/assets/arena/warriors/swordsman.png",
  square:   "/assets/arena/warriors/spearman.png",
  triangle: "/assets/arena/warriors/knife-fighter.png",
  diamond:  "/assets/arena/warriors/archer.png",
  "neon-ronin": "/assets/arena/skins/neon-ronin.png",
  "solar-warden": "/assets/arena/skins/solar-warden.png",
};
