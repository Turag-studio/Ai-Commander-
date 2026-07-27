import { NextResponse } from "next/server";
import { getOrchestrator } from "@/lib/server/orchestrator";

export async function GET() {
  const { eventBus } = getOrchestrator();
  return NextResponse.json({ notifications: eventBus.getHistory(50) });
}
