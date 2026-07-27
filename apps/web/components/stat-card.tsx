import { GlassPanel } from "./glass-panel";

interface StatCardProps {
  label: string;
  value: string;
  delta?: string;
  deltaPositive?: boolean;
  accent?: "cyan" | "purple" | "green" | "amber" | "red";
}

const accentText: Record<NonNullable<StatCardProps["accent"]>, string> = {
  cyan: "text-neon-cyan",
  purple: "text-neon-purple",
  green: "text-neon-green",
  amber: "text-neon-amber",
  red: "text-neon-red",
};

export function StatCard({ label, value, delta, deltaPositive = true, accent = "cyan" }: StatCardProps) {
  return (
    <GlassPanel className="flex flex-col gap-2">
      <span className="text-[11px] uppercase tracking-widest text-white/40">{label}</span>
      <span className={`text-2xl font-semibold ${accentText[accent]} text-glow`}>{value}</span>
      {delta && (
        <span className={`text-xs ${deltaPositive ? "text-neon-green" : "text-neon-red"}`}>
          {deltaPositive ? "▲" : "▼"} {delta}
        </span>
      )}
    </GlassPanel>
  );
}
