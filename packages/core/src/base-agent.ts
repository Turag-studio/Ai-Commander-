import type { AgentDescriptor, AgentId, AgentStatus, AgentTaskInput, AgentTaskResult } from "./types";

/**
 * Contract every specialized agent implements. The Commander only ever
 * talks to agents through this interface, so new agents can be added
 * without touching the orchestrator, the registry, or the dashboard.
 */
export abstract class BaseAgent {
  abstract readonly id: AgentId;
  abstract readonly name: string;
  abstract readonly role: string;
  abstract readonly description: string;
  abstract readonly capabilities: string[];

  status: AgentStatus = "idle";
  lastResult: AgentTaskResult | null = null;

  describe(): AgentDescriptor {
    return {
      id: this.id,
      name: this.name,
      role: this.role,
      description: this.description,
      capabilities: this.capabilities,
    };
  }

  /** Subclasses implement the actual work for a task type. */
  protected abstract handle(task: AgentTaskInput): Promise<{
    summary: string;
    output: Record<string, unknown>;
    logs: string[];
    mocked: boolean;
  }>;

  async execute(task: AgentTaskInput): Promise<AgentTaskResult> {
    const startedAt = new Date().toISOString();
    const startedMs = Date.now();
    this.status = "running";

    try {
      const { summary, output, logs, mocked } = await this.handle(task);
      const completedAt = new Date().toISOString();
      const result: AgentTaskResult = {
        taskId: task.id,
        agentId: this.id,
        status: "success",
        summary,
        output,
        startedAt,
        completedAt,
        durationMs: Date.now() - startedMs,
        logs,
        mocked,
      };
      this.status = "completed";
      this.lastResult = result;
      return result;
    } catch (error) {
      const completedAt = new Date().toISOString();
      const result: AgentTaskResult = {
        taskId: task.id,
        agentId: this.id,
        status: "failed",
        summary: error instanceof Error ? error.message : "Unknown agent error",
        output: {},
        startedAt,
        completedAt,
        durationMs: Date.now() - startedMs,
        logs: [error instanceof Error ? error.stack ?? error.message : String(error)],
        mocked: false,
      };
      this.status = "error";
      this.lastResult = result;
      return result;
    }
  }
}
