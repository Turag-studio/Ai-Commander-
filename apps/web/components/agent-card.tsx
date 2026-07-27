import type { AgentDescriptor, AgentStatus } from "@ai-commander/core";
import { GlassPanel } from "./glass-panel";

const statusStyles: Record<AgentStatus, string> = {
  idle: "text-white/40 border-white/10",
  running: "text-neon-cyan border-neon-cyan/40 shadow-glow",
  completed: "text-neon-green border-neon-green/40 shadow-glow-green",
  error: "text-neon-red border-neon-red/40 shadow-glow-red",
};

interface AgentCardProps {
  agent: AgentDescriptor;
  status?: AgentStatus;
  lastSummary?: string;
}

export function AgentCard({ agent, status = "idle", lastSummary }: AgentCardProps) {
  return (
    <GlassPanel className="flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">{agent.name}</h3>
          <p className="text-[11px] uppercase tracking-widest text-neon-cyan/60">{agent.role}</p>
        </div>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${statusStyles[status]}`}>
          {status}
        </span>
      </div>
      <p className="text-xs text-white/50 leading-relaxed">{agent.description}</p>
      <div className="flex flex-wrap gap-1.5">
        {agent.capabilities.slice(0, 4).map((cap) => (
          <span key={cap} className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/50">
            {cap}
          </span>
        ))}
        {agent.capabilities.length > 4 && (
          <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/40">
            +{agent.capabilities.length - 4} more
          </span>
        )}
      </div>
      {lastSummary && (
        <p className="border-t border-white/10 pt-2 text-[11px] text-white/40 italic">&ldquo;{lastSummary}&rdquo;</p>
      )}
    </GlassPanel>
  );
}
