"use client";

import type { CommanderNotification, NotificationSeverity } from "@ai-commander/core";
import { useEffect, useState } from "react";
import { GlassPanel } from "./glass-panel";

const severityColor: Record<NotificationSeverity, string> = {
  info: "border-neon-cyan/40 text-neon-cyan",
  success: "border-neon-green/40 text-neon-green",
  warning: "border-neon-amber/40 text-neon-amber",
  critical: "border-neon-red/40 text-neon-red",
};

export function LiveFeed() {
  const [notifications, setNotifications] = useState<CommanderNotification[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/notifications", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { notifications: CommanderNotification[] };
        if (!cancelled) setNotifications(data.notifications);
      } catch {
        // network hiccup — next poll will retry
      }
    }

    poll();
    const interval = setInterval(poll, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <GlassPanel className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-wide text-white">Live Notifications</h3>
        <span className="h-2 w-2 rounded-full bg-neon-green animate-pulse-glow" />
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto pr-1">
        {notifications.length === 0 && (
          <p className="text-xs text-white/30">No activity yet — send a mission from the console above.</p>
        )}
        {notifications.map((n) => (
          <div key={n.id} className={`rounded-md border-l-2 bg-white/5 px-3 py-2 ${severityColor[n.severity]}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">{n.title}</span>
              <span className="text-[10px] text-white/30">{new Date(n.createdAt).toLocaleTimeString()}</span>
            </div>
            <p className="mt-0.5 text-[11px] text-white/50">{n.message}</p>
          </div>
        ))}
      </div>
    </GlassPanel>
  );
}
