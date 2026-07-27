import { NextResponse } from "next/server";
import { getOrchestrator } from "@/lib/server/orchestrator";

export async function GET(request: Request) {
  const namespace = new URL(request.url).searchParams.get("namespace") ?? "general";
  const { registry } = await getOrchestrator();
  const result = await registry.dispatch("memory", {
    id: `memory_list_${Date.now()}`,
    type: "memory.list",
    payload: { namespace },
  });
  return NextResponse.json({ output: result.output });
}
