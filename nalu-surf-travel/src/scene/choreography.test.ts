import {
  landingPose, takeoffPose, dustPuffSpecs, sandKickSpecs, spraySpecs,
  celebrationGroundedPose, celebrationAirbornePose, heroExitBlend,
  FLIGHT_Y, FLIGHT_Z, LANDED_Y, LANDED_Z,
  LANDING_DURATION, LANDING_DURATION_REDUCED, TAKEOFF_DURATION, TAKEOFF_DURATION_REDUCED,
  FOLDED_WING_ANGLE, GLIDE_WING_ANGLE,
  CELEBRATION_HOPS_END, HERO_EXIT_DURATION,
  CELEBRATION_AIRBORNE_DURATION, CELEBRATION_AIRBORNE_DURATION_REDUCED,
} from './choreography';

describe('landingPose', () => {
  test('starts at the flight altitude/depth', () => {
    const p = landingPose(0, false);
    expect(p.y).toBeCloseTo(FLIGHT_Y);
    expect(p.z).toBeCloseTo(FLIGHT_Z);
  });

  test('ends at the landed rest pose: on the ground, wings folded', () => {
    const p = landingPose(LANDING_DURATION, false);
    expect(p.y).toBeCloseTo(LANDED_Y);
    expect(p.z).toBeCloseTo(LANDED_Z);
    expect(p.scale).toEqual([1, 1, 1]);
    expect(p.wingAngle).toBeCloseTo(FOLDED_WING_ANGLE);
  });

  test('squashes at touchdown (t=0.93) then rebounds past neutral before settling', () => {
    const squash = landingPose(0.93, false);
    expect(squash.scale[1]).toBeLessThan(1); // flattened
    const rebound = landingPose(1.0, false);
    expect(rebound.scale[1]).toBeGreaterThan(1); // overshoot past neutral
  });

  test('reduced motion collapses to a single short ease with no squash', () => {
    const mid = landingPose(LANDING_DURATION_REDUCED / 2, true);
    expect(mid.scale).toEqual([1, 1, 1]);
    const end = landingPose(LANDING_DURATION_REDUCED, true);
    expect(end.y).toBeCloseTo(LANDED_Y);
  });
});

describe('takeoffPose', () => {
  test('starts on the ground', () => {
    const p = takeoffPose(0, false);
    expect(p.y).toBeCloseTo(LANDED_Y);
  });

  test('ends at the flight rest pose', () => {
    const p = takeoffPose(TAKEOFF_DURATION, false);
    expect(p.y).toBeCloseTo(FLIGHT_Y);
    expect(p.z).toBeCloseTo(FLIGHT_Z);
  });

  test('overshoots cruise altitude mid-leap before settling', () => {
    const leapPeak = takeoffPose(0.4, false);
    expect(leapPeak.y).toBeGreaterThan(FLIGHT_Y);
  });

  test('reduced motion collapses to a single short ease', () => {
    const end = takeoffPose(TAKEOFF_DURATION_REDUCED, true);
    expect(end.y).toBeCloseTo(FLIGHT_Y);
  });
});

describe('touchdown/leap particle specs', () => {
  test('dust puff is 6 particles radiating from the origin, cream/buff only', () => {
    const specs = dustPuffSpecs([0.1, 0.02, 1.13]);
    expect(specs).toHaveLength(6);
    for (const s of specs) {
      expect(s.position).toEqual([0.1, 0.02, 1.13]);
      expect(['#F5E2B8', '#FFFDF7']).toContain(s.color);
      expect(s.velocity[1]).toBeGreaterThan(0); // upward bias
      expect(s.life).toBeCloseTo(0.45);
    }
    // radiate in different directions, not all the same
    const angles = new Set(specs.map((s) => Math.atan2(s.velocity[2], s.velocity[0])));
    expect(angles.size).toBeGreaterThan(1);
  });

  test('sand kick is 4 particles fanned backward, sand-colored', () => {
    const specs = sandKickSpecs([0, 0.02, 1.13]);
    expect(specs).toHaveLength(4);
    for (const s of specs) {
      expect(s.color).toBe('#F2D8A7');
      expect(s.velocity[0]).toBeLessThan(0); // backward (-x-ish) fan
      expect(s.life).toBeCloseTo(0.35);
    }
  });

  test('celebration spray is 10 particles, sea-spray palette, upward-biased', () => {
    const specs = spraySpecs([0, 0.05, 1.13]);
    expect(specs).toHaveLength(10);
    const counts: Record<string, number> = {};
    for (const s of specs) {
      expect(['#FFFDF7', '#FFD166', '#FF7E6B']).toContain(s.color);
      expect(s.velocity[1]).toBeGreaterThan(0);
      expect(s.life).toBeCloseTo(0.6);
      counts[s.color] = (counts[s.color] ?? 0) + 1;
    }
    // sea-spray mix, not rainbow confetti (brief §7 anti-goal)
    expect(counts['#FFFDF7']).toBe(6);
    expect(counts['#FFD166']).toBe(3);
    expect(counts['#FF7E6B']).toBe(1);
  });
});

