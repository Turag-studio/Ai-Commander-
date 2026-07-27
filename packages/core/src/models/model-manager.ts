import type { GenerateOptions, GenerateResult, ModelProvider } from "./types";
import { OllamaProvider } from "./ollama-provider";
import { OpenAIProvider } from "./openai-provider";
import { AnthropicProvider } from "./anthropic-provider";
import { GoogleProvider } from "./google-provider";

export interface ProviderStatus {
  id: string;
  displayName: string;
  isLocal: boolean;
  available: boolean;
}

const AVAILABILITY_CACHE_TTL_MS = 15000;

/**
 * Centralized AI Model Manager. Providers are tried in the order given —
 * local models (Ollama) first, cloud providers as optional fallback — and
 * the first available one handles the request. Availability is cached
 * briefly so a cold/offline Ollama instance doesn't add latency to every
 * single call.
 */
export class ModelManager {
  private readonly providers: ModelProvider[];
  private readonly availabilityCache = new Map<string, { available: boolean; checkedAt: number }>();
  private readonly usage = new Map<string, number>();

  constructor(providers: ModelProvider[]) {
    this.providers = providers;
  }

  private async checkAvailable(provider: ModelProvider): Promise<boolean> {
    const cached = this.availabilityCache.get(provider.id);
    if (cached && Date.now() - cached.checkedAt < AVAILABILITY_CACHE_TTL_MS) return cached.available;
    const available = await provider.isAvailable();
    this.availabilityCache.set(provider.id, { available, checkedAt: Date.now() });
    return available;
  }

  async pickProvider(): Promise<ModelProvider | null> {
    for (const provider of this.providers) {
      if (await this.checkAvailable(provider)) return provider;
    }
    return null;
  }

  /** Returns null (never throws) when no provider is available or generation fails — callers fall back to templates. */
  async generate(prompt: string, options?: GenerateOptions): Promise<GenerateResult | null> {
    const provider = await this.pickProvider();
    if (!provider) return null;
    try {
      const result = await provider.generate(prompt, options);
      this.recordUsage(provider.id, true);
      return result;
    } catch {
      this.recordUsage(provider.id, false);
      return null;
    }
  }

  private recordUsage(providerId: string, success: boolean) {
    const key = `${providerId}:${success ? "success" : "error"}`;
    this.usage.set(key, (this.usage.get(key) ?? 0) + 1);
  }

  getUsageStats(): Record<string, number> {
    return Object.fromEntries(this.usage);
  }

  async listProviderStatus(): Promise<ProviderStatus[]> {
    return Promise.all(
      this.providers.map(async (provider) => ({
        id: provider.id,
        displayName: provider.displayName,
        isLocal: provider.isLocal,
        available: await this.checkAvailable(provider),
      }))
    );
  }
}

/** Ollama first (free, local, private), cloud providers as optional fallback only. */
export function createDefaultModelManager(): ModelManager {
  return new ModelManager([new OllamaProvider(), new OpenAIProvider(), new AnthropicProvider(), new GoogleProvider()]);
}

export { OllamaProvider, OpenAIProvider, AnthropicProvider, GoogleProvider };
export type { GenerateOptions, GenerateResult, ModelProvider };
