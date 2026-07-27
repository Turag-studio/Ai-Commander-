import type { GenerateOptions, GenerateResult, ModelProvider } from "./types";

/** Optional cloud fallback — only used when ANTHROPIC_API_KEY is set and no local model is available. */
export class AnthropicProvider implements ModelProvider {
  readonly id = "anthropic";
  readonly displayName = "Anthropic (Claude)";
  readonly isLocal = false;

  async isAvailable(): Promise<boolean> {
    return Boolean(process.env.ANTHROPIC_API_KEY);
  }

  async generate(prompt: string, options: GenerateOptions = {}): Promise<GenerateResult> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");
    const model = options.model ?? process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-latest";

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        system: options.system,
        messages: [{ role: "user", content: prompt }],
        ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
      }),
    });
    if (!res.ok) throw new Error(`Anthropic error: ${res.status} ${res.statusText}`);
    const data = (await res.json()) as { content: Array<{ type: string; text?: string }> };
    const text = data.content.find((block) => block.type === "text")?.text ?? "";
    return { text, provider: this.id, model };
  }
}
