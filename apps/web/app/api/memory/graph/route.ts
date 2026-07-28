import { NextResponse } from "next/server";
import { getOrchestrator } from "@/lib/server/orchestrator";

export const dynamic = "force-dynamic";

const GRAPH_NAMESPACES = ["research", "content", "analytics", "finance", "general"];
const MAX_NODES = 28;

interface MemoryRecord {
  id: string;
  namespace: string;
  text: string;
  createdAt: string;
}

/** Aggregates recent memories across every namespace into one graph feed for the Neural Network's Memory Graph. */
export async function GET() {
  const { registry } = await getOrchestrator();

  const results = await Promise.all(
    GRAPH_NAMESPACES.map((namespace) =>
      registry.dispatch("memory", {
        id: `memory_graph_${namespace}_${Date.now()}`,
        type: "memory.list",
        payload: { namespace },
      })
    )
  );

  const records: MemoryRecord[] = results.flatMap((result) => {
    const output = result.output as { namespace: string; records: Array<{ id: string; namespace: string; text: string; createdAt: string }> };
    return output.records.map((r) => ({ id: r.id, namespace: r.namespace, text: r.text.slice(0, 140), createdAt: r.createdAt }));
  });

  records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return NextResponse.json({ memories: records.slice(0, MAX_NODES) });
}
