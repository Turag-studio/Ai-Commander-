"use client";

import { Html, Line, OrbitControls, Sparkles } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { AgentDescriptor, AgentId, AgentStatus, NotificationSeverity } from "@ai-commander/core";
import { CORTEX_COLOR, CORTEX_LABEL } from "@/lib/cortex";

export interface BrainAgentState {
  descriptor: AgentDescriptor;
  status: AgentStatus;
  lastSummary?: string;
}

/** A transient event (order created, product published, error, ...) rendered as a flash. */
export interface BrainPulse {
  id: string;
  agentId?: AgentId;
  severity: NotificationSeverity;
  receivedAt: number;
}

/** Golden for success per the brain-states spec ("success spreads golden energy"); resting node color stays green. */
const SEVERITY_COLOR: Record<NotificationSeverity, string> = {
  info: "#00d4ff",
  success: "#ffd447",
  warning: "#ffb020",
  critical: "#ff3b5c",
};

const CORE_RADIUS = 1.3;
const NODE_ORBIT_RADIUS = 3.8;
const NODE_FLASH_MS = 1200;
const CORE_FLASH_MS = 1800;
const EVENT_TRAVEL_MS = 900;

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

/**
 * A sphere displaced by layered sine waves into organic, brain-like folds —
 * a lightweight stand-in for sculpted anatomy that still reads as a living
 * mass rather than a geometric primitive. True anatomical realism (the
 * reference video's photoreal tissue) needs a sculpted mesh + subsurface
 * shader beyond what a dependency-free real-time scene can approximate.
 */
