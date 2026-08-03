import { BUMPER_HALF_ANGLE_DEG, MIN_DAMAGE_SPEED_MS } from "./constants";
import type { Bumper, CarState, Vec2 } from "./types";
import { vehicleDef } from "./vehicles";

const BUMPER_DOT = Math.cos((BUMPER_HALF_ANGLE_DEG * Math.PI) / 180);
const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export function forwardVector(heading: number): Vec2 {
  return { x: Math.cos(heading), y: Math.sin(heading) };
}

/** `towardContact` is a unit vector from the car centre toward the other body. */
export function classifyBumper(heading: number, towardContact: Vec2): Bumper {
  const forward = forwardVector(heading);
  const alignment = forward.x * towardContact.x + forward.y * towardContact.y;
  if (alignment >= BUMPER_DOT) return "front";
  if (alignment <= -BUMPER_DOT) return "rear";
  return "side";
}

export interface ImpactDamageInput {
  closingSpeed: number;
  bumper: Bumper;
  alignment: number;
  attackerMass: number;
  targetMass: number;
  frontMultiplier: number;
  rearMultiplier: number;
}

/**
 * Authored derby damage. Collision impulse is solved elsewhere; this function
 * only answers how much health a qualifying bumper hit removes.
 */
export function impactDamage(input: ImpactDamageInput): number {
  if (input.bumper === "side" || input.closingSpeed <= MIN_DAMAGE_SPEED_MS) return 0;
  const absAlignment = Math.abs(input.alignment);
  if (absAlignment < BUMPER_DOT) return 0;

  const alignment01 = clamp((absAlignment - BUMPER_DOT) / (1 - BUMPER_DOT), 0, 1);
  const angleQuality = 0.35 + alignment01 * 0.65;
  const bumperMult = input.bumper === "front" ? input.frontMultiplier : input.rearMultiplier;
  const massFactor = clamp(Math.sqrt(input.attackerMass / input.targetMass), 0.65, 1.5);
  const speedEnergy = Math.pow(input.closingSpeed - MIN_DAMAGE_SPEED_MS, 1.12) * 2.15;
  return speedEnergy * angleQuality * bumperMult * massFactor;
}

export function carImpactDamage(
  attacker: CarState,
  target: CarState,
  towardTarget: Vec2,
  closingSpeed: number,
): { bumper: Bumper; damage: number } {
  const forward = forwardVector(attacker.heading);
  const alignment = forward.x * towardTarget.x + forward.y * towardTarget.y;
  const bumper = classifyBumper(attacker.heading, towardTarget);
  const attackerDef = vehicleDef(attacker.vehicle);
  const targetDef = vehicleDef(target.vehicle);
  return {
    bumper,
    damage: impactDamage({
      closingSpeed,
      bumper,
      alignment,
      attackerMass: attackerDef.mass,
      targetMass: targetDef.mass,
      frontMultiplier: attackerDef.frontDamageMult,
      rearMultiplier: attackerDef.rearDamageMult,
    }),
  };
}

export function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

