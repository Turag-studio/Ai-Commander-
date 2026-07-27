import { Commander, EventBus } from "@ai-commander/core";
import { createDefaultRegistry } from "@ai-commander/agents";

/**
 * Process-wide singleton wiring the agent registry, event bus and
 * Commander together. Next.js dev mode hot-reloads modules, so we stash
 * the instance on `globalThis` to avoid rebuilding it (and losing mission
 * history / notifications) on every request.
 */
declare global {
  // eslint-disable-next-line no-var
  var __aiCommanderOrchestrator: Orchestrator | undefined;
}

class Orchestrator {
  readonly registry = createDefaultRegistry();
  readonly eventBus = new EventBus();
  readonly commander = new Commander({ registry: this.registry, eventBus: this.eventBus });

  constructor() {
    this.eventBus.success("AI Commander OS online", "All agents initialized and standing by.");
  }
}

export function getOrchestrator(): Orchestrator {
  if (!global.__aiCommanderOrchestrator) {
    global.__aiCommanderOrchestrator = new Orchestrator();
  }
  return global.__aiCommanderOrchestrator;
}