describe('celebrationGroundedPose', () => {
  test('hops up off the ground mid-hop and squashes back down at each landing', () => {
    const midHop1 = celebrationGroundedPose(0.1, false);
    expect(midHop1.y).toBeGreaterThan(LANDED_Y);
    const landing1 = celebrationGroundedPose(0.45 - 0.01, false);
    expect(landing1.scale[1]).toBeLessThan(1); // squashed just before landing
  });

  test('holds the settled ground pose past the hops, indefinitely', () => {
    const atEnd = celebrationGroundedPose(CELEBRATION_HOPS_END, false);
    const wellAfter = celebrationGroundedPose(CELEBRATION_HOPS_END + 5, false);
    expect(atEnd.y).toBeCloseTo(LANDED_Y);
    expect(atEnd.scale).toEqual([1, 1, 1]);
    expect(wellAfter.y).toBeCloseTo(LANDED_Y);
    expect(wellAfter.scale).toEqual([1, 1, 1]);
  });

  test('reduced motion: no hop, sits at the settled ground pose throughout', () => {
    const start = celebrationGroundedPose(0, true);
    expect(start.y).toBeCloseTo(LANDED_Y);
    expect(start.scale).toEqual([1, 1, 1]);
    const later = celebrationGroundedPose(0.3, true);
    expect(later.y).toBeCloseTo(LANDED_Y);
    expect(later.scale).toEqual([1, 1, 1]);
  });
});

describe('celebrationAirbornePose', () => {
  test('flares the wings out past glide, then returns to glide', () => {
    const start = celebrationAirbornePose(0, false);
    expect(start.wingAngle).toBeCloseTo(GLIDE_WING_ANGLE);
    const mid = celebrationAirbornePose(CELEBRATION_AIRBORNE_DURATION / 2, false);
    expect(mid.wingAngle).toBeLessThan(GLIDE_WING_ANGLE); // flared wider than glide
    const end = celebrationAirbornePose(CELEBRATION_AIRBORNE_DURATION, false);
    expect(end.wingAngle).toBeCloseTo(GLIDE_WING_ANGLE);
  });

  test('stays at flight altitude throughout', () => {
    const p = celebrationAirbornePose(CELEBRATION_AIRBORNE_DURATION / 2, false);
    expect(p.y).toBeCloseTo(FLIGHT_Y);
  });

  test('reduced motion collapses to a short flare', () => {
    const end = celebrationAirbornePose(CELEBRATION_AIRBORNE_DURATION_REDUCED, true);
    expect(end.wingAngle).toBeCloseTo(GLIDE_WING_ANGLE);
  });
});

describe('heroExitBlend', () => {
  test('starts fully in the hero pose and eases to fully settled', () => {
    expect(heroExitBlend(0, false)).toBeCloseTo(0);
    const mid = heroExitBlend(HERO_EXIT_DURATION / 2, false);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
    expect(heroExitBlend(HERO_EXIT_DURATION, false)).toBeCloseTo(1);
  });

  test('never exceeds 1 after the duration', () => {
    expect(heroExitBlend(HERO_EXIT_DURATION + 5, false)).toBe(1);
  });

  test('reduced motion snaps immediately, no continuous motion', () => {
    expect(heroExitBlend(0, true)).toBe(1);
  });
});
