import { NextResponse } from "next/server";
import { getOrchestrator } from "@/lib/server/orchestrator";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { command?: string };
  const command = body.command?.trim();

  if (!command) {
    return NextResponse.json({ error: "A command is required" }, { status: 400 });
  }

  const { commander } = await getOrchestrator();
  const report = await commander.runCommand(command);
  return NextResponse.json({ report });
}

export async function GET() {
  const { commander } = await getOrchestrator();
  return NextResponse.json({ missions: commander.getMissionHistory() });
}
