"use client";

import dynamic from "next/dynamic";
import type { BrainAgentState, BrainPulse } from "./brain-scene";

const BrainScene = dynamic(() => import("./brain-scene").then((mod) => mod.BrainScene), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <div className="h-24 w-24 animate-pulse-glow rounded-full bg-neon-cyan/20 shadow-glow" />
    </div>
  ),
});

export function NeuralBrain({ agents, pulses }: { agents: BrainAgentState[]; pulses?: BrainPulse[] }) {
  return (
    <div className="relative h-full w-full">
      <BrainScene agents={agents} pulses={pulses} />
    </div>
  );
}

export type { BrainAgentState, BrainPulse } from "./brain-scene";
