import { NextResponse } from "next/server";
import { getOrchestrator } from "@/lib/server/orchestrator";

export async function GET() {
  const { registry } = getOrchestrator();
  const result = await registry.dispatch("analytics", {
    id: `kpi_${Date.now()}`,
    type: "analytics.daily_report",
    payload: {},
  });
  return NextResponse.json({ dashboard: result.output, mocked: result.mocked });
}
