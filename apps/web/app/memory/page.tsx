"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { GlassPanel } from "@/components/glass-panel";

interface MemoryResult {
  id: string;
  text: string;
  score: number;
  createdAt: string;
}

export default function MemoryPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MemoryResult[]>([]);
  const [busy, setBusy] = useState(false);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/memory/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, namespace: "general" }),
      });
      const data = (await res.json()) as { output: { results: MemoryResult[] } };
      setResults(data.output.results);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Memory"
        subtitle="Semantic recall over products, decisions, campaigns and brand guidelines — backed by the Memory Agent's vector store."
      />
      <GlassPanel className="mb-4">
        <form onSubmit={search} className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask the memory: e.g. what did we decide about pricing?"
            className="flex-1 rounded-md border border-neon-cyan/20 bg-void-900/80 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-neon-cyan/60 focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-md border border-neon-cyan/40 bg-neon-cyan/10 px-4 py-2 text-sm text-neon-cyan hover:bg-neon-cyan/20 disabled:opacity-50"
          >
            {busy ? "Searching…" : "Search"}
          </button>
        </form>
      </GlassPanel>
      {results.length === 0 && (
        <GlassPanel className="text-sm text-white/40">
          Nothing stored yet — memories are written automatically as agents complete missions, or via
          <code className="mx-1 rounded bg-white/10 px-1">memory.store</code> tasks.
        </GlassPanel>
      )}
      <div className="space-y-2">
        {results.map((r) => (
          <GlassPanel key={r.id}>
            <p className="text-sm text-white/70">{r.text}</p>
            <p className="mt-1 text-[10px] text-white/30">score {r.score.toFixed(2)} · {new Date(r.createdAt).toLocaleString()}</p>
          </GlassPanel>
        ))}
      </div>
    </div>
  );
}
