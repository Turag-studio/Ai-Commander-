"use client";

import { useRef, useState } from "react";
import type { MissionReport } from "@ai-commander/core";
import { PageHeader } from "@/components/page-header";
import { GlassPanel } from "@/components/glass-panel";

interface Line {
  text: string;
  kind: "input" | "output" | "error";
}

export default function TerminalPage() {
  const [lines, setLines] = useState<Line[]>([
    { text: "AI Commander OS terminal — type a mission and press enter.", kind: "output" },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function run(command: string) {
    setLines((prev) => [...prev, { text: `commander@ai-os:~$ ${command}`, kind: "input" }]);
    setBusy(true);
    try {
      const res = await fetch("/api/commander/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command }),
      });
      if (!res.ok) throw new Error("Commander failed to process the mission");
      const data = (await res.json()) as { report: MissionReport };
      const report = data.report;
      setLines((prev) => [
        ...prev,
        { text: `mission ${report.missionId} → ${report.status}`, kind: "output" },
        ...report.results.map((r) => ({ text: `  [${r.agentId}] ${r.summary}`, kind: "output" as const })),
      ]);
    } catch (err) {
      setLines((prev) => [...prev, { text: err instanceof Error ? err.message : "Unknown error", kind: "error" }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Terminal" subtitle="Direct command-line access to the AI Commander." />
      <GlassPanel
        className="flex flex-1 cursor-text flex-col overflow-y-auto font-mono text-xs"
        onClick={() => inputRef.current?.focus()}
      >
        <div className="flex-1 space-y-1">
          {lines.map((line, i) => (
            <div
              key={i}
              className={line.kind === "input" ? "text-neon-cyan" : line.kind === "error" ? "text-neon-red" : "text-white/60"}
            >
              {line.text}
            </div>
          ))}
        </div>
        <form
          className="mt-2 flex items-center gap-2 border-t border-white/10 pt-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!input.trim() || busy) return;
            run(input.trim());
            setInput("");
          }}
        >
          <span className="text-neon-cyan">❯</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={busy}
            autoFocus
            className="flex-1 bg-transparent text-white outline-none placeholder:text-white/20"
            placeholder={busy ? "processing…" : "type a command…"}
          />
        </form>
      </GlassPanel>
    </div>
  );
}
