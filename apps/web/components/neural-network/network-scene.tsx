"use client";

import { Html, OrbitControls, Sparkles } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useEffect, useMemo, useRef, useState } from "react";
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

const SEVERITY_COLOR: Record<NotificationSeverity, string> = {
  info: "#00d4ff",
  success: "#ffd447",
  warning: "#ffb020",
  critical: "#ff3b5c",
};

const CLUSTER_ANCHOR_RADIUS = 5.6;
const CLUSTER_NODE_RADIUS = 1.2;
const CLUSTER_NODE_COUNT = 70;
const CLUSTER_FLASH_MS = 1200;
const CORE_FLASH_MS = 1800;
const EVENT_TRAVEL_MS = 900;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0 || 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Evenly distributes N points on a sphere shell (Fibonacci sphere) — used for cluster anchor positions. */
function fibonacciSphere(count: number, radius: number): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / Math.max(1, count - 1)) * 2;
    const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = goldenAngle * i;
    const x = Math.cos(theta) * radiusAtY;
    const z = Math.sin(theta) * radiusAtY;
    points.push(new THREE.Vector3(x, y * 0.65, z).multiplyScalar(radius));
  }
  return points;
}

/** A dense cloud of node positions filling a sphere around a cluster anchor — deterministic per seed so it's stable across re-renders. */
function buildClusterNodes(anchor: THREE.Vector3, count: number, radius: number, seed: number): THREE.Vector3[] {
  const rand = mulberry32(seed);
  const points: THREE.Vector3[] = [];
  for (let i = 0; i < count; i++) {
    const theta = rand() * Math.PI * 2;
    const phi = Math.acos(2 * rand() - 1);
    const r = radius * Math.cbrt(rand());
    points.push(
      new THREE.Vector3(
        anchor.x + r * Math.sin(phi) * Math.cos(theta),
        anchor.y + r * Math.sin(phi) * Math.sin(theta),
        anchor.z + r * Math.cos(phi)
      )
    );
  }
  return points;
}

interface ClusterData {
  agentId: AgentId;
  anchor: THREE.Vector3;
  positions: THREE.Vector3[];
  color: string;
}

/** The AI consciousness at the center — every task begins and ends here. */
function CommanderCore({ processing, pulse }: { processing: boolean; pulse?: BrainPulse }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const baseColor = useMemo(() => new THREE.Color("#00eaff"), []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const pulseScale = processing ? 1 + Math.sin(t * 5) * 0.22 : 1 + Math.sin(t * 1.2) * 0.08;

    let flash = 0;
    if (pulse) {
      const age = Date.now() - pulse.receivedAt;
      if (age < CORE_FLASH_MS) flash = 1 - age / CORE_FLASH_MS;
    }

    if (meshRef.current) {
      meshRef.current.scale.setScalar(pulseScale * (1 + flash * 0.5));
      meshRef.current.rotation.y = t * 0.15;
      meshRef.current.rotation.x = t * 0.08;
    }
    if (glowRef.current) glowRef.current.scale.setScalar(pulseScale * 2.4);
    if (materialRef.current) {
      const target = pulse ? new THREE.Color(SEVERITY_COLOR[pulse.severity]) : baseColor;
      materialRef.current.color.lerpColors(baseColor, target, flash);
    }
  });

  return (
    <group>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[0.5, 2]} />
        <meshBasicMaterial ref={materialRef} color="#00eaff" wireframe toneMapped={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.28, 16, 16]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial color="#00d4ff" transparent opacity={0.1} toneMapped={false} />
      </mesh>
      <pointLight color={pulse ? SEVERITY_COLOR[pulse.severity] : "#00d4ff"} intensity={processing ? 13 : 9} distance={18} />
    </group>
  );
}

