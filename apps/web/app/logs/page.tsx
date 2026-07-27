"use client";

import { useEffect, useRef, useState } from "react";
import type { CommanderNotification } from "@ai-commander/core";
import { PageHeader } from "@/components/page-header";
import { GlassPanel } from "@/components/glass-panel";

const levelColor: Record<string, string> = {
  info: "text-neon-cyan",
  success: "text-neon-green",
  warning: "text-neon-amber",
  critical: "text-neon-red",
};

export default function LogsPage() {
  const [logs, setLogs] = useState<CommanderNotification[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok || cancelled) return;
      const data = (await res.json()) as { notifications: CommanderNotification[] };
      if (!cancelled) setLogs([...data.notifications].reverse());
    }
    poll();
    const interval = setInterval(poll, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs.length]);

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Logs" subtitle="Raw system log stream." />
      <GlassPanel className="flex-1 overflow-y-auto font-mono text-xs">
        {logs.map((log) => (
          <div key={log.id} className="py-0.5">
            <span className="text-white/30">[{new Date(log.createdAt).toISOString()}]</span>{" "}
            <span className={levelColor[log.severity]}>{log.severity.toUpperCase()}</span>{" "}
            {log.agentId && <span className="text-neon-purple">{log.agentId}:</span>}{" "}
            <span className="text-white/70">{log.title} — {log.message}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </GlassPanel>
    </div>
  );
}
