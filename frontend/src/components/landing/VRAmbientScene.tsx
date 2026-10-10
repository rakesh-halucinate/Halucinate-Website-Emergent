import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sparkles, Grid } from "@react-three/drei";
import * as THREE from "three";

function HaloRing({ radius, speed, tilt, color, opacity, y }: { radius: number; speed: number; tilt: number; color: string; opacity: number; y: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.z = state.clock.elapsedTime * speed;
  });
  return (
    <mesh ref={ref} rotation={[tilt, 0, 0]} position={[0, y, -1.2]}>
      <torusGeometry args={[radius, 0.011, 12, 96]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} />
    </mesh>
  );
}

export default function VRAmbientScene() {
  return (
    <Canvas
      camera={{ position: [0, 0.4, 5], fov: 42 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      flat
      style={{ background: "transparent" }}
      data-testid="vr-ambient-canvas"
    >
      <HaloRing radius={1.7} speed={0.3} tilt={1.25} color="#00f0ff" opacity={0.4} y={0.6} />
      <HaloRing radius={2.05} speed={-0.2} tilt={1.1} color="#ff2d78" opacity={0.22} y={0.45} />
      <HaloRing radius={2.45} speed={0.12} tilt={1.5} color="#00f0ff" opacity={0.14} y={0.3} />
      <Sparkles count={160} scale={[11, 7, 5]} size={2.4} speed={0.35} color="#00f0ff" opacity={0.55} position={[0, 0.5, -1]} />
      <Grid
        position={[0, -2.3, 0]}
        args={[16, 16]}
        cellSize={0.55}
        cellThickness={0.6}
        cellColor="#0e2233"
        sectionSize={2.2}
        sectionThickness={1.1}
        sectionColor="#00f0ff"
        fadeDistance={14}
        fadeStrength={2.4}
        infiniteGrid
      />
    </Canvas>
  );
}
