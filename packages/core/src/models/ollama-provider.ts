import type { GenerateOptions, GenerateResult, ModelProvider } from "./types";
import { fetchWithTimeout } from "./fetch-with-timeout";

/**
 * Local model tags to prefer, in order, when no explicit model is
 * requested — covers every model family called out in the brief
 * (DeepSeek, Qwen, Llama, Gemma, Phi, Mistral). The manager picks the
 * first one actually installed in the local Ollama instance.
 */
export const PREFERRED_LOCAL_MODELS = ["llama3.2", "qwen2.5", "deepseek-r1", "mistral", "gemma2", "phi3"];

/** Talks to a local Ollama instance — the default, zero-cost model provider. */
export class OllamaProvider implements ModelProvider {
  readonly id = "ollama";
  readonly displayName = "Ollama (local)";
  readonly isLocal = true;

  private get baseUrl(): string {
    return process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
  }

  private get defaultModel(): string {
    return process.env.OLLAMA_DEFAULT_MODEL ?? "llama3.2";
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetchWithTimeout(`${this.baseUrl}/api/tags`, {}, 1500);
      return res.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const res = await fetchWithTimeout(`${this.baseUrl}/api/tags`, {}, 1500);
      if (!res.ok) return [];
      const data = (await res.json()) as { models?: Array<{ name: string }> };
      return (data.models ?? []).map((m) => m.name);
    } catch {
      return [];
    }
  }

  /** Best installed model for a general task: explicit choice, else the first preferred tag that's pulled, else the configured default. */
  async pickBestModel(): Promise<string> {
    const installed = await this.listModels();
    if (installed.length === 0) return this.defaultModel;
    for (const preferred of [this.defaultModel, ...PREFERRED_LOCAL_MODELS]) {
      const match = installed.find((name) => name === preferred || name.startsWith(`${preferred}:`));
      if (match) return match;
    }
    return installed[0];
  }

  async generate(prompt: string, options: GenerateOptions = {}): Promise<GenerateResult> {
    const model = options.model ?? (await this.pickBestModel());
    const res = await fetch(`${this.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt: options.system ? `${options.system}\n\n${prompt}` : prompt,
        stream: false,
        format: options.json ? "json" : undefined,
        options: options.temperature !== undefined ? { temperature: options.temperature } : undefined,
      }),
    });
    if (!res.ok) throw new Error(`Ollama error: ${res.status} ${res.statusText}`);
    const data = (await res.json()) as { response: string };
    return { text: data.response, provider: this.id, model };
  }

  /** Embedding vector for the Memory Agent's Qdrant store, when installed (e.g. nomic-embed-text). */
  async embed(text: string): Promise<number[] | null> {
    const model = process.env.OLLAMA_EMBEDDING_MODEL ?? "nomic-embed-text";
    try {
      const res = await fetchWithTimeout(
        `${this.baseUrl}/api/embeddings`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model, prompt: text }),
        },
        5000
      );
      if (!res.ok) return null;
      const data = (await res.json()) as { embedding?: number[] };
      return data.embedding ?? null;
    } catch {
      return null;
    }
  }
}
