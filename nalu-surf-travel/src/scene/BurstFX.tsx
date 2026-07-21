import { useImperativeHandle, useRef, forwardRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Mesh, MeshBasicMaterial, Vector3 } from 'three';
import { easeOutQuad } from './ease';

export interface ParticleSpec {
  position: [number, number, number];
  velocity: [number, number, number];
  gravity: number;
  life: number; // seconds
  color: string;
  size: number; // sphere radius, local units
}

export interface BurstFXHandle {
  spawn: (specs: ParticleSpec[]) => void;
}

interface Slot { age: number; life: number; gravity: number; vel: Vector3; active: boolean; baseSize: number }

const POOL_SIZE = 12;

/** Pooled burst-particle emitter shared by every one-shot FX in the game (touchdown dust,
 * takeoff sand kick, celebration spray) so nothing gets allocated per burst (art-direction
 * §0 budget: "particle meshes pooled (12 max)"). Lives outside the rotation rig's `<group>`
 * only in the sense that its parent decides — mount it wherever the burst should be local to. */
export const BurstFX = forwardRef<BurstFXHandle, object>((_props, ref) => {
  const group = useRef<Group>(null);
  const meshes = useRef<Mesh[]>([]);
  const slots = useRef<Slot[]>(
    Array.from({ length: POOL_SIZE }, () => ({ age: 0, life: 0, gravity: 0, vel: new Vector3(), active: false, baseSize: 0.01 })),
  );

  useImperativeHandle(ref, () => ({
    spawn(specs) {
      let slotIdx = 0;
      for (const spec of specs) {
        while (slotIdx < POOL_SIZE && slots.current[slotIdx].active) slotIdx++;
        if (slotIdx >= POOL_SIZE) break;
        const mesh = meshes.current[slotIdx];
        const slot = slots.current[slotIdx];
        if (!mesh) continue;
        mesh.position.set(...spec.position);
        mesh.scale.setScalar(spec.size);
        mesh.visible = true;
        (mesh.material as MeshBasicMaterial).color.set(spec.color);
        (mesh.material as MeshBasicMaterial).opacity = 1;
        slot.vel.set(...spec.velocity);
        slot.gravity = spec.gravity;
        slot.life = spec.life;
        slot.age = 0;
        slot.active = true;
        slot.baseSize = spec.size;
        slotIdx++;
      }
    },
  }), []);

  useFrame((_, dt) => {
    for (let i = 0; i < POOL_SIZE; i++) {
      const slot = slots.current[i];
      if (!slot.active) continue;
      const mesh = meshes.current[i];
      if (!mesh) continue;
      slot.age += dt;
      if (slot.age >= slot.life) {
        slot.active = false;
        mesh.visible = false;
        continue;
      }
      slot.vel.y -= slot.gravity * dt;
      mesh.position.addScaledVector(slot.vel, dt);
      const p = slot.age / slot.life;
      const eased = easeOutQuad(p);
      const scaleT = Math.max(0, 1 - eased);
      mesh.scale.setScalar(slot.baseSize * scaleT);
      (mesh.material as MeshBasicMaterial).opacity = scaleT;
    }
  });

  return (
    <group ref={group}>
      {Array.from({ length: POOL_SIZE }).map((_, i) => (
        <mesh
          key={i}
          visible={false}
          ref={(m) => {
            if (m) { meshes.current[i] = m; }
          }}
        >
          <sphereGeometry args={[1, 6, 5]} />
          <meshBasicMaterial color="#FFFDF7" transparent depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
});
BurstFX.displayName = 'BurstFX';
