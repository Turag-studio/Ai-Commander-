"use client";

import { useEffect, useState } from "react";
import { GlassPanel } from "./glass-panel";

interface HealthData {
  cpu: { cores: number; loadPercent: number };
  memory: { usedPercent: number; usedMB: number; totalMB: number };
  uptimeSeconds: number;
}

interface ProviderStatus {
  id: string;
  displayName: string;
  isLocal: boolean;
  available: boolean;
}

interface ModelsData {
  providers: ProviderStatus[];
  usage: Record<string, number>;
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function Bar({ percent, color }: { percent: number; color: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, percent)}%`, background: color }} />
    </div>
  );
}

export function SystemPanel() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [models, setModels] = useState<ModelsData | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const [healthRes, modelsRes] = await Promise.all([fetch("/api/system/health", { cache: "no-store" }), fetch("/api/models", { cache: "no-store" })]);
        if (!cancelled && healthRes.ok) setHealth(await healthRes.json());
        if (!cancelled && modelsRes.ok) setModels(await modelsRes.json());
      } catch {
        // transient — next poll retries
      }
    }
    poll();
    const interval = setInterval(poll, 6000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const totalCalls = models ? Object.values(models.usage).reduce((sum, n) => sum + n, 0) : 0;

  return (
    <GlassPanel className="flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-white">System Health</h3>

      <div className="space-y-2">
        <div className="flex justify-between text-[11px] text-white/50">
          <span>CPU ({health?.cpu.cores ?? "—"} cores)</span>
          <span>{health ? `${health.cpu.loadPercent}%` : "—"}</span>
        </div>
        <Bar percent={health?.cpu.loadPercent ?? 0} color="linear-gradient(90deg, #00d4ff, #8a2be2)" />

        <div className="flex justify-between text-[11px] text-white/50">
          <span>Memory ({health ? `${health.memory.usedMB}MB / ${health.memory.totalMB}MB` : "—"})</span>
          <span>{health ? `${health.memory.usedPercent}%` : "—"}</span>
        </div>
        <Bar percent={health?.memory.usedPercent ?? 0} color="linear-gradient(90deg, #00ff9d, #00d4ff)" />
      </div>

      <p className="text-[11px] text-white/30">Uptime: {health ? formatUptime(health.uptimeSeconds) : "—"}</p>

      <div className="border-t border-white/10 pt-3">
        <h4 className="mb-2 text-xs font-semibold text-white/80">AI Models ({totalCalls} calls)</h4>
        <div className="space-y-1.5">
          {(models?.providers ?? []).map((p) => (
            <div key={p.id} className="flex items-center justify-between text-[11px]">
              <span className="text-white/60">
                {p.displayName} {p.isLocal && <span className="text-neon-green">(local)</span>}
              </span>
              <span className={p.available ? "text-neon-green" : "text-white/25"}>{p.available ? "ready" : "offline"}</span>
            </div>
          ))}
        </div>
      </div>
    </GlassPanel>
  );
}
