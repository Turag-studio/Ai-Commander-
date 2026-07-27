import { getOrchestrator } from "@/lib/server/orchestrator";
import { PageHeader } from "@/components/page-header";
import { GlassPanel } from "@/components/glass-panel";

export const dynamic = "force-dynamic";

const severityColor: Record<string, string> = {
  info: "border-neon-cyan/40 text-neon-cyan",
  success: "border-neon-green/40 text-neon-green",
  warning: "border-neon-amber/40 text-neon-amber",
  critical: "border-neon-red/40 text-neon-red",
};

export default function NotificationsPage() {
  const { eventBus } = getOrchestrator();
  const notifications = eventBus.getHistory(100);

  return (
    <div>
      <PageHeader title="Notifications" subtitle="Full activity feed from every AI agent." />
      <div className="space-y-2">
        {notifications.map((n) => (
          <GlassPanel key={n.id} className={`border-l-2 py-3 ${severityColor[n.severity]}`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white">{n.title}</span>
              <span className="text-[10px] text-white/30">{new Date(n.createdAt).toLocaleString()}</span>
            </div>
            <p className="mt-1 text-xs text-white/50">{n.message}</p>
            {n.agentId && <p className="mt-1 text-[10px] uppercase tracking-widest text-white/30">via {n.agentId}</p>}
          </GlassPanel>
        ))}
      </div>
    </div>
  );
}