/** One static draw call for every connection in the network: core→cluster spokes plus a mesh of links within each cluster. */
function NetworkEdges({ core, clusters }: { core: THREE.Vector3; clusters: ClusterData[] }) {
  const geometry = useMemo(() => {
    const positions: number[] = [];
    const colors: number[] = [];
    const addEdge = (a: THREE.Vector3, b: THREE.Vector3, color: THREE.Color) => {
      positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
      colors.push(color.r, color.g, color.b, color.r, color.g, color.b);
    };

    for (const cluster of clusters) {
      const color = new THREE.Color(cluster.color);
      addEdge(core, cluster.anchor, color);
      const n = cluster.positions.length;
      const chord = Math.floor(n / 3);
      for (let i = 0; i < n; i++) {
        addEdge(cluster.positions[i], cluster.positions[(i + 1) % n], color);
        if (i % 5 === 0) addEdge(cluster.positions[i], cluster.positions[(i + chord) % n], color);
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    return geom;
  }, [core, clusters]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial vertexColors transparent opacity={0.2} toneMapped={false} />
    </lineSegments>
  );
}

/** Every node in one cluster, instanced for performance — hundreds of nodes in a single draw call. */
function ClusterNodes({ positions, color, active, pulse }: { positions: THREE.Vector3[]; color: string; active: boolean; pulse?: BrainPulse }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const phases = useMemo(() => positions.map((_, i) => (i * 2.399963) % (Math.PI * 2)), [positions]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();

    let flash = 0;
    if (pulse) {
      const age = Date.now() - pulse.receivedAt;
      if (age < CLUSTER_FLASH_MS) flash = 1 - age / CLUSTER_FLASH_MS;
    }

    for (let i = 0; i < positions.length; i++) {
      const wobble = active ? 1 + Math.sin(t * 4 + phases[i]) * 0.45 : 1 + Math.sin(t * 0.8 + phases[i]) * 0.15;
      dummy.position.copy(positions[i]);
      dummy.scale.setScalar(Math.max(0.15, (0.55 + wobble * 0.45) * (1 + flash * 0.7)));
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, positions.length]}>
      <sphereGeometry args={[0.045, 6, 6]} />
      <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.85} />
    </instancedMesh>
  );
}

/** A continuous particle traveling the spoke while the agent is actively running. */
function RunningPulse({ from, to, active, color }: { from: THREE.Vector3; to: THREE.Vector3; active: boolean; color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    if (!active) {
      ref.current.visible = false;
      return;
    }
    ref.current.visible = true;
    const t = (clock.getElapsedTime() * 0.7) % 1;
    ref.current.position.lerpVectors(from, to, t);
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.07, 8, 8]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  );
}

/** A one-shot bright particle for a real business event (order, publish, error, ...) traveling core→cluster. */
function EventPulse({ from, to, pulse }: { from: THREE.Vector3; to: THREE.Vector3; pulse?: BrainPulse }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (!ref.current) return;
    if (!pulse) {
      ref.current.visible = false;
      return;
    }
    const age = Date.now() - pulse.receivedAt;
    if (age < 0 || age > EVENT_TRAVEL_MS) {
      ref.current.visible = false;
      return;
    }
    ref.current.visible = true;
    ref.current.position.lerpVectors(from, to, age / EVENT_TRAVEL_MS);
    const material = ref.current.material as THREE.MeshBasicMaterial;
    material.color.set(SEVERITY_COLOR[pulse.severity]);
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.1, 8, 8]} />
      <meshBasicMaterial color="#ffffff" toneMapped={false} />
    </mesh>
  );
}

/** Hover hit-target + persistent compact label + detail card for one cluster. */
function ClusterLabel({ cluster, agent }: { cluster: ClusterData; agent: BrainAgentState }) {
  const [hovered, setHovered] = useState(false);
  return (
    <group position={cluster.anchor}>
      <mesh onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)} visible={false}>
        <sphereGeometry args={[CLUSTER_NODE_RADIUS * 1.15, 8, 8]} />
        <meshBasicMaterial />
      </mesh>
      {!hovered && (
        <Html distanceFactor={11} center occlude={false}>
          <div
            className="pointer-events-none whitespace-nowrap rounded border px-1.5 py-0.5 text-[9px] uppercase tracking-wider backdrop-blur-sm"
            style={{ borderColor: `${cluster.color}55`, color: `${cluster.color}cc`, background: "rgba(5,6,8,0.45)" }}
          >
            {CORTEX_LABEL[cluster.agentId]}
          </div>
        </Html>
      )}
      {hovered && (
        <Html distanceFactor={9} center>
          <div className="pointer-events-none w-48 rounded-lg border border-neon-cyan/30 bg-void-950/90 px-3 py-2 text-center shadow-glow backdrop-blur">
            <p className="text-xs font-semibold text-white">{agent.descriptor.name}</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-widest text-neon-cyan/70">{CORTEX_LABEL[cluster.agentId]}</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-widest text-white/40">{agent.status}</p>
            {agent.lastSummary && <p className="mt-1 text-[10px] text-white/50 line-clamp-3">{agent.lastSummary}</p>}
          </div>
        </Html>
      )}
    </group>
  );
}

