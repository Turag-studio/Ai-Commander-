import { randomUUID } from "node:crypto";
import type { MemoryQueryResult, MemoryRecord, VectorStore } from "./memory-store";
import { HashEmbedder, OllamaEmbedder, type Embedder } from "./embedder";

interface QdrantConfig {
  url: string;
  apiKey?: string;
  collection: string;
}

function readConfig(): QdrantConfig | null {
  const url = process.env.QDRANT_URL;
  if (!url) return null;
  return {
    url: url.replace(/\/$/, ""),
    apiKey: process.env.QDRANT_API_KEY,
    collection: process.env.QDRANT_COLLECTION ?? "ai_commander_memory",
  };
}

/**
 * Persistent, production-grade memory backing the Memory Agent when
 * QDRANT_URL is configured — implements the exact same VectorStore
 * interface as InMemoryVectorStore, so nothing else in the system needs
 * to know which one it's talking to. Embeddings come from a local Ollama
 * embedding model when available (probed once, cached for the process
 * lifetime), falling back to a deterministic hash embedding otherwise —
 * either way, semantic search keeps working with zero paid dependencies.
 */
export class QdrantVectorStore implements VectorStore {
  private readonly config: QdrantConfig;
  private embedder: Embedder | null = null;
  private collectionReady: Promise<void> | null = null;

  constructor(config?: QdrantConfig) {
    const resolved = config ?? readConfig();
    if (!resolved) throw new Error("QDRANT_URL is not configured");
    this.config = resolved;
  }

  static isConfigured(): boolean {
    return Boolean(process.env.QDRANT_URL);
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (this.config.apiKey) headers["api-key"] = this.config.apiKey;
    return headers;
  }

  private async resolveEmbedder(): Promise<Embedder> {
    if (this.embedder) return this.embedder;
    const ollama = new OllamaEmbedder();
    try {
      await ollama.embed("ai commander os warmup");
      this.embedder = ollama;
    } catch {
      this.embedder = new HashEmbedder(256);
    }
    return this.embedder;
  }

  private async ensureCollection(dimension: number): Promise<void> {
    if (!this.collectionReady) {
      this.collectionReady = (async () => {
        const existing = await fetch(`${this.config.url}/collections/${this.config.collection}`, {
          headers: this.headers(),
        });
        if (existing.ok) return;
        await fetch(`${this.config.url}/collections/${this.config.collection}`, {
          method: "PUT",
          headers: this.headers(),
          body: JSON.stringify({ vectors: { size: dimension, distance: "Cosine" } }),
        });
      })();
    }
    return this.collectionReady;
  }

  private async embed(text: string): Promise<number[]> {
    const embedder = await this.resolveEmbedder();
    const vector = await embedder.embed(text);
    await this.ensureCollection(vector.length);
    return vector;
  }

  async upsert(record: Omit<MemoryRecord, "id" | "createdAt"> & { id?: string }): Promise<MemoryRecord> {
    const id = record.id ?? randomUUID();
    const vector = await this.embed(record.text);
    const full: MemoryRecord = {
      id,
      namespace: record.namespace,
      text: record.text,
      metadata: record.metadata,
      createdAt: new Date().toISOString(),
    };

    await fetch(`${this.config.url}/collections/${this.config.collection}/points`, {
      method: "PUT",
      headers: this.headers(),
      body: JSON.stringify({ points: [{ id, vector, payload: full }] }),
    });

    return full;
  }

  async query(namespace: string, text: string, topK = 5): Promise<MemoryQueryResult[]> {
    const vector = await this.embed(text);
    const res = await fetch(`${this.config.url}/collections/${this.config.collection}/points/search`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        vector,
        limit: topK,
        filter: { must: [{ key: "namespace", match: { value: namespace } }] },
        with_payload: true,
      }),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { result: Array<{ score: number; payload: MemoryRecord }> };
    return data.result.map((r) => ({ ...r.payload, score: r.score }));
  }

  async list(namespace: string): Promise<MemoryRecord[]> {
    const res = await fetch(`${this.config.url}/collections/${this.config.collection}/points/scroll`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        filter: { must: [{ key: "namespace", match: { value: namespace } }] },
        limit: 200,
        with_payload: true,
      }),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { result: { points: Array<{ payload: MemoryRecord }> } };
    return data.result.points.map((p) => p.payload);
  }

  async delete(id: string): Promise<void> {
    await fetch(`${this.config.url}/collections/${this.config.collection}/points/delete`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ points: [id] }),
    });
  }
}

/** Picks Qdrant when configured, else the zero-dependency in-memory store — used by the orchestrator to wire the Memory Agent. */
export async function createDefaultMemoryStore(): Promise<VectorStore> {
  if (QdrantVectorStore.isConfigured()) {
    try {
      const store = new QdrantVectorStore();
      // Touch the API once so a misconfigured/unreachable Qdrant falls back immediately instead of failing on first real request.
      const config = readConfig();
      if (config) {
        const res = await fetch(`${config.url}/collections`, {
          headers: config.apiKey ? { "api-key": config.apiKey } : undefined,
        });
        if (res.ok) return store;
      }
    } catch {
      // fall through to in-memory
    }
  }
  const { InMemoryVectorStore } = await import("./memory-store");
  return new InMemoryVectorStore();
}
