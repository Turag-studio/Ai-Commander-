import type { GenerateOptions, GenerateResult, ModelProvider } from "./types";

/** Optional cloud fallback — only used when GOOGLE_AI_API_KEY is set and no local model is available. */
export class GoogleProvider implements ModelProvider {
  readonly id = "google";
  readonly displayName = "Google (Gemini)";
  readonly isLocal = false;

  async isAvailable(): Promise<boolean> {
    return Boolean(process.env.GOOGLE_AI_API_KEY);
  }

  async generate(prompt: string, options: GenerateOptions = {}): Promise<GenerateResult> {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) throw new Error("GOOGLE_AI_API_KEY not configured");
    const model = options.model ?? process.env.GOOGLE_AI_MODEL ?? "gemini-1.5-flash";

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: options.system ? `${options.system}\n\n${prompt}` : prompt }] }],
          ...(options.temperature !== undefined ? { generationConfig: { temperature: options.temperature } } : {}),
        }),
      }
    );
    if (!res.ok) throw new Error(`Google AI error: ${res.status} ${res.statusText}`);
    const data = (await res.json()) as { candidates: Array<{ content: { parts: Array<{ text?: string }> } }> };
    const text = data.candidates[0]?.content.parts.map((p) => p.text ?? "").join("") ?? "";
    return { text, provider: this.id, model };
  }
}
