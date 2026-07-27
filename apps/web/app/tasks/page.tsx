import { getOrchestrator } from "@/lib/server/orchestrator";
import { PageHeader } from "@/components/page-header";
import { GlassPanel } from "@/components/glass-panel";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const { commander } = await getOrchestrator();
  const missions = commander.getMissionHistory();

  return (
    <div>
      <PageHeader title="Tasks" subtitle="Every mission the Commander has dispatched, broken down by agent." />
      {missions.length === 0 && (
        <GlassPanel className="text-sm text-white/40">
          No missions run yet. Send a command from Mission Control to see tasks here.
        </GlassPanel>
      )}
      <div className="space-y-4">
        {missions.map((mission) => (
          <GlassPanel key={mission.missionId}>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-white">{mission.command}</p>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                  mission.status === "success"
                    ? "border-neon-green/40 text-neon-green"
                    : mission.status === "partial"
                      ? "border-neon-amber/40 text-neon-amber"
                      : "border-neon-red/40 text-neon-red"
                }`}
              >
                {mission.status}
              </span>
            </div>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-white/30">
                  <th className="pb-1 font-normal">Agent</th>
                  <th className="pb-1 font-normal">Task</th>
                  <th className="pb-1 font-normal">Summary</th>
                  <th className="pb-1 font-normal">Duration</th>
                </tr>
              </thead>
              <tbody>
                {mission.results.map((result) => (
                  <tr key={result.taskId} className="border-t border-white/5">
                    <td className="py-1.5 pr-2 text-neon-cyan">{result.agentId}</td>
                    <td className="py-1.5 pr-2 text-white/50">{result.taskId}</td>
                    <td className="py-1.5 pr-2 text-white/70">{result.summary}</td>
                    <td className="py-1.5 text-white/40">{result.durationMs}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </GlassPanel>
        ))}
      </div>
    </div>
  );
}
