/**
 * Abstraction over the vector memory layer. `InMemoryVectorStore` is a
 * dependency-free default so the system boots with no external services;
 * swap in a Qdrant/Chroma-backed implementation of the same interface for
 * production without touching callers (Memory Agent, Commander context).
 */
export interface MemoryRecord {
  id: string;
  namespace: string;
  text: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface MemoryQueryResult extends MemoryRecord {
  score: number;
}

export interface VectorStore {
  upsert(record: Omit<MemoryRecord, "id" | "createdAt"> & { id?: string }): Promise<MemoryRecord>;
  query(namespace: string, text: string, topK?: number): Promise<MemoryQueryResult[]>;
  list(namespace: string): Promise<MemoryRecord[]>;
  delete(id: string): Promise<void>;
}

/** Naive bag-of-words vectorization + cosine similarity — good enough for a local dev default. */
function toVector(text: string): Map<string, number> {
  const vector = new Map<string, number>();
  const tokens = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  for (const token of tokens) {
    vector.set(token, (vector.get(token) ?? 0) + 1);
  }
  return vector;
}

function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (const value of a.values()) magA += value * value;
  for (const value of b.values()) magB += value * value;
  for (const [token, value] of a) {
    const other = b.get(token);
    if (other) dot += value * other;
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

export class InMemoryVectorStore implements VectorStore {
  private records = new Map<string, MemoryRecord>();

  async upsert(
    record: Omit<MemoryRecord, "id" | "createdAt"> & { id?: string }
  ): Promise<MemoryRecord> {
    const id = record.id ?? `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const full: MemoryRecord = {
      id,
      namespace: record.namespace,
      text: record.text,
      metadata: record.metadata,
      createdAt: new Date().toISOString(),
    };
    this.records.set(id, full);
    return full;
  }

  async query(namespace: string, text: string, topK = 5): Promise<MemoryQueryResult[]> {
    const queryVector = toVector(text);
    return Array.from(this.records.values())
      .filter((record) => record.namespace === namespace)
      .map((record) => ({ ...record, score: cosineSimilarity(queryVector, toVector(record.text)) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  async list(namespace: string): Promise<MemoryRecord[]> {
    return Array.from(this.records.values()).filter((record) => record.namespace === namespace);
  }

  async delete(id: string): Promise<void> {
    this.records.delete(id);
  }
}
