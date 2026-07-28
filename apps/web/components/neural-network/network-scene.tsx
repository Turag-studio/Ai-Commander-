"use client";

import { Html, Line, OrbitControls, Sparkles } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, ChromaticAberration, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { AgentDescriptor, AgentId, AgentStatus, NotificationSeverity } from "@ai-commander/core";
import { CORTEX_COLOR, CORTEX_LABEL, CORTEX_REGION_LABEL } from "@/lib/cortex";

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

/** A single stored memory record, as rendered in the Memory Graph. */
export interface MemoryNode {
  id: string;
  namespace: string;
  text: string;
  createdAt: string;
}

const SEVERITY_COLOR: Record<NotificationSeverity, string> = {
  info: "#00d4ff",
  success: "#ffd447",
  warning: "#ffb020",
  critical: "#ff3b5c",
};

// Deliberately smaller than CLUSTER_NODE_RADIUS so neighboring clusters overlap
// into one cohesive mass around the core, instead of sitting apart as separate
// islands — matches the reference's dense, merged-together composition.
const CLUSTER_ANCHOR_RADIUS = 2.5;
const CLUSTER_NODE_RADIUS = 1.2;
// Sparse on purpose — the reference reads as a delicate wireframe/energy cloud
// with dark space showing through, not a solid mass of opaque dots.
const CLUSTER_NODE_COUNT = 26;
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

/**
 * A flattened, portrait-oriented cloud instead of a full sphere — biases
 * clusters toward camera-facing so most of them are visible at once from
 * the default angle, like a fixed hero shot, instead of wrapping evenly
 * around a globe where half are always behind the core.
 */
function frontalCloud(count: number, radiusXY: number, depthZ: number): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / Math.max(1, count - 1)) * 2;
    const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = goldenAngle * i;
    const x = Math.cos(theta) * radiusAtY;
    const zNorm = Math.sin(theta) * radiusAtY;
    points.push(new THREE.Vector3(x * radiusXY, y * radiusXY * 0.92, zNorm * depthZ));
  }
  return points;
}

/** A jagged, lightning-like polyline between two points instead of a smooth line — the long spokes reaching out to each cluster should read as electric branches, not clean cables. */
function buildJaggedPath(a: THREE.Vector3, b: THREE.Vector3, seed: number, segments = 5, jitter = 0.22): THREE.Vector3[] {
  const rand = mulberry32(seed);
  const dir = b.clone().sub(a);
  const length = dir.length() || 1;
  const up = Math.abs(dir.y) < length * 0.99 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const perp1 = new THREE.Vector3().crossVectors(dir, up).normalize();
  const perp2 = new THREE.Vector3().crossVectors(dir, perp1).normalize();

  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const point = a.clone().lerp(b, t);
    if (i > 0 && i < segments) {
      const falloff = Math.sin(t * Math.PI);
      point.addScaledVector(perp1, (rand() - 0.5) * jitter * length * falloff);
      point.addScaledVector(perp2, (rand() - 0.5) * jitter * length * falloff);
    }
    points.push(point);
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
  neuronCount: number;
  baselineFiring: number;
}

const STATUS_FIRING_RATE: Record<AgentStatus, [number, number]> = {
  idle: [0.3, 1.2],
  completed: [0.4, 1.4],
  running: [55, 92],
  error: [2, 8],
};

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
        <meshBasicMaterial ref={materialRef} color="#00eaff" wireframe transparent opacity={0.28} toneMapped={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
      {/* Soft wide halo — the blown-out white core glow that dominates the reference footage */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.75, 16, 16]} />
        <meshBasicMaterial color="#bfeeff" transparent opacity={0.22} toneMapped={false} />
      </mesh>
      {/* Vertical light beam through the core — the reference's dominant visual anchor, a blown-out lightning column */}
      <mesh>
        <cylinderGeometry args={[0.035, 0.035, 3.4, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.85} toneMapped={false} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.09, 0.09, 3.4, 16]} />
        <meshBasicMaterial color="#bfeeff" transparent opacity={0.25} toneMapped={false} />
      </mesh>
      {/* Tight shimmering burst right at the core, distinct from the ambient background particle fields */}
      <Sparkles count={150} scale={[2.4, 2.4, 2.4]} size={3} speed={1.2} color="#ffffff" opacity={0.85} />
      <pointLight color={pulse ? SEVERITY_COLOR[pulse.severity] : "#00d4ff"} intensity={processing ? 24 : 18} distance={22} />
    </group>
  );
}

