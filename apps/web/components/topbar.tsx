"use client";

import { useEffect, useState } from "react";

type DispatchState = "idle" | "sending" | "sent" | "error";

export function Topbar() {
  const [time, setTime] = useState<string>("");
  const [command, setCommand] = useState("");
  const [state, setState] = useState<DispatchState>("idle");

  useEffect(() => {
    const update = () => setTime(new Date().toUTCString().slice(17, 25));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = command.trim();
    if (!trimmed || state === "sending") return;
    setState("sending");
    try {
      const res = await fetch("/api/commander/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: trimmed }),
      });
      setState(res.ok ? "sent" : "error");
      setCommand("");
    } catch {
      setState("error");
    } finally {
      setTimeout(() => setState("idle"), 2000);
    }
  }

  return (
    <header className="flex items-center justify-between gap-4 border-b border-neon-cyan/10 bg-void-950/60 backdrop-blur-xl px-6 py-3">
      <div className="flex shrink-0 items-center gap-2 text-xs text-white/50 tracking-wider">
        <span className="h-2 w-2 rounded-full bg-neon-green shadow-glow-green animate-pulse-glow" />
        ALL SYSTEMS OPERATIONAL
      </div>

      <form onSubmit={submit} className="mx-auto flex w-full max-w-md items-center">
        <input
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="Ask AI Commander anything…"
          className="w-full rounded-full border border-neon-cyan/15 bg-white/5 px-4 py-1.5 text-xs text-white placeholder:text-white/30 focus:border-neon-cyan/50 focus:outline-none"
        />
        {state !== "idle" && (
          <span
            className={`ml-2 shrink-0 text-[10px] uppercase tracking-widest ${
              state === "sending" ? "text-white/40" : state === "sent" ? "text-neon-green" : "text-neon-red"
            }`}
          >
            {state === "sending" ? "…" : state === "sent" ? "Dispatched ✓" : "Failed"}
          </span>
        )}
      </form>

      <div className="flex shrink-0 items-center gap-6 text-xs text-white/40 font-mono">
        <span>{time} UTC</span>
        <span className="text-neon-cyan/70">OWNER: TURAG STUDIO</span>
      </div>
    </header>
  );
}
