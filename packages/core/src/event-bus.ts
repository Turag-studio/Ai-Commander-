import type { CommanderNotification, NotificationSeverity } from "./types";

type Listener = (notification: CommanderNotification) => void;

/**
 * In-process pub/sub used to drive the "live notifications" feed on the
 * Mission Control dashboard. Swap for Redis pub/sub or a websocket relay
 * once the system runs across multiple processes.
 */
export class EventBus {
  private listeners = new Set<Listener>();
  private history: CommanderNotification[] = [];
  private readonly maxHistory = 200;

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  publish(
    notification: Omit<CommanderNotification, "id" | "createdAt">
  ): CommanderNotification {
    const full: CommanderNotification = {
      ...notification,
      id: `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
    };
    this.history.unshift(full);
    if (this.history.length > this.maxHistory) this.history.pop();
    for (const listener of this.listeners) listener(full);
    return full;
  }

  info(title: string, message: string, agentId?: CommanderNotification["agentId"]) {
    return this.publish({ severity: "info" as NotificationSeverity, title, message, agentId });
  }

  success(title: string, message: string, agentId?: CommanderNotification["agentId"]) {
    return this.publish({ severity: "success" as NotificationSeverity, title, message, agentId });
  }

  warning(title: string, message: string, agentId?: CommanderNotification["agentId"]) {
    return this.publish({ severity: "warning" as NotificationSeverity, title, message, agentId });
  }

  critical(title: string, message: string, agentId?: CommanderNotification["agentId"]) {
    return this.publish({ severity: "critical" as NotificationSeverity, title, message, agentId });
  }

  getHistory(limit = 50): CommanderNotification[] {
    return this.history.slice(0, limit);
  }
}
