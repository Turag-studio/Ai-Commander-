import {
  BaseAgent,
  InMemoryVectorStore,
  type AgentId,
  type AgentTaskInput,
  type VectorStore,
} from "@ai-commander/core";

/**
 * The company's long-term memory: products, business decisions, past
 * campaigns, customer preferences, brand guidelines and research reports.
 * Backed by `InMemoryVectorStore` by default; pass a Qdrant/Chroma-backed
 * `VectorStore` implementation in production.
 */
export class MemoryAgent extends BaseAgent {
  readonly id: AgentId = "memory";
  readonly name = "Memory Agent";
  readonly role = "Institutional Memory";
  readonly description =
    "Stores and retrieves products, business decisions, past campaigns, customer preferences, brand guidelines and research reports.";
  readonly capabilities = [
    "Semantic search over past decisions",
    "Campaign history",
    "Brand guideline recall",
    "Customer preference storage",
    "Research report archive",
  ];

  private readonly store: VectorStore;

  constructor(store: VectorStore = new InMemoryVectorStore()) {
    super();
    this.store = store;
  }

  protected async handle(task: AgentTaskInput) {
    if (task.type === "memory.store") {
      const namespace = String(task.payload.namespace ?? "general");
      const text = String(task.payload.text ?? "");
      const record = await this.store.upsert({ namespace, text, metadata: task.payload.metadata as Record<string, unknown> ?? {} });
      return {
        summary: `Stored a new memory in namespace "${namespace}".`,
        output: { record },
        logs: [`Upserted memory ${record.id}`],
        mocked: false,
      };
    }

    const namespace = String(task.payload.namespace ?? "general");
    const query = String(task.payload.query ?? task.payload.command ?? "");
    const results = await this.store.query(namespace, query, 5);

    return {
      summary: `Found ${results.length} relevant memories for "${query}" in "${namespace}".`,
      output: { query, namespace, results },
      logs: [`Queried namespace "${namespace}" with ${results.length} results`],
      mocked: false,
    };
  }
}
