import { getOrchestrator } from "@/lib/server/orchestrator";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { GlassPanel } from "@/components/glass-panel";

export const dynamic = "force-dynamic";

interface FinanceOutput {
  period: string;
  revenue: number;
  expenses: number;
  profit: number;
  profitMargin: number;
  gstCollected: number;
  pendingInvoices: number;
  pendingVendorPayments: number;
}

export default async function ReportsPage() {
  const { registry } = getOrchestrator();
  const result = await registry.dispatch("finance", {
    id: `reports_${Date.now()}`,
    type: "finance.monthly_report",
    payload: {},
  });
  const data = result.output as unknown as FinanceOutput;

  return (
    <div>
      <PageHeader title="Reports" subtitle={`Finance Agent — ${data.period}`} />
      <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Revenue" value={`$${data.revenue.toLocaleString()}`} accent="cyan" />
        <StatCard label="Expenses" value={`$${data.expenses.toLocaleString()}`} accent="amber" />
        <StatCard label="Profit" value={`$${data.profit.toLocaleString()}`} accent="green" />
        <StatCard label="Margin" value={`${data.profitMargin}%`} accent="purple" />
      </div>
      <GlassPanel className="text-sm text-white/60">
        <p>GST collected: <span className="text-white">${data.gstCollected.toLocaleString()}</span></p>
        <p>Pending invoices: <span className="text-white">{data.pendingInvoices}</span></p>
        <p>Pending vendor payments: <span className="text-white">{data.pendingVendorPayments}</span></p>
      </GlassPanel>
    </div>
  );
}
