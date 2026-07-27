import { NextResponse } from "next/server";
import { getOrchestrator } from "@/lib/server/orchestrator";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { query?: string; namespace?: string };
  const { registry } = await getOrchestrator();
  const result = await registry.dispatch("memory", {
    id: `memory_query_${Date.now()}`,
    type: "memory.query",
    payload: { query: body.query ?? "", namespace: body.namespace ?? "general" },
  });
  return NextResponse.json({ output: result.output });
}
