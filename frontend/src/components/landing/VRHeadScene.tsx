import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Sparkles, Grid } from "@react-three/drei";
import * as THREE from "three";

export type PointerRef = { current: { x: number; y: number } };

function HaloRing({ radius, speed, tilt, color, opacity }: { radius: number; speed: number; tilt: number; color: string; opacity: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.z = state.clock.elapsedTime * speed;
  });
  return (
    <mesh ref={ref} rotation={[tilt, 0, 0]} position={[0, 0.1, -0.6]}>
      <torusGeometry args={[radius, 0.012, 12, 96]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} />
    </mesh>
  );
}

function HeadRig({ pointer }: { pointer: PointerRef }) {
  const group = useRef<THREE.Group>(null);

  useFrame((state, dt) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    const targetY = pointer.current.x * 0.9 + Math.sin(t * 0.35) * 0.14;
    const targetX = -pointer.current.y * 0.38 + Math.sin(t * 0.5) * 0.04;
    group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, targetY, 3.2, dt);
    group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, targetX, 3.2, dt);
  });

  return (
    <Float speed={2.2} rotationIntensity={0.22} floatIntensity={0.9}>
      <group ref={group}>
        {/* cranium */}
        <mesh position={[0, 0.12, 0]} scale={[0.84, 1, 0.94]}>
          <sphereGeometry args={[1, 48, 48]} />
          <meshStandardMaterial color="#070d18" metalness={0.75} roughness={0.28} emissive="#002233" emissiveIntensity={0.5} />
        </mesh>
        {/* holographic wireframe shell */}
        <mesh position={[0, 0.12, 0]} scale={[0.86, 1.025, 0.965]}>
          <sphereGeometry args={[1, 20, 14]} />
          <meshBasicMaterial color="#00f0ff" wireframe transparent opacity={0.13} />
        </mesh>
        {/* jaw / lower face */}
        <mesh position={[0, -0.62, 0.18]} scale={[0.62, 0.72, 0.68]}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshStandardMaterial color="#060b14" metalness={0.7} roughness={0.35} emissive="#001a26" emissiveIntensity={0.4} />
        </mesh>
        {/* VR visor */}
        <mesh position={[0, 0.22, 0.62]} rotation={[0.04, 0, 0]}>
          <boxGeometry args={[1.62, 0.56, 0.62]} />
          <meshStandardMaterial color="#02070d" metalness={0.95} roughness={0.12} emissive="#002b3d" emissiveIntensity={0.7} />
        </mesh>
        {/* visor glowing lens strip */}
        <mesh position={[0, 0.22, 0.945]} rotation={[0.04, 0, 0]}>
          <boxGeometry args={[1.44, 0.2, 0.02]} />
          <meshBasicMaterial color="#00f0ff" />
        </mesh>
        {/* visor lens inner glow plane */}
        <mesh position={[0, 0.22, 0.955]} rotation={[0.04, 0, 0]}>
          <planeGeometry args={[1.6, 0.42]} />
          <meshBasicMaterial color="#00f0ff" transparent opacity={0.14} />
        </mesh>
        {/* head strap */}
        <mesh position={[0, 0.24, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.98, 0.055, 16, 72]} />
          <meshStandardMaterial color="#04101c" metalness={0.8} roughness={0.3} emissive="#00303f" emissiveIntensity={0.6} />
        </mesh>
        {/* neck */}
        <mesh position={[0, -1.28, 0]}>
          <cylinderGeometry args={[0.3, 0.42, 0.8, 24]} />
          <meshStandardMaterial color="#050a12" metalness={0.75} roughness={0.3} emissive="#001420" emissiveIntensity={0.4} />
        </mesh>
        {/* base collar glow */}
        <mesh position={[0, -1.72, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.72, 0.02, 12, 72]} />
          <meshBasicMaterial color="#00f0ff" transparent opacity={0.85} />
        </mesh>
        {/* halo rings */}
        <HaloRing radius={1.55} speed={0.35} tilt={1.35} color="#00f0ff" opacity={0.5} />
        <HaloRing radius={1.85} speed={-0.22} tilt={1.15} color="#ff2d78" opacity={0.28} />
        <HaloRing radius={2.2} speed={0.14} tilt={1.5} color="#00f0ff" opacity={0.18} />
      </group>
    </Float>
  );
}

export default function VRHeadScene({ pointer }: { pointer: PointerRef }) {
  return (
    <Canvas
      camera={{ position: [0, 0.25, 4.6], fov: 40 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      flat
      style={{ background: "transparent" }}
      data-testid="vr-hero-canvas"
    >
      <ambientLight intensity={0.18} />
      <pointLight position={[3.5, 2.5, 4]} intensity={46} color="#00f0ff" />
      <pointLight position={[-4, -1.5, 2.5]} intensity={20} color="#ff2d78" />
      <pointLight position={[0, -2.5, 3]} intensity={12} color="#7928ca" />
      <spotLight position={[0, 6, 2]} angle={0.5} penumbra={1} intensity={30} color="#0af" />
      <HeadRig pointer={pointer} />
      <Sparkles count={150} scale={[10, 6, 5]} size={2.4} speed={0.35} color="#00f0ff" opacity={0.55} position={[0, 0, -1]} />
      <Grid
        position={[0, -2.2, 0]}
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
