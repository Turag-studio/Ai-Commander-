import { PageHeader } from "@/components/page-header";
import { GlassPanel } from "@/components/glass-panel";

const INTEGRATIONS: Array<{ category: string; items: Array<{ label: string; envVar: string }> }> = [
  {
    category: "AI Providers",
    items: [
      { label: "OpenAI", envVar: "OPENAI_API_KEY" },
      { label: "Anthropic (Claude)", envVar: "ANTHROPIC_API_KEY" },
      { label: "Google AI (Gemini)", envVar: "GOOGLE_AI_API_KEY" },
    ],
  },
  {
    category: "Commerce",
    items: [
      { label: "Shopify", envVar: "SHOPIFY_ADMIN_ACCESS_TOKEN" },
      { label: "Amazon SP-API", envVar: "AMAZON_SP_API_CLIENT_ID" },
      { label: "Flipkart", envVar: "FLIPKART_API_KEY" },
      { label: "Meesho", envVar: "MEESHO_API_KEY" },
      { label: "Etsy", envVar: "ETSY_API_KEY" },
    ],
  },
  {
    category: "Social & Ads",
    items: [
      { label: "Meta (Instagram/Facebook)", envVar: "META_PAGE_ACCESS_TOKEN" },
      { label: "Pinterest", envVar: "PINTEREST_ACCESS_TOKEN" },
      { label: "YouTube", envVar: "YOUTUBE_API_KEY" },
      { label: "LinkedIn", envVar: "LINKEDIN_ACCESS_TOKEN" },
    ],
  },
  {
    category: "Analytics",
    items: [
      { label: "Google Analytics", envVar: "GOOGLE_ANALYTICS_PROPERTY_ID" },
      { label: "Google Ads", envVar: "GOOGLE_ADS_DEVELOPER_TOKEN" },
      { label: "Meta Ads", envVar: "META_ADS_ACCESS_TOKEN" },
    ],
  },
  {
    category: "Infrastructure",
    items: [
      { label: "Database", envVar: "DATABASE_URL" },
      { label: "Supabase", envVar: "SUPABASE_URL" },
      { label: "Redis", envVar: "REDIS_URL" },
      { label: "Qdrant", envVar: "QDRANT_URL" },
      { label: "Cloudflare R2", envVar: "CLOUDFLARE_R2_ACCOUNT_ID" },
    ],
  },
];

export const dynamic = "force-dynamic";

export default function ApiKeysPage() {
  return (
    <div>
      <PageHeader
        title="API Keys"
        subtitle="Connection status only — actual key values are never displayed. Configure via .env.local."
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {INTEGRATIONS.map((group) => (
          <GlassPanel key={group.category}>
            <h3 className="mb-3 text-sm font-semibold text-white">{group.category}</h3>
            <ul className="space-y-2">
              {group.items.map((item) => {
                const connected = Boolean(process.env[item.envVar]);
                return (
                  <li key={item.envVar} className="flex items-center justify-between text-sm">
                    <span className="text-white/60">{item.label}</span>
                    <span
                      className={`flex items-center gap-1.5 text-[10px] uppercase tracking-wider ${
                        connected ? "text-neon-green" : "text-white/30"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-neon-green" : "bg-white/20"}`} />
                      {connected ? "Connected" : "Not configured"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </GlassPanel>
        ))}
      </div>
    </div>
  );
}
