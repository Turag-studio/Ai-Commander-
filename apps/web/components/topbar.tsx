"use client";

import { useEffect, useState } from "react";

export function Topbar() {
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    const update = () => setTime(new Date().toUTCString().slice(17, 25));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="flex items-center justify-between border-b border-neon-cyan/10 bg-void-950/60 backdrop-blur-xl px-6 py-3">
      <div className="flex items-center gap-2 text-xs text-white/50 tracking-wider">
        <span className="h-2 w-2 rounded-full bg-neon-green shadow-glow-green animate-pulse-glow" />
        ALL SYSTEMS OPERATIONAL
      </div>
      <div className="flex items-center gap-6 text-xs text-white/40 font-mono">
        <span>{time} UTC</span>
        <span className="text-neon-cyan/70">OWNER: TURAG STUDIO</span>
      </div>
    </header>
  );
}
