import { getOrchestrator } from "@/lib/server/orchestrator";
import { PageHeader } from "@/components/page-header";
import { GlassPanel } from "@/components/glass-panel";

export const dynamic = "force-dynamic";

interface DesignOutput {
  renderJobs: Array<{ type: string; status: string; label: string }>;
  pipeline: string[];
  exportFormats: string[];
}

export default async function MediaPage() {
  const { registry } = await getOrchestrator();
  const result = await registry.dispatch("design", {
    id: `media_${Date.now()}`,
    type: "design.generate_product_images",
    payload: { productName: "Minimalist Ceramic Mug Set" },
  });
  const data = result.output as unknown as DesignOutput;

  return (
    <div>
      <PageHeader title="Media Library" subtitle="Render jobs queued by the Design Agent." />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <GlassPanel>
          <h3 className="mb-3 text-sm font-semibold text-white">Render Queue</h3>
          <ul className="space-y-2 text-sm">
            {data.renderJobs.map((job) => (
              <li key={job.type} className="flex items-center justify-between">
                <span className="text-white/70">{job.label}</span>
                <span className="rounded-full border border-neon-cyan/30 px-2 py-0.5 text-[10px] uppercase text-neon-cyan">
                  {job.status}
                </span>
              </li>
            ))}
          </ul>
        </GlassPanel>
        <GlassPanel>
          <h3 className="mb-3 text-sm font-semibold text-white">Pipeline</h3>
          <div className="flex flex-wrap gap-2">
            {data.pipeline.map((step) => (
              <span key={step} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white/60">
                {step}
              </span>
            ))}
          </div>
          <h3 className="mb-2 mt-4 text-sm font-semibold text-white">Export Formats</h3>
          <div className="flex flex-wrap gap-2">
            {data.exportFormats.map((format) => (
              <span key={format} className="rounded-full border border-neon-purple/30 bg-neon-purple/10 px-3 py-1 text-[11px] text-neon-purple">
                {format}
              </span>
            ))}
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
