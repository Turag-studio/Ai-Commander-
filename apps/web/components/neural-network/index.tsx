"use client";

import dynamic from "next/dynamic";
import type { BrainAgentState, BrainPulse, MemoryNode } from "./network-scene";

const BrainScene = dynamic(() => import("./network-scene").then((mod) => mod.BrainScene), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <div className="h-24 w-24 animate-pulse-glow rounded-full bg-neon-cyan/20 shadow-glow" />
    </div>
  ),
});

export function NeuralNetwork({
  agents,
  pulses,
  memories,
}: {
  agents: BrainAgentState[];
  pulses?: BrainPulse[];
  memories?: MemoryNode[];
}) {
  return (
    <div className="relative h-full w-full">
      <BrainScene agents={agents} pulses={pulses} memories={memories} />
    </div>
  );
}

export type { BrainAgentState, BrainPulse, MemoryNode } from "./network-scene";
