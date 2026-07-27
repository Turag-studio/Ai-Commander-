import { getOrchestrator } from "@/lib/server/orchestrator";
import { PageHeader } from "@/components/page-header";
import { GlassPanel } from "@/components/glass-panel";

export const dynamic = "force-dynamic";

interface MarketplaceOutput {
  channels: Array<{ channel: string; connected: boolean; status: string }>;
}

export default async function MarketplacePage() {
  const { registry } = await getOrchestrator();
  const result = await registry.dispatch("marketplace", {
    id: `marketplace_${Date.now()}`,
    type: "marketplace.sync_listing",
    payload: { productName: "Minimalist Ceramic Mug Set" },
  });
  const data = result.output as unknown as MarketplaceOutput;

  return (
    <div>
      <PageHeader title="Marketplace" subtitle="Amazon, Flipkart, Meesho and Etsy sync status, managed by the Marketplace Agent." />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {data.channels.map((channel) => (
          <GlassPanel key={channel.channel} className="text-center">
            <p className="text-sm font-semibold text-white">{channel.channel}</p>
            <p className={`mt-2 text-[11px] uppercase tracking-wider ${channel.connected ? "text-neon-green" : "text-white/30"}`}>
              {channel.status.replace("_", " ")}
            </p>
          </GlassPanel>
        ))}
      </div>
    </div>
  );
}
