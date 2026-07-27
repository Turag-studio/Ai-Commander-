import { PageHeader } from "@/components/page-header";
import { GlassPanel } from "@/components/glass-panel";

export default function SettingsPage() {
  return (
    <div>
      <PageHeader title="Settings" subtitle="System configuration and approval workflow." />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <GlassPanel>
          <h3 className="mb-3 text-sm font-semibold text-white">Approval Workflow</h3>
          <label className="flex items-center justify-between py-2 text-sm text-white/60">
            Require approval before publishing to Shopify
            <input type="checkbox" defaultChecked className="accent-neon-cyan" />
          </label>
          <label className="flex items-center justify-between py-2 text-sm text-white/60">
            Require approval before publishing to marketplaces
            <input type="checkbox" defaultChecked className="accent-neon-cyan" />
          </label>
          <label className="flex items-center justify-between py-2 text-sm text-white/60">
            Require approval before social posts go live
            <input type="checkbox" defaultChecked className="accent-neon-cyan" />
          </label>
          <label className="flex items-center justify-between py-2 text-sm text-white/60">
            Require approval before ad spend changes
            <input type="checkbox" defaultChecked className="accent-neon-cyan" />
          </label>
        </GlassPanel>
        <GlassPanel>
          <h3 className="mb-3 text-sm font-semibold text-white">Security</h3>
          <ul className="space-y-2 text-sm text-white/60">
            <li>✓ Role-based permissions</li>
            <li>✓ Encrypted API keys at rest</li>
            <li>✓ Audit logs on every agent action</li>
            <li>✓ Rate limiting on external API calls</li>
            <li>✓ Automatic backups</li>
          </ul>
        </GlassPanel>
      </div>
    </div>
  );
}
