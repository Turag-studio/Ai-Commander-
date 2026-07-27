import { NextResponse } from "next/server";
import { getOrchestrator } from "@/lib/server/orchestrator";

export async function POST() {
  const { registry } = await getOrchestrator();
  const result = await registry.dispatch("shopify", {
    id: `shopify_webhooks_${Date.now()}`,
    type: "shopify.register_webhooks",
    payload: {},
  });
  return NextResponse.json({ ...result.output, mocked: result.mocked, summary: result.summary });
}
