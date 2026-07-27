import { PageHeader } from "@/components/page-header";
import { GlassPanel } from "@/components/glass-panel";

const SAMPLE_ORDERS = [
  { id: "#1042", customer: "A. Sharma", total: "$56.20", status: "Fulfilled", city: "Mumbai" },
  { id: "#1043", customer: "J. Doe", total: "$134.00", status: "Processing", city: "New York" },
  { id: "#1044", customer: "R. Patel", total: "$27.99", status: "Shipped", city: "London" },
  { id: "#1045", customer: "S. Kumar", total: "$89.50", status: "Fulfilled", city: "Ahmedabad" },
];

export default function OrdersPage() {
  return (
    <div>
      <PageHeader title="Orders" subtitle="Connect Shopify to replace this sample feed with live orders." />
      <GlassPanel>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs text-white/30">
              <th className="pb-2 font-normal">Order</th>
              <th className="pb-2 font-normal">Customer</th>
              <th className="pb-2 font-normal">City</th>
              <th className="pb-2 font-normal">Total</th>
              <th className="pb-2 font-normal">Status</th>
            </tr>
          </thead>
          <tbody>
            {SAMPLE_ORDERS.map((order) => (
              <tr key={order.id} className="border-t border-white/5">
                <td className="py-2 text-neon-cyan">{order.id}</td>
                <td className="py-2 text-white/70">{order.customer}</td>
                <td className="py-2 text-white/50">{order.city}</td>
                <td className="py-2 text-white/70">{order.total}</td>
                <td className="py-2 text-white/50">{order.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </GlassPanel>
    </div>
  );
}
