import type { BaseAgent } from "./base-agent";
import type { AgentDescriptor, AgentId, AgentTaskInput, AgentTaskResult } from "./types";

/**
 * Central directory of every agent in the company. The Commander dispatches
 * work through the registry instead of holding direct references, so
 * agents can be registered, replaced, or hot-swapped independently.
 */
export class AgentRegistry {
  private agents = new Map<AgentId, BaseAgent>();

  register(agent: BaseAgent): void {
    this.agents.set(agent.id, agent);
  }

  get(agentId: AgentId): BaseAgent {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`No agent registered for id "${agentId}"`);
    }
    return agent;
  }

  has(agentId: AgentId): boolean {
    return this.agents.has(agentId);
  }

  list(): BaseAgent[] {
    return Array.from(this.agents.values());
  }

  describeAll(): AgentDescriptor[] {
    return this.list().map((agent) => agent.describe());
  }

  async dispatch(agentId: AgentId, task: AgentTaskInput): Promise<AgentTaskResult> {
    return this.get(agentId).execute(task);
  }
}
