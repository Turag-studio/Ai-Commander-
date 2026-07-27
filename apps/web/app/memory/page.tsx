"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { GlassPanel } from "@/components/glass-panel";

interface MemoryRecord {
  id: string;
  text: string;
  score?: number;
  createdAt: string;
}

const NAMESPACES = [
  { value: "general", label: "General" },
  { value: "research", label: "Research history" },
  { value: "content", label: "Generated content" },
  { value: "analytics", label: "Analytics reports" },
  { value: "finance", label: "Finance reports" },
];

export default function MemoryPage() {
  const [query, setQuery] = useState("");
  const [namespace, setNamespace] = useState("general");
  const [results, setResults] = useState<MemoryRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"idle" | "search" | "browse">("idle");

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMode("search");
    try {
      const res = await fetch("/api/memory/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, namespace }),
      });
      const data = (await res.json()) as { output: { results: MemoryRecord[] } };
      setResults(data.output.results);
    } finally {
      setBusy(false);
    }
  }

  async function browse(ns: string) {
    setNamespace(ns);
    setBusy(true);
    setMode("browse");
    try {
      const res = await fetch(`/api/memory/list?namespace=${encodeURIComponent(ns)}`, { cache: "no-store" });
      const data = (await res.json()) as { output: { records: MemoryRecord[] } };
      setResults(data.output.records);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Memory"
        subtitle="Semantic recall over products, decisions, campaigns and brand guidelines — backed by the Memory Agent's vector store (Qdrant when configured, in-memory otherwise)."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {NAMESPACES.map((ns) => (
          <button
            key={ns.value}
            onClick={() => browse(ns.value)}
            className={`rounded-full border px-3 py-1 text-[11px] transition ${
              mode === "browse" && namespace === ns.value
                ? "border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan"
                : "border-white/10 bg-white/5 text-white/50 hover:text-white"
            }`}
          >
            {ns.label}
          </button>
        ))}
      </div>

      <GlassPanel className="mb-4">
        <form onSubmit={search} className="flex gap-2">
          <select
            value={namespace}
            onChange={(e) => setNamespace(e.target.value)}
            className="rounded-md border border-neon-cyan/20 bg-void-900/80 px-2 py-2 text-sm text-white focus:border-neon-cyan/60 focus:outline-none"
          >
            {NAMESPACES.map((ns) => (
              <option key={ns.value} value={ns.value}>
                {ns.label}
              </option>
            ))}
          </select>
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

      {mode === "idle" && (
        <GlassPanel className="text-sm text-white/40">
          Nothing loaded yet — pick a category above to browse stored memories, or search a namespace. Research,
          content and report memories are written automatically whenever a mission completes.
        </GlassPanel>
      )}
      {mode !== "idle" && !busy && results.length === 0 && (
        <GlassPanel className="text-sm text-white/40">No memories in &ldquo;{namespace}&rdquo; yet.</GlassPanel>
      )}

      <div className="space-y-2">
        {results.map((r) => (
          <GlassPanel key={r.id}>
            <p className="whitespace-pre-line text-sm text-white/70">{r.text}</p>
            <p className="mt-1 text-[10px] text-white/30">
              {r.score !== undefined && <>score {r.score.toFixed(2)} · </>}
              {new Date(r.createdAt).toLocaleString()}
            </p>
          </GlassPanel>
        ))}
      </div>
    </div>
  );
}
