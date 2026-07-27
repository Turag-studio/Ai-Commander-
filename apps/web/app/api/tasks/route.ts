import { NextResponse } from "next/server";
import { getOrchestrator } from "@/lib/server/orchestrator";

export async function GET() {
  const { commander } = await getOrchestrator();
  const missions = commander.getMissionHistory();
  const tasks = missions.flatMap((mission) =>
    mission.results.map((result) => ({
      ...result,
      command: mission.command,
      missionId: mission.missionId,
    }))
  );
  return NextResponse.json({ tasks });
}
