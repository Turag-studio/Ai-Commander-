import { NextResponse } from "next/server";
import { getOrchestrator } from "@/lib/server/orchestrator";

export async function GET(request: Request) {
  const threshold = Number(new URL(request.url).searchParams.get("threshold") ?? 5);
  const { registry } = await getOrchestrator();
  const result = await registry.dispatch("shopify", {
    id: `shopify_inventory_${Date.now()}`,
    type: "shopify.get_inventory",
    payload: { threshold },
  });
  return NextResponse.json({ ...result.output, mocked: result.mocked, summary: result.summary });
}
