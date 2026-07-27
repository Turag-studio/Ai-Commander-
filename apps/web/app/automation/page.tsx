import { PageHeader } from "@/components/page-header";
import { GlassPanel } from "@/components/glass-panel";

const AUTOMATIONS = [
  { cadence: "Every morning", task: "Research trending products", agent: "Research Agent" },
  { cadence: "Every hour", task: "Monitor competitors", agent: "Research Agent" },
  { cadence: "Every 30 minutes", task: "Check inventory", agent: "Shopify Agent" },
  { cadence: "Every day", task: "Generate marketing content", agent: "Social Media Agent" },
  { cadence: "Every week", task: "Create business report", agent: "Analytics Agent" },
  { cadence: "Every month", task: "Optimize SEO", agent: "Content Agent" },
];

export default function AutomationPage() {
  return (
    <div>
      <PageHeader
        title="Automation"
        subtitle="Recurring missions the Commander runs on a schedule. Wire these to a cron/n8n trigger calling POST /api/commander/command."
      />
      <div className="space-y-2">
        {AUTOMATIONS.map((item) => (
          <GlassPanel key={item.task} className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white">{item.task}</p>
              <p className="text-[11px] text-white/40">{item.agent}</p>
            </div>
            <span className="rounded-full border border-neon-purple/40 bg-neon-purple/10 px-3 py-1 text-[11px] text-neon-purple">
              {item.cadence}
            </span>
          </GlassPanel>
        ))}
      </div>
    </div>
  );
}
