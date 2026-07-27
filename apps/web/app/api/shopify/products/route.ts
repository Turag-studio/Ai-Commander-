import { NextResponse } from "next/server";
import { getOrchestrator } from "@/lib/server/orchestrator";

export async function GET(request: Request) {
  const limit = Number(new URL(request.url).searchParams.get("limit") ?? 20);
  const { registry } = await getOrchestrator();
  const result = await registry.dispatch("shopify", {
    id: `shopify_products_${Date.now()}`,
    type: "shopify.list_products",
    payload: { limit },
  });
  return NextResponse.json({ ...result.output, mocked: result.mocked, summary: result.summary });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const { registry, eventBus } = await getOrchestrator();
  const result = await registry.dispatch("shopify", {
    id: `shopify_create_${Date.now()}`,
    type: "shopify.create_product",
    payload: body,
  });
  if (result.status === "success" && !result.mocked) {
    eventBus.success("Product Created", result.summary, "shopify");
  }
  return NextResponse.json({ ...result.output, mocked: result.mocked, summary: result.summary });
}

export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const { registry, eventBus } = await getOrchestrator();
  const result = await registry.dispatch("shopify", {
    id: `shopify_update_${Date.now()}`,
    type: "shopify.update_product",
    payload: body,
  });
  if (result.status === "success" && !result.mocked) {
    eventBus.info("Product Updated", result.summary, "shopify");
  }
  return NextResponse.json({ ...result.output, mocked: result.mocked, summary: result.summary });
}
