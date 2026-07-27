import { getOrchestrator } from "@/lib/server/orchestrator";
import { PageHeader } from "@/components/page-header";
import { GlassPanel } from "@/components/glass-panel";
import { StatCard } from "@/components/stat-card";

export const dynamic = "force-dynamic";

interface AnalyticsOutput {
  today: { revenue: number; orders: number; visitors: number };
  weekly: { revenue: number; orders: number };
  monthly: { revenue: number; orders: number };
  roas: number;
  conversionRate: number;
  aov: number;
  cartAbandonment: number;
  topProducts: Array<{ name: string; revenue: number }>;
  inventoryAlerts: Array<{ product: string; stock: number; status: string }>;
}

export default async function AnalyticsPage() {
  const { registry } = getOrchestrator();
  const result = await registry.dispatch("analytics", {
    id: `analytics_${Date.now()}`,
    type: "analytics.daily_report",
    payload: {},
  });
  const data = result.output as unknown as AnalyticsOutput;

  return (
    <div>
      <PageHeader title="Analytics" subtitle="Business performance, compiled by the Analytics Agent." />
      <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Today's Revenue" value={`$${data.today.revenue.toFixed(2)}`} accent="cyan" />
        <StatCard label="ROAS" value={`${data.roas}x`} accent="green" />
        <StatCard label="Conversion Rate" value={`${data.conversionRate}%`} accent="purple" />
        <StatCard label="AOV" value={`$${data.aov}`} accent="amber" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GlassPanel>
          <h3 className="mb-3 text-sm font-semibold text-white">Top Products</h3>
          <ul className="space-y-2 text-sm">
            {data.topProducts.map((p) => (
              <li key={p.name} className="flex justify-between text-white/70">
                <span>{p.name}</span>
                <span className="text-neon-cyan">${p.revenue.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </GlassPanel>
        <GlassPanel>
          <h3 className="mb-3 text-sm font-semibold text-white">Inventory Alerts</h3>
          <ul className="space-y-2 text-sm">
            {data.inventoryAlerts.map((a) => (
              <li key={a.product} className="flex justify-between text-white/70">
                <span>{a.product}</span>
                <span className={a.status === "out_of_stock" ? "text-neon-red" : "text-neon-amber"}>
                  {a.stock} left
                </span>
              </li>
            ))}
          </ul>
        </GlassPanel>
      </div>
    </div>
  );
}
