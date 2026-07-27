import { NextResponse } from "next/server";
import { getOrchestrator } from "@/lib/server/orchestrator";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const { registry, eventBus } = await getOrchestrator();
  const result = await registry.dispatch("shopify", {
    id: `shopify_publish_${Date.now()}`,
    type: "shopify.publish_product",
    payload: body,
  });
  if (result.status === "success" && !result.mocked) {
    eventBus.success("Product Published", result.summary, "shopify");
  }
  return NextResponse.json({ ...result.output, mocked: result.mocked, summary: result.summary });
}
