"use client";

import { useState } from "react";
import type { MissionReport } from "@ai-commander/core";
import { GlassPanel } from "./glass-panel";

const SUGGESTIONS = [
  "Launch a new product end-to-end",
  "Research trending products this week",
  "Generate today's business report",
  "Sync inventory with Shopify",
];

export function CommandConsole({ onMissionComplete }: { onMissionComplete?: (report: MissionReport) => void }) {
  const [command, setCommand] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastReport, setLastReport] = useState<MissionReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(value: string) {
    const trimmed = value.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/commander/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: trimmed }),
      });
      if (!res.ok) throw new Error("Commander failed to process the mission");
      const data = (await res.json()) as { report: MissionReport };
      setLastReport(data.report);
      onMissionComplete?.(data.report);
      setCommand("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <GlassPanel className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-neon-cyan text-glow">❯</span>
        <h3 className="text-sm font-semibold tracking-wide text-white">Command the AI Commander</h3>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(command);
        }}
        className="flex gap-2"
      >
        <input
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="e.g. Launch a new product end-to-end"
          className="flex-1 rounded-md border border-neon-cyan/20 bg-void-900/80 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-neon-cyan/60 focus:outline-none focus:ring-1 focus:ring-neon-cyan/40"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-md border border-neon-cyan/40 bg-neon-cyan/10 px-4 py-2 text-sm text-neon-cyan transition hover:bg-neon-cyan/20 disabled:opacity-50"
        >
          {busy ? "Processing…" : "Execute"}
        </button>
      </form>
      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => submit(s)}
            disabled={busy}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white/50 transition hover:border-neon-cyan/30 hover:text-neon-cyan disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-neon-red">{error}</p>}
      {lastReport && (
        <div className="border-t border-white/10 pt-3 text-xs text-white/60">
          <p className="mb-1 text-white/40">
            Mission <span className="text-neon-cyan">{lastReport.status}</span> · {lastReport.results.length} agents dispatched
          </p>
          <ul className="space-y-1">
            {lastReport.results.map((r) => (
              <li key={r.taskId} className="flex items-start gap-2">
                <span className={r.status === "success" ? "text-neon-green" : "text-neon-red"}>●</span>
                <span>
                  <span className="text-white/80">{r.agentId}:</span> {r.summary}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </GlassPanel>
  );
}
