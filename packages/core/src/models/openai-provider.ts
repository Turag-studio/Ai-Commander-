import type { GenerateOptions, GenerateResult, ModelProvider } from "./types";

/** Optional cloud fallback — only used when OPENAI_API_KEY is set and no local model is available. */
export class OpenAIProvider implements ModelProvider {
  readonly id = "openai";
  readonly displayName = "OpenAI";
  readonly isLocal = false;

  async isAvailable(): Promise<boolean> {
    return Boolean(process.env.OPENAI_API_KEY);
  }

  async generate(prompt: string, options: GenerateOptions = {}): Promise<GenerateResult> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY not configured");
    const model = options.model ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini";

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          ...(options.system ? [{ role: "system", content: options.system }] : []),
          { role: "user", content: prompt },
        ],
        ...(options.json ? { response_format: { type: "json_object" } } : {}),
        ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
      }),
    });
    if (!res.ok) throw new Error(`OpenAI error: ${res.status} ${res.statusText}`);
    const data = (await res.json()) as { choices: Array<{ message: { content: string } }> };
    return { text: data.choices[0]?.message.content ?? "", provider: this.id, model };
  }
}
