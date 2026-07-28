"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentDescriptor, AgentStatus, CommanderNotification } from "@ai-commander/core";
import { NeuralNetwork, type BrainPulse, type MemoryNode } from "@/components/neural-network";
import { GlassPanel } from "@/components/glass-panel";
import { LiveFeed } from "@/components/live-feed";
import { CommandConsole } from "@/components/command-console";
import { SystemPanel } from "@/components/system-panel";
import { CORTEX_COLOR, CORTEX_LABEL } from "@/lib/cortex";
import { useNotificationStream } from "@/lib/hooks/use-notification-stream";

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

interface LiveShopify {
  revenue: number;
  orderCount: number;
  averageOrderValue: number;
  currency: string;
}

const PULSE_WINDOW_MS = 4000;

const STATUS_LABEL: Record<AgentStatus, string> = {
  idle: "IDLE",
  running: "LIVE",
  completed: "OK",
  error: "ERROR",
};

const STATUS_CLASS: Record<AgentStatus, string> = {
  idle: "text-white/25",
  running: "text-neon-cyan",
  completed: "text-neon-green",
  error: "text-neon-red",
};

export default function MissionControlPage() {
  const [agents, setAgents] = useState<AgentState[]>([]);
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [liveShopify, setLiveShopify] = useState<LiveShopify | null>(null);
  const [pulses, setPulses] = useState<BrainPulse[]>([]);
  const [memories, setMemories] = useState<MemoryNode[]>([]);
  const [clock, setClock] = useState("");
  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch("/api/agents", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { agents: AgentState[] };
        setAgents(data.agents);
      }
    } catch {
      // transient network error — next poll retries
    }
  }, []);

  const fetchKpis = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { dashboard: DashboardKpis; liveShopify: LiveShopify | null };
        setKpis(data.dashboard);
        setLiveShopify(data.liveShopify);
      }
    } catch {
      // transient network error — next poll retries
    }
  }, []);

  const fetchMemories = useCallback(async () => {
    try {
      const res = await fetch("/api/memory/graph", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { memories: MemoryNode[] };
        setMemories(data.memories);
      }
    } catch {
      // transient network error — next poll retries
    }
  }, []);

  useEffect(() => {
    fetchAgents();
    fetchKpis();
    fetchMemories();
    const interval = setInterval(() => {
      fetchAgents();
      fetchKpis();
    }, 8000);
    const memoryInterval = setInterval(fetchMemories, 20000);
    return () => {
      clearInterval(interval);
      clearInterval(memoryInterval);
    };
  }, [fetchAgents, fetchKpis, fetchMemories]);

  useEffect(() => {
    const update = () => setClock(new Date().toUTCString().slice(17, 25));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleNotification = useCallback(
    (notification: CommanderNotification) => {
      setPulses((prev) => {
        const now = Date.now();
        const next = [
          ...prev.filter((p) => now - p.receivedAt < PULSE_WINDOW_MS),
          { id: notification.id, agentId: notification.agentId, severity: notification.severity, receivedAt: now },
        ];
        return next.slice(-30);
      });

      // A notification usually means an agent's status just changed — refresh
      // almost instantly instead of waiting for the next 8s poll.
      if (refetchTimer.current) clearTimeout(refetchTimer.current);
      refetchTimer.current = setTimeout(() => {
        fetchAgents();
        fetchKpis();
      }, 150);
    },
    [fetchAgents, fetchKpis]
  );

  useNotificationStream(handleNotification);

  const runningCount = agents.filter((a) => a.status === "running").length;
  const revenueLabel = liveShopify ? `${liveShopify.currency} ${liveShopify.revenue.toFixed(2)}` : kpis ? `$${kpis.today.revenue.toFixed(2)}` : "—";
  const ordersLabel = liveShopify ? String(liveShopify.orderCount) : kpis ? String(kpis.today.orders) : "—";

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="relative flex-1 overflow-hidden rounded-xl border border-neon-cyan/10 bg-void-950">
        <div className="absolute inset-0">
          <NeuralNetwork
            agents={agents.map((a) => ({ descriptor: a.descriptor, status: a.status, lastSummary: a.lastSummary }))}
            pulses={pulses}
            memories={memories}
          />
        </div>

        {/* Top bar overlay */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between p-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.3em] text-neon-cyan text-glow">AI COMMANDER OS</p>
            <p className="text-[10px] text-white/40">NEURAL NETWORK · CONNECTED</p>
          </div>
          <div className="pointer-events-auto rounded-full border border-neon-green/30 bg-black/40 px-3 py-1 text-[10px] tracking-widest text-neon-green backdrop-blur">
            ● MISSION LIVE · {clock}
          </div>
          <p className="text-right text-[10px] text-white/30">
            DRAG TO ROTATE
            <br />
            HOVER A CLUSTER
          </p>
        </div>

        {/* Live metrics + cluster status — bounded top-16..bottom-4 so they never collide with the panels below */}
        <div className="pointer-events-auto absolute bottom-4 right-4 top-16 z-20 flex w-64 flex-col gap-3">
          <GlassPanel className="shrink-0">
            <p className="mb-2 text-[10px] uppercase tracking-widest text-white/40">Live Metrics</p>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-white/50">Revenue</span>
                <span className="text-neon-cyan">{revenueLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Orders</span>
                <span className="text-neon-purple">{ordersLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">ROAS</span>
                <span className="text-neon-green">{kpis ? `${kpis.roas.toFixed(1)}x` : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Agents Active</span>
                <span className={runningCount > 0 ? "text-neon-amber" : "text-white/40"}>
                  {runningCount} / {agents.length || 11}
                </span>
              </div>
            </div>
          </GlassPanel>

          <GlassPanel className="flex min-h-[120px] flex-1 flex-col">
            <p className="mb-2 shrink-0 text-[10px] uppercase tracking-widest text-white/40">Cluster Status</p>
            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
              {agents.map((a) => (
                <div key={a.descriptor.id} className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1.5 text-white/60">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: CORTEX_COLOR[a.descriptor.id] }} />
                    {CORTEX_LABEL[a.descriptor.id]}
                  </span>
                  <span className={STATUS_CLASS[a.status]}>{STATUS_LABEL[a.status]}</span>
                </div>
              ))}
            </div>
          </GlassPanel>

          {/* Model status / CPU / memory — bottom-right, per the reference HUD layout */}
          <div className="shrink-0">
            <SystemPanel />
          </div>
        </div>

        {/* Live feed / console logs — bounded bottom-left column, capped so it never overlaps the top bar */}
        <div className="pointer-events-auto absolute bottom-4 left-4 top-16 z-20 w-72">
          <LiveFeed />
        </div>
      </div>

      <CommandConsole
        onMissionComplete={() => {
          fetchAgents();
          fetchMemories();
        }}
      />
    </div>
  );
}
