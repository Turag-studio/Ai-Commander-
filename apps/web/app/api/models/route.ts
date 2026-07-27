import { NextResponse } from "next/server";
import { getOrchestrator } from "@/lib/server/orchestrator";

export async function GET() {
  const { modelManager } = await getOrchestrator();
  const providers = await modelManager.listProviderStatus();
  const usage = modelManager.getUsageStats();
  return NextResponse.json({ providers, usage });
}
