"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-neon-cyan/10 bg-void-950/80 backdrop-blur-xl">
      <div className="px-5 py-6 border-b border-neon-cyan/10">
        <div className="flex items-center gap-2">
          <span className="text-2xl text-neon-cyan text-glow">◈</span>
          <div>
            <p className="text-sm font-semibold tracking-widest text-neon-cyan text-glow">AI COMMANDER</p>
            <p className="text-[10px] tracking-[0.3em] text-white/40">OPERATING SYSTEM</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all ${
                active
                  ? "bg-neon-cyan/10 text-neon-cyan shadow-glow border border-neon-cyan/30"
                  : "text-white/60 border border-transparent hover:bg-white/5 hover:text-white"
              }`}
            >
              <span className={`w-4 text-center ${active ? "text-neon-cyan" : "text-white/30 group-hover:text-white/60"}`}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-neon-cyan/10 text-[10px] text-white/30 tracking-widest">
        SYSTEM ONLINE · v0.1.0
      </div>
    </aside>
  );
}
