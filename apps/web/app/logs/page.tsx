"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CommanderNotification } from "@ai-commander/core";
import { PageHeader } from "@/components/page-header";
import { GlassPanel } from "@/components/glass-panel";
import { useNotificationStream } from "@/lib/hooks/use-notification-stream";

const levelColor: Record<string, string> = {
  info: "text-neon-cyan",
  success: "text-neon-green",
  warning: "text-neon-amber",
  critical: "text-neon-red",
};

const MAX_LOGS = 300;

export default function LogsPage() {
  const [logs, setLogs] = useState<CommanderNotification[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const handleNotification = useCallback((notification: CommanderNotification) => {
    setLogs((prev) => {
      if (prev.some((n) => n.id === notification.id)) return prev;
      return [...prev, notification].slice(-MAX_LOGS);
    });
  }, []);

  useNotificationStream(handleNotification);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs.length]);

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Logs" subtitle="Live system log stream — every agent event, streamed instantly via SSE." />
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
