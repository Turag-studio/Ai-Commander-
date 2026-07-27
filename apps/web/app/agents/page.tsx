"use client";

import { useEffect, useState } from "react";
import type { AgentDescriptor, AgentStatus } from "@ai-commander/core";
import { PageHeader } from "@/components/page-header";
import { AgentCard } from "@/components/agent-card";

interface AgentState {
  descriptor: AgentDescriptor;
  status: AgentStatus;
  lastSummary?: string;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentState[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      const res = await fetch("/api/agents", { cache: "no-store" });
      if (!res.ok || cancelled) return;
      const data = (await res.json()) as { agents: AgentState[] };
      if (!cancelled) setAgents(data.agents);
    }
    poll();
    const interval = setInterval(poll, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div>
      <PageHeader title="AI Agents" subtitle="The company roster. Every specialist reporting to the AI Commander." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {agents.map((agent) => (
          <AgentCard key={agent.descriptor.id} agent={agent.descriptor} status={agent.status} lastSummary={agent.lastSummary} />
        ))}
      </div>
    </div>
  );
}
