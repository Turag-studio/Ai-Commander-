"use client";

import { Html, Line, OrbitControls, Sparkles } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { AgentDescriptor, AgentStatus } from "@ai-commander/core";
import { CORTEX_LABEL } from "@/lib/cortex";

export interface BrainAgentState {
  descriptor: AgentDescriptor;
  status: AgentStatus;
  lastSummary?: string;
}

const STATUS_COLOR: Record<AgentStatus, string> = {
  idle: "#1fb6d6",
  running: "#00f6ff",
  completed: "#39ff88",
  error: "#ff3b5c",
};

const CORE_RADIUS = 1.1;
const NODE_ORBIT_RADIUS = 3.6;

/** Evenly distributes N points on a sphere shell (Fibonacci sphere). */
function fibonacciSphere(count: number, radius: number): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / Math.max(1, count - 1)) * 2;
    const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = goldenAngle * i;
    const x = Math.cos(theta) * radiusAtY;
    const z = Math.sin(theta) * radiusAtY;
    points.push(new THREE.Vector3(x, y * 0.6, z).multiplyScalar(radius));
  }
  return points;
}

function BrainCore() {
  const meshRef = useRef<THREE.Mesh>(null);
  const wireRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const breathe = 1 + Math.sin(t * 0.8) * 0.06;
    if (meshRef.current) {
      meshRef.current.scale.setScalar(breathe);
      meshRef.current.rotation.y = t * 0.08;
    }
    if (wireRef.current) {
      wireRef.current.scale.setScalar(breathe * 1.08);
      wireRef.current.rotation.y = -t * 0.05;
      wireRef.current.rotation.x = Math.sin(t * 0.2) * 0.1;
    }
  });

  return (
    <group>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[CORE_RADIUS, 2]} />
        <meshStandardMaterial
          color="#0a2a33"
          emissive="#00c8ff"
          emissiveIntensity={0.9}
          roughness={0.25}
          metalness={0.4}
          transparent
          opacity={0.55}
        />
      </mesh>
      <mesh ref={wireRef}>
        <icosahedronGeometry args={[CORE_RADIUS, 1]} />
        <meshBasicMaterial color="#00f6ff" wireframe transparent opacity={0.35} />
      </mesh>
      <pointLight color="#00e5ff" intensity={6} distance={12} />
    </group>
  );
}

function CortexNode({ agent, position }: { agent: BrainAgentState; position: THREE.Vector3 }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const color = STATUS_COLOR[agent.status];

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    const pulse = agent.status === "running" ? 1 + Math.sin(t * 6) * 0.25 : 1 + Math.sin(t * 1.2) * 0.05;
    meshRef.current.scale.setScalar(pulse * (hovered ? 1.4 : 1));
  });

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
      {hovered && (
        <Html distanceFactor={8} center>
          <div className="pointer-events-none w-48 rounded-lg border border-neon-cyan/30 bg-void-950/90 px-3 py-2 text-center shadow-glow backdrop-blur">
            <p className="text-xs font-semibold text-white">{CORTEX_LABEL[agent.descriptor.id]}</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-widest text-neon-cyan/70">{agent.status}</p>
            {agent.lastSummary && <p className="mt-1 text-[10px] text-white/50 line-clamp-3">{agent.lastSummary}</p>}
          </div>
        </Html>
      )}
    </group>
  );
}

function Synapse({ from, to, active }: { from: THREE.Vector3; to: THREE.Vector3; active: boolean }) {
  const particleRef = useRef<THREE.Mesh>(null);
  const points = useMemo(() => [from, to], [from, to]);

  useFrame(({ clock }) => {
    if (!particleRef.current) return;
    if (!active) {
      particleRef.current.visible = false;
      return;
    }
    particleRef.current.visible = true;
    const t = (clock.getElapsedTime() * 0.9) % 1;
    particleRef.current.position.lerpVectors(from, to, t);
  });

  return (
    <group>
      <Line points={points} color={active ? "#00f6ff" : "#0d3b45"} transparent opacity={active ? 0.8 : 0.25} lineWidth={active ? 1.5 : 1} />
      <mesh ref={particleRef}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
    </group>
  );
}

function BrainSystem({ agents }: { agents: BrainAgentState[] }) {
  const positions = useMemo(() => fibonacciSphere(agents.length, NODE_ORBIT_RADIUS), [agents.length]);
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (groupRef.current) groupRef.current.rotation.y = clock.getElapsedTime() * 0.04;
  });

  return (
    <group ref={groupRef}>
      <BrainCore />
      {agents.map((agent, i) => (
        <Synapse key={agent.descriptor.id} from={new THREE.Vector3(0, 0, 0)} to={positions[i]} active={agent.status === "running"} />
      ))}
      {agents.map((agent, i) => (
        <CortexNode key={agent.descriptor.id} agent={agent} position={positions[i]} />
      ))}
    </group>
  );
}

export function BrainScene({ agents }: { agents: BrainAgentState[] }) {
  return (
    <Canvas camera={{ position: [0, 1.5, 8.5], fov: 45 }} dpr={[1, 1.5]}>
      <ambientLight intensity={0.15} color="#5ad6ff" />
      <Sparkles count={180} scale={[14, 8, 14]} size={2} speed={0.25} color="#00f6ff" opacity={0.5} />
      <Sparkles count={80} scale={[16, 10, 16]} size={1.5} speed={0.15} color="#a855f7" opacity={0.35} />
      <BrainSystem agents={agents} />
      <OrbitControls
        enablePan={false}
        minDistance={5}
        maxDistance={14}
        autoRotate
        autoRotateSpeed={0.4}
      />
      <EffectComposer>
        <Bloom intensity={0.9} luminanceThreshold={0.15} luminanceSmoothing={0.9} mipmapBlur />
      </EffectComposer>
    </Canvas>
  );
}
