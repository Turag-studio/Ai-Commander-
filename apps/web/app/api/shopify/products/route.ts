import { NextResponse } from "next/server";
import { getOrchestrator } from "@/lib/server/orchestrator";

export async function GET() {
  const { registry } = getOrchestrator();
  const result = await registry.dispatch("shopify", {
    id: `shopify_sync_${Date.now()}`,
    type: "shopify.sync_store",
    payload: {},
  });
  return NextResponse.json({ store: result.output, mocked: result.mocked, summary: result.summary });
}
