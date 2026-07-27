/**
 * Shared contracts for the AI Commander OS agent framework.
 * Every agent, the Commander, and the dashboard API layer speak these types.
 */

export type AgentStatus = "idle" | "running" | "completed" | "error";

export type AgentId =
  | "commander"
  | "research"
  | "content"
  | "design"
  | "video"
  | "shopify"
  | "marketplace"
  | "social"
  | "analytics"
  | "finance"
  | "support"
  | "memory";

export interface AgentTaskInput {
  id: string;
  /** e.g. "research.competitors", "content.generate_listing", "shopify.create_product" */
  type: string;
  payload: Record<string, unknown>;
  requestedBy?: string;
  missionId?: string;
}

export interface AgentTaskResult {
  taskId: string;
  agentId: AgentId;
  status: "success" | "failed";
  summary: string;
  output: Record<string, unknown>;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  logs: string[];
  /** true when the agent had no live credentials and returned representative mock data */
  mocked: boolean;
}

export interface AgentDescriptor {
  id: AgentId;
  name: string;
  role: string;
  description: string;
  capabilities: string[];
}

export type NotificationSeverity = "info" | "success" | "warning" | "critical";

export interface CommanderNotification {
  id: string;
  severity: NotificationSeverity;
  title: string;
  message: string;
  agentId?: AgentId;
  createdAt: string;
}

export interface MissionStep {
  taskId: string;
  agentId: AgentId;
  taskType: string;
  description: string;
}

export interface MissionPlan {
  missionId: string;
  command: string;
  steps: MissionStep[];
  createdAt: string;
}

export interface MissionReport {
  missionId: string;
  command: string;
  plan: MissionPlan;
  results: AgentTaskResult[];
  startedAt: string;
  completedAt: string;
  status: "success" | "partial" | "failed";
}
