import { CAMERA_POSE_DIORAMA, CAMERA_POSE_FAR, VIGNETTE_PIVOT, isDioramaState, selectCameraPose } from './cameraPose';
import type { GameStateName } from '../game/machine';

describe('isDioramaState / selectCameraPose', () => {
  test.each<GameStateName>(['intro', 'flying', 'approaching'])(
    '%s uses the FAR whole-globe pose', (state) => {
      expect(isDioramaState(state)).toBe(false);
      expect(selectCameraPose(state)).toBe(CAMERA_POSE_FAR);
    },
  );

  test.each<GameStateName>(['landed', 'booking', 'confirmed'])(
    '%s uses the DIORAMA pose', (state) => {
      expect(isDioramaState(state)).toBe(true);
      expect(selectCameraPose(state)).toBe(CAMERA_POSE_DIORAMA);
    },
  );
});

describe('CAMERA_POSE_FAR', () => {
  test('is the unchanged whole-globe framing: on-axis, looking at the origin', () => {
    expect(CAMERA_POSE_FAR.position).toEqual([0, 0, 3.2]);
    expect(CAMERA_POSE_FAR.lookAt).toEqual([0, 0, 0]);
  });
});

describe('CAMERA_POSE_DIORAMA', () => {
  test('leaves the +Z axis (a perspective change, not just a dolly)', () => {
    const [x, y] = CAMERA_POSE_DIORAMA.position;
    expect(x !== 0 || y !== 0).toBe(true);
  });

  test('sits 45-55deg off the touchdown surface normal (0,0,1), measured from the ' +
    'landed vignette pivot, per the brief', () => {
    const [px, py, pz] = VIGNETTE_PIVOT;
    const [cx, cy, cz] = CAMERA_POSE_DIORAMA.position;
    const toCamera: [number, number, number] = [cx - px, cy - py, cz - pz];
    const mag = Math.hypot(...toCamera);
    const cosAngleOffNormal = toCamera[2] / mag; // dot with (0,0,1)
    const angleDeg = (Math.acos(cosAngleOffNormal) * 180) / Math.PI;
    expect(angleDeg).toBeGreaterThanOrEqual(45);
    expect(angleDeg).toBeLessThanOrEqual(55);
  });

  test('is much closer to the globe than the old on-axis NEAR dolly (z=2.4), so the ' +
    'limb reads as a horizon instead of a distant disc', () => {
    const [x, y, z] = CAMERA_POSE_DIORAMA.position;
    expect(Math.hypot(x, y, z)).toBeLessThan(2.4);
  });

  test('looks off-center (toward +x) so the subject frames left of screen center', () => {
    expect(CAMERA_POSE_DIORAMA.lookAt[0]).toBeGreaterThan(0);
  });
});
