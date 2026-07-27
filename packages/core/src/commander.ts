import type { AgentRegistry } from "./agent-registry";
import type { EventBus } from "./event-bus";
import type { Planner } from "./planner";
import { HeuristicPlanner } from "./planner";
import type { AgentId, AgentTaskResult, MissionReport } from "./types";

/** Agent output worth remembering long-term (research history, generated copy, business reports). */
const MEMORABLE_AGENTS: AgentId[] = ["research", "content", "analytics", "finance"];

export interface CommanderOptions {
  registry: AgentRegistry;
  eventBus: EventBus;
  planner?: Planner;
}

/**
 * The AI Commander: the CEO of the agent company. It turns a natural
 * language instruction into a mission plan, assigns each step to the right
 * specialized agent through the AgentRegistry, streams progress onto the
 * EventBus for the Mission Control dashboard, and rolls the results up
 * into a MissionReport for the human owner to review.
 */
export class Commander {
  private readonly registry: AgentRegistry;
  private readonly eventBus: EventBus;
  private readonly planner: Planner;
  private missions: MissionReport[] = [];
  private readonly maxHistory = 100;

  constructor(options: CommanderOptions) {
    this.registry = options.registry;
    this.eventBus = options.eventBus;
    this.planner = options.planner ?? new HeuristicPlanner();
  }

  async runCommand(command: string, requestedBy = "owner"): Promise<MissionReport> {
    const missionId = `mission_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const startedAt = new Date().toISOString();

    this.eventBus.info("New mission received", command, "commander");
    const plan = await this.planner.plan(command, missionId);

    const results: AgentTaskResult[] = [];
    for (const step of plan.steps) {
      this.eventBus.info(
        `Dispatching to ${step.agentId}`,
        step.description,
        step.agentId
      );
      const result = await this.registry.dispatch(step.agentId, {
        id: step.taskId,
        type: step.taskType,
        payload: { command },
        requestedBy,
        missionId,
      });
      results.push(result);

      if (result.status === "success") {
        this.eventBus.success(`${step.agentId} completed`, result.summary, step.agentId);
        await this.rememberIfNoteworthy(step.agentId, result, missionId);
      } else {
        this.eventBus.critical(`${step.agentId} failed`, result.summary, step.agentId);
      }
    }

    const status: MissionReport["status"] = results.every((r) => r.status === "success")
      ? "success"
      : results.some((r) => r.status === "success")
        ? "partial"
        : "failed";

    const report: MissionReport = {
      missionId,
      command,
      plan,
      results,
      startedAt,
      completedAt: new Date().toISOString(),
      status,
    };

    this.missions.unshift(report);
    if (this.missions.length > this.maxHistory) this.missions.pop();

    this.eventBus.publish({
      severity: status === "success" ? "success" : status === "partial" ? "warning" : "critical",
      title: "Mission complete",
      message: `"${command}" finished with status: ${status}`,
    });

    return report;
  }

  getMissionHistory(limit = 20): MissionReport[] {
    return this.missions.slice(0, limit);
  }

  /** Writes noteworthy agent output into the Memory Agent so it's searchable later (research history, generated copy, reports). */
  private async rememberIfNoteworthy(agentId: AgentId, result: AgentTaskResult, missionId: string): Promise<void> {
    if (!MEMORABLE_AGENTS.includes(agentId) || !this.registry.has("memory")) return;
    try {
      await this.registry.dispatch("memory", {
        id: `${result.taskId}_memory`,
        type: "memory.store",
        payload: {
          namespace: agentId,
          text: `${result.summary}\n\n${JSON.stringify(result.output)}`,
          metadata: { missionId, taskId: result.taskId, storedAt: new Date().toISOString() },
        },
      });
    } catch {
      // memory storage is best-effort — never let it fail a mission
    }
  }
}