const THINKING_RING_COUNT = 3;
const THINKING_CYCLE_SECONDS = 2.2;

/**
 * Explicit "the Commander is thinking" cue: concentric sonar-ping rings
 * expanding out from the core and fading, only while a mission is
 * actively processing — distinct from the core's constant idle breathing.
 */
function ThinkingWaves({ processing }: { processing: boolean }) {
  const ringRefs = useRef<Array<THREE.Mesh | null>>([]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    for (let i = 0; i < THINKING_RING_COUNT; i++) {
      const mesh = ringRefs.current[i];
      if (!mesh) continue;
      if (!processing) {
        mesh.visible = false;
        continue;
      }
      const phase = ((t + i * (THINKING_CYCLE_SECONDS / THINKING_RING_COUNT)) % THINKING_CYCLE_SECONDS) / THINKING_CYCLE_SECONDS;
      mesh.visible = true;
      mesh.scale.setScalar(0.6 + phase * 6.5);
      const material = mesh.material as THREE.MeshBasicMaterial;
      material.opacity = Math.max(0, 0.4 * (1 - phase));
    }
  });

  return (
    <group>
      {Array.from({ length: THINKING_RING_COUNT }).map((_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            ringRefs.current[i] = el;
          }}
          visible={false}
        >
          <sphereGeometry args={[0.5, 20, 20]} />
          <meshBasicMaterial color="#00eaff" wireframe transparent opacity={0} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * One jagged core→cluster spoke rendered as a real fat line (drei's Line —
 * backed by Line2/meshline, so it has genuine pixel width, unlike raw
 * lineBasicMaterial which caps at ~1px in WebGL) with a slow electric
 * flicker so it reads as a live lightning bolt, not a static cable.
 */
function ClusterSpoke({ core, anchor, color, seed }: { core: THREE.Vector3; anchor: THREE.Vector3; color: string; seed: number }) {
  const points = useMemo(() => buildJaggedPath(core, anchor, seed, 6, 0.3).map((p) => p.toArray() as [number, number, number]), [core, anchor, seed]);
  // drei's <Line> forwards its ref to the underlying Line2 primitive, whose `.material` (a LineMaterial) is what actually holds opacity.
  const lineRef = useRef<{ material: THREE.Material & { opacity: number } } | null>(null);
  const flickerSeed = useMemo(() => seed * 12.9898, [seed]);

  useFrame(({ clock }) => {
    if (!lineRef.current) return;
    const t = clock.getElapsedTime();
    const flicker = 0.75 + 0.25 * Math.sin(t * 9 + flickerSeed) * Math.sin(t * 3.3 + flickerSeed * 1.7);
    lineRef.current.material.opacity = 0.5 * flicker;
  });

  return (
    <Line
      ref={lineRef as never}
      points={points}
      color={color}
      lineWidth={2.2}
      transparent
      opacity={0.5}
      toneMapped={false}
    />
  );
}

/** The dense mesh of links inside each cluster — hundreds of short chords, still merged into one draw call since individual fat lines would be too costly at that count. */
function NetworkEdges({ core, clusters }: { core: THREE.Vector3; clusters: ClusterData[] }) {
  const geometry = useMemo(() => {
    const positions: number[] = [];
    const colors: number[] = [];
    const addEdge = (a: THREE.Vector3, b: THREE.Vector3, color: THREE.Color) => {
      positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
      colors.push(color.r, color.g, color.b, color.r, color.g, color.b);
    };

    clusters.forEach((cluster) => {
      const color = new THREE.Color(cluster.color);
      // Sparse, wispy web of crossing links inside each cluster — a couple of offset
      // "chords" per node, thinned further by a skip test, so dark space shows through
      // and it reads as a delicate wireframe filament rather than a solid mass.
      const n = cluster.positions.length;
      const offsets = [1, Math.floor(n / 3)];
      for (let i = 0; i < n; i++) {
        offsets.forEach((offset, offsetIndex) => {
          if (offset < 1) return;
          if ((i + offsetIndex) % (offsetIndex + 3) !== 0) return;
          addEdge(cluster.positions[i], cluster.positions[(i + offset) % n], color);
        });
      }
    });

    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    return geom;
  }, [clusters]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <group>
      <lineSegments geometry={geometry}>
        <lineBasicMaterial vertexColors transparent opacity={0.4} toneMapped={false} />
      </lineSegments>
      {clusters.map((cluster, i) => (
        <ClusterSpoke key={cluster.agentId} core={core} anchor={cluster.anchor} color={cluster.color} seed={i + 1} />
      ))}
    </group>
  );
}

const STARBURST_RAY_COUNT = 64;
const STARBURST_MIN_RADIUS = 4.2;
const STARBURST_MAX_RADIUS = 11;

/**
 * Dozens of fine rays shooting from the core out past the clusters to the
 * edge of the scene, each carrying a traveling spark — the signature
 * "energy explosion" read from the reference footage, distinct from the
 * core→cluster spokes which stop at each cluster.
 */
/** One outward ray rendered as a real fat line with its own slow electric flicker, so the starburst reads as dozens of independent bolts instead of one static mesh. */
function StarburstRay({ points, seed }: { points: [number, number, number][]; seed: number }) {
  const lineRef = useRef<{ material: THREE.Material & { opacity: number } } | null>(null);
  const flickerSeed = useMemo(() => seed * 7.1897, [seed]);

  useFrame(({ clock }) => {
    if (!lineRef.current) return;
    const t = clock.getElapsedTime();
    const flicker = 0.6 + 0.4 * Math.sin(t * 6 + flickerSeed) * Math.sin(t * 1.8 + flickerSeed * 1.4);
    lineRef.current.material.opacity = 0.55 * Math.max(0, flicker);
  });

  return <Line ref={lineRef as never} points={points} color="#dff3ff" lineWidth={1.1} transparent opacity={0.55} toneMapped={false} />;
}

function Starburst({ core }: { core: THREE.Vector3 }) {
  const rayEnds = useMemo(() => {
    const rand = mulberry32(777);
    const ends: THREE.Vector3[] = [];
    for (let i = 0; i < STARBURST_RAY_COUNT; i++) {
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(2 * rand() - 1);
      const r = STARBURST_MIN_RADIUS + rand() * (STARBURST_MAX_RADIUS - STARBURST_MIN_RADIUS);
      ends.push(new THREE.Vector3(Math.sin(phi) * Math.cos(theta), Math.sin(phi) * Math.sin(theta), Math.cos(phi)).multiplyScalar(r));
    }
    return ends;
  }, []);

  // Long, gently sweeping spikes rather than a jagged zigzag — the reference's rays
  // curve softly outward from the core, closer to a dandelion/sparkler than a bolt.
  const rayPaths = useMemo(
    () => rayEnds.map((end, i) => buildJaggedPath(core, end, i + 500, 4, 0.05).map((p) => p.toArray() as [number, number, number])),
    [core, rayEnds]
  );

  const sparkRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const phases = useMemo(() => rayEnds.map((_, i) => (i * 0.6180339887) % 1), [rayEnds]);

  useFrame(({ clock }) => {
    if (!sparkRef.current) return;
    const t = clock.getElapsedTime();
    for (let i = 0; i < rayEnds.length; i++) {
      const progress = (t * 0.22 + phases[i]) % 1;
      dummy.position.lerpVectors(core, rayEnds[i], progress);
      const fade = progress < 0.12 ? progress / 0.12 : progress > 0.8 ? (1 - progress) / 0.2 : 1;
      dummy.scale.setScalar(Math.max(0.001, fade));
      dummy.updateMatrix();
      sparkRef.current.setMatrixAt(i, dummy.matrix);
    }
    sparkRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      {rayPaths.map((points, i) => (
        <StarburstRay key={i} points={points} seed={i} />
      ))}
      <instancedMesh ref={sparkRef} args={[undefined, undefined, rayEnds.length]}>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

/** Every node in one cluster, instanced for performance — sparse and small, a scatter of points rather than a solid mass. */
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
      <sphereGeometry args={[0.055, 10, 10]} />
      <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.8} />
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
      <sphereGeometry args={[0.07, 10, 10]} />
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
      <sphereGeometry args={[0.1, 10, 10]} />
      <meshBasicMaterial color="#ffffff" toneMapped={false} />
    </mesh>
  );
}

/** Deterministic per-status firing rate, seeded per cluster so idle clusters each settle on their own quiet baseline instead of all showing the same number. */
function firingRateFor(cluster: ClusterData, status: AgentStatus): string {
  const [lo, hi] = STATUS_FIRING_RATE[status];
  if (status === "idle" || status === "completed") return cluster.baselineFiring.toFixed(1);
  const rand = mulberry32(cluster.neuronCount + (status === "running" ? 900 : 400));
  return (lo + rand() * (hi - lo)).toFixed(1);
}

/** Hover hit-target + persistent compact label + detail card for one cluster. */
function ClusterLabel({ cluster, agent }: { cluster: ClusterData; agent: BrainAgentState }) {
  const [hovered, setHovered] = useState(false);
  const firing = firingRateFor(cluster, agent.status);
  return (
    <group position={cluster.anchor}>
      <mesh onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)} visible={false}>
        <sphereGeometry args={[CLUSTER_NODE_RADIUS * 1.15, 8, 8]} />
        <meshBasicMaterial />
      </mesh>
      {!hovered && (
        <Html distanceFactor={11} center occlude={false}>
          <div
            className="pointer-events-none whitespace-nowrap rounded-sm border border-white/10 border-t-2 bg-black/65 px-2 py-1 font-mono text-[9px] backdrop-blur-md"
            style={{ borderTopColor: cluster.color }}
          >
            <div className="font-semibold uppercase tracking-wider" style={{ color: cluster.color }}>
              {CORTEX_REGION_LABEL[cluster.agentId]}
            </div>
            <div className="text-white/70">
              {cluster.neuronCount} neurons · firing {firing}%
            </div>
          </div>
        </Html>
      )}
      {hovered && (
        <Html distanceFactor={9} center>
          <div className="pointer-events-none w-48 rounded-lg border border-neon-cyan/30 bg-void-950/90 px-3 py-2 text-center shadow-glow backdrop-blur">
            <p className="text-xs font-semibold text-white">{agent.descriptor.name}</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-widest text-neon-cyan/70">{CORTEX_LABEL[cluster.agentId]}</p>
            <p className="mt-0.5 text-[9px] uppercase tracking-widest text-white/35">{CORTEX_REGION_LABEL[cluster.agentId]} region</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-widest text-white/40">{agent.status}</p>
            {agent.lastSummary && <p className="mt-1 text-[10px] text-white/50 line-clamp-3">{agent.lastSummary}</p>}
          </div>
        </Html>
      )}
    </group>
  );
}

