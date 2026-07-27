import { OllamaProvider } from "./models/ollama-provider";

export interface Embedder {
  embed(text: string): Promise<number[]>;
}

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Deterministic, dependency-free embedding: hashes tokens into a
 * fixed-size bag-of-words vector, L2-normalized. Used when no real
 * embedding model (e.g. Ollama's nomic-embed-text) is available, so
 * persistent memory still works without one.
 */
export class HashEmbedder implements Embedder {
  constructor(private readonly dimension = 256) {}

  async embed(text: string): Promise<number[]> {
    const vector = new Array(this.dimension).fill(0);
    const tokens = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
    for (const token of tokens) {
      vector[hashString(token) % this.dimension] += 1;
    }
    const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
    return vector.map((v) => v / norm);
  }
}

/** Wraps a local Ollama embedding model (e.g. nomic-embed-text) when installed. */
export class OllamaEmbedder implements Embedder {
  private readonly provider = new OllamaProvider();

  async embed(text: string): Promise<number[]> {
    const vector = await this.provider.embed(text);
    if (!vector || vector.length === 0) {
      throw new Error("Ollama embedding model unavailable");
    }
    return vector;
  }
}
