import {
  Commander,
  EventBus,
  createDefaultMemoryStore,
  createDefaultModelManager,
  type ModelManager,
  type VectorStore,
} from "@ai-commander/core";
import { createDefaultRegistry } from "@ai-commander/agents";
import { loadRuntimeConfig } from "./runtime-config";

/**
 * Process-wide singleton wiring the agent registry, event bus, Commander,
 * Model Manager and memory store together. Next.js dev mode hot-reloads
 * modules, so we stash the instance (and the in-flight build promise) on
 * `globalThis` to avoid rebuilding it — and losing mission history,
 * notifications or the resolved Qdrant/Ollama availability — on every
 * request.
 */
declare global {
  // eslint-disable-next-line no-var
  var __aiCommanderOrchestrator: Orchestrator | undefined;
  // eslint-disable-next-line no-var
  var __aiCommanderOrchestratorPromise: Promise<Orchestrator> | undefined;
}

class Orchestrator {
  readonly registry: ReturnType<typeof createDefaultRegistry>;
  readonly eventBus = new EventBus();
  readonly commander: Commander;
  readonly modelManager: ModelManager;

  constructor(modelManager: ModelManager, memoryStore: VectorStore) {
    this.modelManager = modelManager;
    this.registry = createDefaultRegistry({ modelManager, memoryStore });
    this.commander = new Commander({ registry: this.registry, eventBus: this.eventBus });
    this.eventBus.success("AI Commander OS online", "All agents initialized and standing by.");
  }
}

async function buildOrchestrator(): Promise<Orchestrator> {
  await loadRuntimeConfig();
  const modelManager = createDefaultModelManager();
  const memoryStore = await createDefaultMemoryStore();
  return new Orchestrator(modelManager, memoryStore);
}

export async function getOrchestrator(): Promise<Orchestrator> {
  if (global.__aiCommanderOrchestrator) return global.__aiCommanderOrchestrator;
  if (!global.__aiCommanderOrchestratorPromise) {
    global.__aiCommanderOrchestratorPromise = buildOrchestrator().then((orchestrator) => {
      global.__aiCommanderOrchestrator = orchestrator;
      return orchestrator;
    });
  }
  return global.__aiCommanderOrchestratorPromise;
}
