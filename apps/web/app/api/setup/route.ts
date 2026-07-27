import { NextResponse } from "next/server";
import { getConfigStatus, saveRuntimeConfig, type RuntimeConfig } from "@/lib/server/runtime-config";
import { getOrchestrator } from "@/lib/server/orchestrator";

export async function GET() {
  return NextResponse.json({ status: getConfigStatus() });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as RuntimeConfig;

  // Only persist non-empty values so re-submitting the form doesn't blank out fields left untouched.
  const partial: RuntimeConfig = {};
  for (const [key, value] of Object.entries(body)) {
    if (typeof value === "string" && value.trim()) partial[key as keyof RuntimeConfig] = value.trim();
  }

  await saveRuntimeConfig(partial);

  const { registry, eventBus } = await getOrchestrator();
  let shopifyTest: { connected: boolean; summary: string } | null = null;

  if (partial.shopifyStoreDomain || partial.shopifyAdminAccessToken) {
    const result = await registry.dispatch("shopify", {
      id: `setup_test_${Date.now()}`,
      type: "shopify.sync_store",
      payload: {},
    });
    shopifyTest = { connected: !result.mocked, summary: result.summary };
    if (!result.mocked) eventBus.success("Setup complete", "Shopify connected successfully.");
  }

  return NextResponse.json({ status: getConfigStatus(), shopifyTest });
}
