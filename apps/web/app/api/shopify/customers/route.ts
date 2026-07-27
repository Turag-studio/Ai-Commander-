import { NextResponse } from "next/server";
import { getOrchestrator } from "@/lib/server/orchestrator";

export async function GET(request: Request) {
  const limit = Number(new URL(request.url).searchParams.get("limit") ?? 20);
  const { registry } = await getOrchestrator();
  const result = await registry.dispatch("shopify", {
    id: `shopify_customers_${Date.now()}`,
    type: "shopify.list_customers",
    payload: { limit },
  });
  return NextResponse.json({ ...result.output, mocked: result.mocked, summary: result.summary });
}
