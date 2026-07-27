import { getOrchestrator } from "@/lib/server/orchestrator";
import { PageHeader } from "@/components/page-header";
import { GlassPanel } from "@/components/glass-panel";

export const dynamic = "force-dynamic";

interface SocialSchedule {
  schedule: Array<{ platform: string; caption: string; scheduledFor: string; status: string }>;
}

export default async function MarketingPage() {
  const { registry } = getOrchestrator();
  const result = await registry.dispatch("social", {
    id: `marketing_${Date.now()}`,
    type: "social.schedule_launch_posts",
    payload: { productName: "Minimalist Ceramic Mug Set" },
  });
  const data = result.output as unknown as SocialSchedule;

  return (
    <div>
      <PageHeader title="Marketing" subtitle="Content scheduled by the Social Media Agent across every platform." />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.schedule.map((post) => (
          <GlassPanel key={post.platform}>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-neon-cyan">{post.platform}</span>
              <span className="rounded-full border border-neon-amber/40 px-2 py-0.5 text-[10px] uppercase text-neon-amber">
                {post.status}
              </span>
            </div>
            <p className="text-xs text-white/60">{post.caption}</p>
            <p className="mt-2 text-[10px] text-white/30">Scheduled: {new Date(post.scheduledFor).toLocaleString()}</p>
          </GlassPanel>
        ))}
      </div>
    </div>
  );
}
