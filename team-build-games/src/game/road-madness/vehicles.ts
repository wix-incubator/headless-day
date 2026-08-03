import type { VehicleClass } from "./types";

export interface VehicleDef {
  name: string;
  blurb: string;
  maxSpeed: number;
  reverseSpeed: number;
  acceleration: number;
  reverseAcceleration: number;
  brake: number;
  turnRate: number;
  grip: number;
  handbrakeGrip: number;
  drag: number;
  mass: number;
  health: number;
  collisionRadius: number;
  frontDamageMult: number;
  rearDamageMult: number;
}

export const VEHICLES: Record<VehicleClass, VehicleDef> = {
  sport: {
    name: "Sport",
    blurb: "Equalized race car — quick, light and precise.",
    maxSpeed: 15,
    reverseSpeed: 5,
    acceleration: 10.5,
    reverseAcceleration: 6,
    brake: 16,
    turnRate: 2.35,
    grip: 8.5,
    handbrakeGrip: 1.6,
    drag: 0.52,
    mass: 0.9,
    health: 90,
    collisionRadius: 1.05,
    frontDamageMult: 0.9,
    rearDamageMult: 0.55,
  },
  derby: {
    name: "Derby",
    blurb: "Fast and agile. Hit first, because you cannot absorb as much punishment.",
    maxSpeed: 12.5,
    reverseSpeed: 4.8,
    acceleration: 9.8,
    reverseAcceleration: 5.8,
    brake: 14,
    turnRate: 2.25,
    grip: 7.2,
    handbrakeGrip: 1.25,
    drag: 0.58,
    mass: 1,
    health: 110,
    collisionRadius: 1.08,
    frontDamageMult: 1.12,
    rearDamageMult: 0.65,
  },
  monster: {
    name: "Monster",
    blurb: "Slower and wider, with the mass and health to win a head-on argument.",
    maxSpeed: 9.8,
    reverseSpeed: 4,
    acceleration: 7.1,
    reverseAcceleration: 4.6,
    brake: 11,
    turnRate: 1.72,
    grip: 8.3,
    handbrakeGrip: 1.7,
    drag: 0.7,
    mass: 1.48,
    health: 170,
    collisionRadius: 1.25,
    frontDamageMult: 1.28,
    rearDamageMult: 0.72,
  },
  street: {
    name: "Street",
    blurb: "Equalized Bomb Tag hot rod.",
    maxSpeed: 13.3,
    reverseSpeed: 5,
    acceleration: 9.6,
    reverseAcceleration: 5.8,
    brake: 14,
    turnRate: 2.2,
    grip: 7.5,
    handbrakeGrip: 1.35,
    drag: 0.56,
    mass: 1,
    health: 100,
    collisionRadius: 1.08,
    frontDamageMult: 1,
    rearDamageMult: 0.6,
  },
};

export const PLAYABLE_DERBY_VEHICLES: VehicleClass[] = ["derby", "monster"];

export function vehicleDef(vehicle: VehicleClass): VehicleDef {
  return VEHICLES[vehicle];
}

