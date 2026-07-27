import { NextResponse } from "next/server";
import { getOrchestrator } from "@/lib/server/orchestrator";

export async function GET() {
  const { registry } = await getOrchestrator();
  const agents = registry.list().map((agent) => ({
    descriptor: agent.describe(),
    status: agent.status,
    lastSummary: agent.lastResult?.summary,
    lastRunAt: agent.lastResult?.completedAt,
    mocked: agent.lastResult?.mocked ?? true,
  }));
  return NextResponse.json({ agents });
}
