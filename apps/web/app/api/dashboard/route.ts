import { NextResponse } from "next/server";
import { getOrchestrator } from "@/lib/server/orchestrator";

export async function GET() {
  const { registry } = await getOrchestrator();
  const [analytics, shopify] = await Promise.all([
    registry.dispatch("analytics", { id: `kpi_${Date.now()}`, type: "analytics.daily_report", payload: {} }),
    registry.dispatch("shopify", { id: `kpi_shopify_${Date.now()}`, type: "shopify.analytics", payload: {} }),
  ]);

  return NextResponse.json({
    dashboard: analytics.output,
    mocked: analytics.mocked,
    liveShopify: shopify.mocked ? null : shopify.output,
  });
}