function NetworkSystem({ agents, pulses }: { agents: BrainAgentState[]; pulses: BrainPulse[] }) {
  const groupRef = useRef<THREE.Group>(null);
  const processing = agents.some((a) => a.status === "running");
  const core = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  const anchors = useMemo(() => fibonacciSphere(agents.length, CLUSTER_ANCHOR_RADIUS), [agents.length]);

  const clusters = useMemo<ClusterData[]>(
    () =>
      agents.map((agent, i) => ({
        agentId: agent.descriptor.id,
        anchor: anchors[i],
        positions: buildClusterNodes(anchors[i], CLUSTER_NODE_COUNT, CLUSTER_NODE_RADIUS, i + 1),
        color: CORTEX_COLOR[agent.descriptor.id],
      })),
    [agents, anchors]
  );

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
    if (groupRef.current) groupRef.current.rotation.y = clock.getElapsedTime() * 0.025;
  });

  return (
    <group ref={groupRef}>
      <CommanderCore processing={processing} pulse={pulseByAgent.get("commander")} />
      <NetworkEdges core={core} clusters={clusters} />
      {clusters.map((cluster, i) => (
        <ClusterNodes
          key={cluster.agentId}
          positions={cluster.positions}
          color={cluster.color}
          active={agents[i].status === "running"}
          pulse={pulseByAgent.get(cluster.agentId)}
        />
      ))}
      {clusters.map((cluster, i) => (
        <RunningPulse key={`run-${cluster.agentId}`} from={core} to={cluster.anchor} active={agents[i].status === "running"} color={cluster.color} />
      ))}
      {clusters.map((cluster) => (
        <EventPulse key={`evt-${cluster.agentId}`} from={core} to={cluster.anchor} pulse={pulseByAgent.get(cluster.agentId)} />
      ))}
      {clusters.map((cluster, i) => (
        <ClusterLabel key={`label-${cluster.agentId}`} cluster={cluster} agent={agents[i]} />
      ))}
    </group>
  );
}

const SOFTWARE_RENDERER_SIGNATURES = ["swiftshader", "llvmpipe", "software", "softpipe", "basic render", "microsoft basic"];

/**
 * @react-three/postprocessing's Bloom renders as a blank canvas under
 * software WebGL (SwiftShader/llvmpipe) instead of erroring, so there's
 * nothing to catch. Detecting the renderer once and skipping
 * post-processing on a software fallback keeps the scene visible
 * everywhere; hardware-accelerated browsers get the full bloom glow.
 */
function usePostProcessingSupported(): boolean {
  const { gl } = useThree();
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    try {
      const context = gl.getContext();
      const debugInfo = context.getExtension("WEBGL_debug_renderer_info");
      const renderer = debugInfo ? String(context.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)).toLowerCase() : "";
      if (SOFTWARE_RENDERER_SIGNATURES.some((sig) => renderer.includes(sig))) {
        setSupported(false);
      }
    } catch {
      // if detection itself fails, err on the side of keeping the effect on
    }
  }, [gl]);

  return supported;
}

function PostFX() {
  const supported = usePostProcessingSupported();
  if (!supported) return null;
  return (
    <EffectComposer>
      <Bloom intensity={1.1} luminanceThreshold={0.1} luminanceSmoothing={0.85} mipmapBlur />
    </EffectComposer>
  );
}

export function BrainScene({ agents, pulses = [] }: { agents: BrainAgentState[]; pulses?: BrainPulse[] }) {
  return (
    <Canvas camera={{ position: [0, 1.8, 13], fov: 50 }} dpr={[1, 1.5]}>
      <fogExp2 attach="fog" args={["#05060a", 0.028]} />
      <ambientLight intensity={0.12} color="#5ad6ff" />
      <Sparkles count={700} scale={[26, 16, 26]} size={1.4} speed={0.2} color="#00d4ff" opacity={0.45} />
      <Sparkles count={500} scale={[28, 18, 28]} size={1.1} speed={0.12} color="#8a2be2" opacity={0.3} />
      <Sparkles count={300} scale={[24, 15, 24]} size={1} speed={0.15} color="#ff00a6" opacity={0.22} />
      <NetworkSystem agents={agents} pulses={pulses} />
      <OrbitControls enablePan={false} minDistance={7} maxDistance={22} autoRotate autoRotateSpeed={0.3} />
      <PostFX />
    </Canvas>
  );
}
