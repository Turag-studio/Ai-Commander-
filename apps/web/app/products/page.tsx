import { getOrchestrator } from "@/lib/server/orchestrator";
import { PageHeader } from "@/components/page-header";
import { GlassPanel } from "@/components/glass-panel";
import { StatCard } from "@/components/stat-card";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const { registry } = await getOrchestrator();
  const result = await registry.dispatch("shopify", {
    id: `products_${Date.now()}`,
    type: "shopify.sync_store",
    payload: {},
  });
  const output = result.output as { connected?: boolean; shop?: { name: string }; products?: number; orders?: number; lowInventory?: number };

  return (
    <div>
      <PageHeader title="Products" subtitle="Shopify catalog snapshot, managed by the Shopify Agent." />
      {result.mocked && (
        <GlassPanel className="mb-4 text-xs text-neon-amber">
          Shopify not connected — set SHOPIFY_STORE_DOMAIN and SHOPIFY_ADMIN_ACCESS_TOKEN to sync your real catalog.
        </GlassPanel>
      )}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard label="Store" value={output.shop?.name ?? "Not connected"} accent="cyan" />
        <StatCard label="Products" value={String(output.products ?? "—")} accent="purple" />
        <StatCard label="Low Inventory" value={String(output.lowInventory ?? "—")} accent="amber" />
      </div>
    </div>
  );
}
