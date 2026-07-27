import { NextResponse } from "next/server";
import { getOrchestrator } from "@/lib/server/orchestrator";

export async function GET() {
  const { registry } = await getOrchestrator();
  const result = await registry.dispatch("shopify", {
    id: `shopify_analytics_${Date.now()}`,
    type: "shopify.analytics",
    payload: {},
  });
  return NextResponse.json({ ...result.output, mocked: result.mocked, summary: result.summary });
}
