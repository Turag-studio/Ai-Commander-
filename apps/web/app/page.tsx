"use client";

import { useEffect, useState } from "react";
import type { AgentDescriptor, AgentStatus } from "@ai-commander/core";
import { NeuralBrain } from "@/components/neural-brain";
import { GlassPanel } from "@/components/glass-panel";
import { StatCard } from "@/components/stat-card";
import { LiveFeed } from "@/components/live-feed";
import { CommandConsole } from "@/components/command-console";

interface AgentState {
  descriptor: AgentDescriptor;
  status: AgentStatus;
  lastSummary?: string;
}

interface DashboardKpis {
  today: { revenue: number; orders: number; visitors: number };
  roas: number;
  inventoryAlerts: Array<{ product: string; stock: number; status: string }>;
}

export default function MissionControlPage() {
  const [agents, setAgents] = useState<AgentState[]>([]);
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const [agentsRes, kpiRes] = await Promise.all([
          fetch("/api/agents", { cache: "no-store" }),
          fetch("/api/dashboard", { cache: "no-store" }),
        ]);
        if (!cancelled && agentsRes.ok) {
          const data = (await agentsRes.json()) as { agents: AgentState[] };
          setAgents(data.agents);
        }
        if (!cancelled && kpiRes.ok) {
          const data = (await kpiRes.json()) as { dashboard: DashboardKpis };
          setKpis(data.dashboard);
        }
      } catch {
        // transient network error — next poll retries
      }
    }

    poll();
    const interval = setInterval(poll, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const runningCount = agents.filter((a) => a.status === "running").length;

  return (
    <div className="flex h-full flex-col gap-5">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Today's Revenue" value={kpis ? `$${kpis.today.revenue.toFixed(2)}` : "—"} accent="cyan" />
        <StatCard label="Orders Today" value={kpis ? String(kpis.today.orders) : "—"} accent="purple" />
        <StatCard label="ROAS" value={kpis ? `${kpis.roas.toFixed(1)}x` : "—"} accent="green" />
        <StatCard label="Agents Active" value={`${runningCount} / ${agents.length || 11}`} accent={runningCount > 0 ? "amber" : "cyan"} />
      </div>

      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-3">
        <GlassPanel className="relative min-h-[420px] overflow-hidden lg:col-span-2">
          <div className="pointer-events-none absolute left-4 top-4 z-10">
            <p className="text-xs uppercase tracking-widest text-neon-cyan/70">Neural Command Center</p>
            <p className="text-[10px] text-white/30">Drag to rotate · hover a node for detail</p>
          </div>
          <div className="h-full min-h-[420px] w-full">
            <NeuralBrain agents={agents.map((a) => ({ descriptor: a.descriptor, status: a.status, lastSummary: a.lastSummary }))} />
          </div>
        </GlassPanel>

        <div className="min-h-[420px]">
          <LiveFeed />
        </div>
      </div>

      <CommandConsole />
    </div>
  );
}