function createOrganicBrainGeometry(radius: number, detail: number): THREE.BufferGeometry {
  const geometry = new THREE.IcosahedronGeometry(radius, detail);
  const position = geometry.attributes.position;
  const vertex = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    vertex.fromBufferAttribute(position, i);
    const n =
      Math.sin(vertex.x * 3.1 + vertex.y * 1.7) * 0.5 +
      Math.sin(vertex.y * 4.3 + vertex.z * 2.1) * 0.35 +
      Math.sin(vertex.z * 5.7 + vertex.x * 2.9) * 0.25;
    const displaced = vertex.clone().normalize().multiplyScalar(radius + n * radius * 0.12);
    position.setXYZ(i, displaced.x, displaced.y, displaced.z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function BrainCore({ pulse, processing }: { pulse?: BrainPulse; processing: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const wireRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const baseColor = useMemo(() => new THREE.Color("#00c8ff"), []);
  const outerGeometry = useMemo(() => createOrganicBrainGeometry(CORE_RADIUS, 5), []);
  const glowGeometry = useMemo(() => createOrganicBrainGeometry(CORE_RADIUS * 1.18, 3), []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const breatheSpeed = processing ? 3.5 : 0.8;
    const breatheAmount = processing ? 0.1 : 0.05;
    const breathe = 1 + Math.sin(t * breatheSpeed) * breatheAmount;

    if (meshRef.current) {
      meshRef.current.scale.setScalar(breathe);
      meshRef.current.rotation.y = t * (processing ? 0.2 : 0.06);
    }
    if (glowRef.current) {
      glowRef.current.scale.setScalar(breathe * 1.02);
      glowRef.current.rotation.y = meshRef.current?.rotation.y ?? 0;
    }
    if (wireRef.current) {
      wireRef.current.scale.setScalar(breathe * 1.04);
      wireRef.current.rotation.y = -t * 0.04;
      wireRef.current.rotation.x = Math.sin(t * 0.2) * 0.08;
    }
    if (materialRef.current) {
      let flash = 0;
      if (pulse) {
        const age = Date.now() - pulse.receivedAt;
        if (age < CORE_FLASH_MS) flash = 1 - age / CORE_FLASH_MS;
      }
      const targetColor = pulse ? new THREE.Color(SEVERITY_COLOR[pulse.severity]) : baseColor;
      materialRef.current.emissive.lerpColors(baseColor, targetColor, flash);
      materialRef.current.emissiveIntensity = 0.85 + flash * 1.8 + (processing ? 0.35 : 0);
    }
  });

  return (
    <group>
      {/* Translucent "tissue" shell */}
      <mesh ref={meshRef} geometry={outerGeometry}>
        <meshStandardMaterial
          ref={materialRef}
          color="#0a2a33"
          emissive="#00c8ff"
          emissiveIntensity={0.85}
          roughness={0.2}
          metalness={0.1}
          transparent
          opacity={0.42}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Soft additive halo to fake inner volumetric glow without a real subsurface shader */}
      <mesh ref={glowRef} geometry={glowGeometry}>
        <meshBasicMaterial color={pulse ? SEVERITY_COLOR[pulse.severity] : "#00d4ff"} transparent opacity={0.06} side={THREE.BackSide} toneMapped={false} />
      </mesh>
      {/* Visible "neuron" tracery */}
      <mesh ref={wireRef}>
        <icosahedronGeometry args={[CORE_RADIUS * 0.94, 2]} />
        <meshBasicMaterial color={processing ? "#ffffff" : "#00ffff"} wireframe transparent opacity={processing ? 0.45 : 0.28} />
      </mesh>
      <pointLight color={pulse ? SEVERITY_COLOR[pulse.severity] : "#00d4ff"} intensity={7} distance={13} />
    </group>
  );
}

function CortexNode({ agent, position, pulse }: { agent: BrainAgentState; position: THREE.Vector3; pulse?: BrainPulse }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const [hovered, setHovered] = useState(false);
  const regionColor = CORTEX_COLOR[agent.descriptor.id];
  const baseColor = useMemo(() => {
    if (agent.status === "completed") return new THREE.Color("#39ff88");
    if (agent.status === "error") return new THREE.Color("#ff3b5c");
    return new THREE.Color(regionColor);
  }, [agent.status, regionColor]);

  useFrame(({ clock }) => {
    if (!meshRef.current || !materialRef.current) return;
    const t = clock.getElapsedTime();
    const basePulse = agent.status === "running" ? 1 + Math.sin(t * 6) * 0.25 : 1 + Math.sin(t * 1.2) * 0.05;

    let flash = 0;
    if (pulse) {
      const age = Date.now() - pulse.receivedAt;
      if (age < NODE_FLASH_MS) flash = 1 - age / NODE_FLASH_MS;
    }

    meshRef.current.scale.setScalar(basePulse * (1 + flash * 0.8) * (hovered ? 1.4 : 1));

    if (flash > 0 && pulse) {
      materialRef.current.color.lerpColors(baseColor, new THREE.Color(SEVERITY_COLOR[pulse.severity]), flash);
      materialRef.current.emissive.copy(materialRef.current.color);
      materialRef.current.emissiveIntensity = 1.4 + flash * 2.5;
    } else {
      materialRef.current.color.copy(baseColor);
      materialRef.current.emissive.copy(baseColor);
      materialRef.current.emissiveIntensity = 1.4;
    }
  });

  return (
    <group position={position}>
      <mesh ref={meshRef} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial ref={materialRef} color={regionColor} emissive={regionColor} emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
      {hovered && (
        <Html distanceFactor={8} center>
          <div className="pointer-events-none w-48 rounded-lg border border-neon-cyan/30 bg-void-950/90 px-3 py-2 text-center shadow-glow backdrop-blur">
            <p className="text-xs font-semibold text-white">{agent.descriptor.name}</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-widest text-neon-cyan/70">{CORTEX_LABEL[agent.descriptor.id]}</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-widest text-white/40">{agent.status}</p>
            {agent.lastSummary && <p className="mt-1 text-[10px] text-white/50 line-clamp-3">{agent.lastSummary}</p>}
          </div>
        </Html>
      )}
    </group>
  );
}

function Synapse({ from, to, active, color, pulse }: { from: THREE.Vector3; to: THREE.Vector3; active: boolean; color: string; pulse?: BrainPulse }) {
  const particleRef = useRef<THREE.Mesh>(null);
  const eventParticleRef = useRef<THREE.Mesh>(null);
  const points = useMemo(() => [from, to], [from, to]);

  useFrame(({ clock }) => {
    if (particleRef.current) {
      if (!active) {
        particleRef.current.visible = false;
      } else {
        particleRef.current.visible = true;
        const t = (clock.getElapsedTime() * 0.9) % 1;
        particleRef.current.position.lerpVectors(from, to, t);
      }
    }

    if (eventParticleRef.current) {
      if (pulse) {
        const age = Date.now() - pulse.receivedAt;
        if (age >= 0 && age < EVENT_TRAVEL_MS) {
          eventParticleRef.current.visible = true;
          eventParticleRef.current.position.lerpVectors(from, to, age / EVENT_TRAVEL_MS);
          const material = eventParticleRef.current.material as THREE.MeshBasicMaterial;
          material.color.set(SEVERITY_COLOR[pulse.severity]);
        } else {
          eventParticleRef.current.visible = false;
        }
      } else {
        eventParticleRef.current.visible = false;
      }
    }
  });

  return (
    <group>
      <Line points={points} color={active ? color : "#0d3b45"} transparent opacity={active ? 0.8 : 0.25} lineWidth={active ? 1.5 : 1} />
      <mesh ref={particleRef}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh ref={eventParticleRef}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
    </group>
  );
}

function BrainSystem({ agents, pulses }: { agents: BrainAgentState[]; pulses: BrainPulse[] }) {
  const positions = useMemo(() => fibonacciSphere(agents.length, NODE_ORBIT_RADIUS), [agents.length]);
  const groupRef = useRef<THREE.Group>(null);
  const processing = agents.some((a) => a.status === "running");

  const pulseByAgent = useMemo(() => {
    const map = new Map<string, BrainPulse>();
    for (const p of pulses) {
      const key = p.agentId ?? "commander";
      const existing = map.get(key);
      if (!existing || p.receivedAt > existing.receivedAt) map.set(key, p);
    }
    return map;
  }, [pulses]);

  useFrame(({ clock }) => {
    if (groupRef.current) groupRef.current.rotation.y = clock.getElapsedTime() * 0.035;
  });

  return (
    <group ref={groupRef}>
      <BrainCore pulse={pulseByAgent.get("commander")} processing={processing} />
      {agents.map((agent, i) => (
        <Synapse
          key={agent.descriptor.id}
          from={new THREE.Vector3(0, 0, 0)}
          to={positions[i]}
          active={agent.status === "running"}
          color={CORTEX_COLOR[agent.descriptor.id]}
          pulse={pulseByAgent.get(agent.descriptor.id)}
        />
      ))}
      {agents.map((agent, i) => (
        <CortexNode key={agent.descriptor.id} agent={agent} position={positions[i]} pulse={pulseByAgent.get(agent.descriptor.id)} />
      ))}
    </group>
  );
}

export function BrainScene({ agents, pulses = [] }: { agents: BrainAgentState[]; pulses?: BrainPulse[] }) {
  return (
    <Canvas camera={{ position: [0, 1.5, 9 ], fov: 45 }} dpr={[1, 1.5]}>
      <ambientLight intensity={0.15} color="#5ad6ff" />
      <Sparkles count={180} scale={[15, 9, 15]} size={2} speed={0.25} color="#00d4ff" opacity={0.5} />
      <Sparkles count={80} scale={[17, 11, 17]} size={1.5} speed={0.15} color="#8a2be2" opacity={0.35} />
      <Sparkles count={40} scale={[16, 10, 16]} size={1.2} speed={0.1} color="#ff00a6" opacity={0.25} />
      <BrainSystem agents={agents} pulses={pulses} />
      <OrbitControls enablePan={false} minDistance={5} maxDistance={15} autoRotate autoRotateSpeed={0.35} />
      <EffectComposer>
        <Bloom intensity={0.95} luminanceThreshold={0.12} luminanceSmoothing={0.9} mipmapBlur />
      </EffectComposer>
    </Canvas>
  );
}
