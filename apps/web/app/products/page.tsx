import { getOrchestrator } from "@/lib/server/orchestrator";
import { PageHeader } from "@/components/page-header";
import { GlassPanel } from "@/components/glass-panel";
import { StatCard } from "@/components/stat-card";

export const dynamic = "force-dynamic";

interface Product {
  id: string;
  title: string;
  status: string;
  inventory: number;
  price: string;
}

export default async function ProductsPage() {
  const { registry } = await getOrchestrator();
  const [storeResult, productsResult] = await Promise.all([
    registry.dispatch("shopify", { id: `products_store_${Date.now()}`, type: "shopify.sync_store", payload: {} }),
    registry.dispatch("shopify", { id: `products_list_${Date.now()}`, type: "shopify.list_products", payload: { limit: 25 } }),
  ]);
  const store = storeResult.output as { shop?: { name: string }; products?: number };
  const products = ((productsResult.output as { products?: Product[] }).products ?? []);

  return (
    <div>
      <PageHeader title="Products" subtitle="Shopify catalog, managed by the Shopify Agent." />
      {productsResult.mocked && (
        <GlassPanel className="mb-4 text-xs text-neon-amber">
          Shopify not connected — showing sample data. Connect it from the Setup Wizard to see your real catalog.
        </GlassPanel>
      )}
      <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard label="Store" value={store.shop?.name ?? "Not connected"} accent="cyan" />
        <StatCard label="Total Products" value={String(store.products ?? products.length)} accent="purple" />
        <StatCard label="Active" value={String(products.filter((p) => p.status === "ACTIVE").length)} accent="green" />
      </div>
      <GlassPanel>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs text-white/30">
              <th className="pb-2 font-normal">Product</th>
              <th className="pb-2 font-normal">Status</th>
              <th className="pb-2 font-normal">Inventory</th>
              <th className="pb-2 font-normal">Price</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-white/5">
                <td className="py-2 text-white/80">{p.title}</td>
                <td className="py-2">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] uppercase ${
                      p.status === "ACTIVE" ? "border-neon-green/40 text-neon-green" : "border-white/20 text-white/40"
                    }`}
                  >
                    {p.status}
                  </span>
                </td>
                <td className={`py-2 ${p.inventory <= 5 ? "text-neon-amber" : "text-white/50"}`}>{p.inventory}</td>
                <td className="py-2 text-white/70">${p.price}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </GlassPanel>
    </div>
  );
}
