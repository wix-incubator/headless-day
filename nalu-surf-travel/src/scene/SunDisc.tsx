/** World-fixed sun disc + halo, upper-left, peeking past the globe (art-direction §2c). */
export function SunDisc() {
  return (
    <group position={[-1.35, 0.95, -1.4]}>
      <mesh>
        <circleGeometry args={[0.38, 32]} />
        <meshBasicMaterial color="#FFE3C2" transparent opacity={0.35} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0, 0.001]}>
        <circleGeometry args={[0.2, 32]} />
        <meshBasicMaterial color="#FFD166" />
      </mesh>
    </group>
  );
}
