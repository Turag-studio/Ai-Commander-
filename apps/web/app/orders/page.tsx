import { getOrchestrator } from "@/lib/server/orchestrator";
import { PageHeader } from "@/components/page-header";
import { GlassPanel } from "@/components/glass-panel";

export const dynamic = "force-dynamic";

interface Order {
  id: string;
  name: string;
  total: string;
  status: string;
  financialStatus: string;
  customer: string;
  createdAt: string;
}

export default async function OrdersPage() {
  const { registry } = await getOrchestrator();
  const result = await registry.dispatch("shopify", { id: `orders_${Date.now()}`, type: "shopify.list_orders", payload: { limit: 30 } });
  const orders = (result.output as { orders?: Order[] }).orders ?? [];

  return (
    <div>
      <PageHeader title="Orders" subtitle="Live order feed from the Shopify Agent." />
      {result.mocked && (
        <GlassPanel className="mb-4 text-xs text-neon-amber">
          Shopify not connected — showing sample data. Connect it from the Setup Wizard to see real orders.
        </GlassPanel>
      )}
      <GlassPanel>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs text-white/30">
              <th className="pb-2 font-normal">Order</th>
              <th className="pb-2 font-normal">Customer</th>
              <th className="pb-2 font-normal">Total</th>
              <th className="pb-2 font-normal">Payment</th>
              <th className="pb-2 font-normal">Fulfillment</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-t border-white/5">
                <td className="py-2 text-neon-cyan">{order.name}</td>
                <td className="py-2 text-white/70">{order.customer}</td>
                <td className="py-2 text-white/70">${order.total}</td>
                <td className="py-2 text-white/50">{order.financialStatus}</td>
                <td className="py-2 text-white/50">{order.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </GlassPanel>
    </div>
  );
}
