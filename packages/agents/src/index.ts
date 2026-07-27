import { AgentRegistry, type ModelManager, type VectorStore } from "@ai-commander/core";
import { ResearchAgent } from "./research-agent";
import { ContentAgent } from "./content-agent";
import { DesignAgent } from "./design-agent";
import { VideoAgent } from "./video-agent";
import { ShopifyAgent } from "./shopify-agent";
import { MarketplaceAgent } from "./marketplace-agent";
import { SocialMediaAgent } from "./social-agent";
import { AnalyticsAgent } from "./analytics-agent";
import { FinanceAgent } from "./finance-agent";
import { SupportAgent } from "./support-agent";
import { MemoryAgent } from "./memory-agent";

export * from "./research-agent";
export * from "./content-agent";
export * from "./design-agent";
export * from "./video-agent";
export * from "./shopify-agent";
export * from "./marketplace-agent";
export * from "./social-agent";
export * from "./analytics-agent";
export * from "./finance-agent";
export * from "./support-agent";
export * from "./memory-agent";

export interface RegistryOptions {
  /** Powers model-backed generation in Content and Research agents; falls back to templates when omitted. */
  modelManager?: ModelManager;
  /** Backing store for the Memory Agent; defaults to the in-memory vector store when omitted. */
  memoryStore?: VectorStore;
}

/** Builds an AgentRegistry with every specialized agent registered — the full company roster. */
export function createDefaultRegistry(options: RegistryOptions = {}): AgentRegistry {
  const registry = new AgentRegistry();
  registry.register(new ResearchAgent(options.modelManager));
  registry.register(new ContentAgent(options.modelManager));
  registry.register(new DesignAgent());
  registry.register(new VideoAgent());
  registry.register(new ShopifyAgent());
  registry.register(new MarketplaceAgent());
  registry.register(new SocialMediaAgent());
  registry.register(new AnalyticsAgent());
  registry.register(new FinanceAgent());
  registry.register(new SupportAgent());
  registry.register(new MemoryAgent(options.memoryStore));
  return registry;
}