const MEMORY_GRAPH_RADIUS = 1.3;

/** Namespace strings match the AgentId that wrote them (research/content/analytics/finance); "general" has no agent, so it falls back to gold. */
function memoryNodeColor(namespace: string): string {
  return (CORTEX_COLOR as Record<string, string>)[namespace] ?? "#ffd447";
}

/**
 * A real graph of the Memory Agent's actual stored records — distinct from
 * the Memory cluster itself (which just represents the agent). Nodes are
 * genuine memories (auto-stored after research/content/analytics/finance
 * missions complete), colored by which agent wrote them, chained
 * chronologically and hubbed off the Memory cluster's anchor point.
 */
function MemoryGraph({ anchor, memories }: { anchor: THREE.Vector3; memories: MemoryNode[] }) {
  const center = useMemo(() => anchor.clone().multiplyScalar(1.55), [anchor]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const nodePositions = useMemo(() => {
    return memories.map((_, i) => {
      const angle = (i / Math.max(1, memories.length)) * Math.PI * 2;
      const radius = MEMORY_GRAPH_RADIUS * (0.45 + 0.55 * ((i % 5) / 5));
      return new THREE.Vector3(
        center.x + Math.cos(angle) * radius,
        center.y + Math.sin(angle) * radius * 0.7,
        center.z + Math.sin(angle * 1.7) * radius * 0.5
      );
    });
  }, [center, memories]);

  const edgeGeometry = useMemo(() => {
    const positions: number[] = [];
    for (let i = 0; i < nodePositions.length; i++) {
      positions.push(center.x, center.y, center.z, nodePositions[i].x, nodePositions[i].y, nodePositions[i].z);
      if (i > 0) {
        const prev = nodePositions[i - 1];
        positions.push(prev.x, prev.y, prev.z, nodePositions[i].x, nodePositions[i].y, nodePositions[i].z);
      }
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return geom;
  }, [center, nodePositions]);

  useEffect(() => () => edgeGeometry.dispose(), [edgeGeometry]);

  if (memories.length === 0) return null;

  return (
    <group>
      <lineSegments geometry={edgeGeometry}>
        <lineBasicMaterial color="#ffd447" transparent opacity={0.22} toneMapped={false} />
      </lineSegments>
      {memories.map((memory, i) => (
        <group key={memory.id} position={nodePositions[i]}>
          <mesh onPointerOver={() => setHoveredId(memory.id)} onPointerOut={() => setHoveredId((id) => (id === memory.id ? null : id))}>
            <sphereGeometry args={[0.065, 10, 10]} />
            <meshBasicMaterial color={memoryNodeColor(memory.namespace)} toneMapped={false} transparent opacity={0.9} />
          </mesh>
          {hoveredId === memory.id && (
            <Html distanceFactor={9} center>
              <div className="pointer-events-none w-52 rounded-lg border border-neon-amber/30 bg-void-950/90 px-3 py-2 text-center shadow-glow backdrop-blur">
                <p className="text-[10px] uppercase tracking-widest text-neon-amber/80">{memory.namespace} memory</p>
                <p className="mt-1 text-[10px] text-white/60 line-clamp-4">{memory.text}</p>
              </div>
            </Html>
          )}
        </group>
      ))}
      <Html position={center.toArray()} distanceFactor={12} center occlude={false}>
        <div className="pointer-events-none whitespace-nowrap rounded border border-neon-amber/30 bg-void-950/50 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-neon-amber/80 backdrop-blur-sm">
          Memory Graph · {memories.length}
        </div>
      </Html>
    </group>
  );
}

function NetworkSystem({
  agents,
  pulses,
  memories,
}: {
  agents: BrainAgentState[];
  pulses: BrainPulse[];
  memories: MemoryNode[];
}) {
  const groupRef = useRef<THREE.Group>(null);
  const processing = agents.some((a) => a.status === "running");
  const core = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  const anchors = useMemo(() => frontalCloud(agents.length, CLUSTER_ANCHOR_RADIUS, CLUSTER_ANCHOR_RADIUS * 0.4), [agents.length]);

  const clusters = useMemo<ClusterData[]>(
    () =>
      agents.map((agent, i) => {
        const rand = mulberry32(i + 1);
        return {
          agentId: agent.descriptor.id,
          anchor: anchors[i],
          positions: buildClusterNodes(anchors[i], CLUSTER_NODE_COUNT, CLUSTER_NODE_RADIUS, i + 1),
          color: CORTEX_COLOR[agent.descriptor.id],
          neuronCount: 120 + Math.floor(rand() * 160),
          baselineFiring: 0.3 + rand() * 0.9,
        };
      }),
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

  const memoryCluster = useMemo(() => clusters.find((c) => c.agentId === "memory"), [clusters]);

  useFrame(({ clock }) => {
    if (groupRef.current) groupRef.current.rotation.y = clock.getElapsedTime() * 0.008;
  });

  return (
    <group ref={groupRef}>
      <CommanderCore processing={processing} pulse={pulseByAgent.get("commander")} />
      <ThinkingWaves processing={processing} />
      <Starburst core={core} />
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
      {memoryCluster && <MemoryGraph anchor={memoryCluster.anchor} memories={memories} />}
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
      <Bloom intensity={2.4} luminanceThreshold={0.02} luminanceSmoothing={0.55} mipmapBlur />
      <ChromaticAberration offset={new THREE.Vector2(0.0006, 0.0006)} radialModulation={false} modulationOffset={0} />
      <Noise opacity={0.035} blendFunction={BlendFunction.OVERLAY} premultiply />
      <Vignette eskil={false} offset={0.22} darkness={0.9} />
    </EffectComposer>
  );
}

export function BrainScene({
  agents,
  pulses = [],
  memories = [],
}: {
  agents: BrainAgentState[];
  pulses?: BrainPulse[];
  memories?: MemoryNode[];
}) {
  return (
    <Canvas camera={{ position: [0, 1.2, 11.5], fov: 46 }} dpr={[1, 1.5]}>
      <fogExp2 attach="fog" args={["#05060a", 0.022]} />
      <ambientLight intensity={0.1} color="#5ad6ff" />
      <Sparkles count={700} scale={[28, 18, 28]} size={1.2} speed={0.2} color="#5ea8ff" opacity={0.4} />
      <Sparkles count={500} scale={[30, 20, 30]} size={1} speed={0.12} color="#a37bf0" opacity={0.28} />
      <Sparkles count={300} scale={[26, 17, 26]} size={0.9} speed={0.15} color="#e05fa8" opacity={0.2} />
      <NetworkSystem agents={agents} pulses={pulses} memories={memories} />
      <OrbitControls enablePan={false} minDistance={7} maxDistance={20} autoRotate autoRotateSpeed={0.08} />
      <PostFX />
    </Canvas>
  );
}
