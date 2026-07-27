import type { AgentId, MissionPlan, MissionStep } from "./types";

export interface Planner {
  plan(command: string, missionId: string): Promise<MissionPlan>;
}

interface Rule {
  match: RegExp;
  steps: Array<{ agentId: AgentId; taskType: string; description: string }>;
}

/**
 * Keyword-driven planner used until an LLM API key is configured. It covers
 * the standard "launch a product" workflow from the brief end to end so the
 * Commander is fully demonstrable with zero external dependencies. Once
 * OPENAI_API_KEY / ANTHROPIC_API_KEY is set, wire an `LLMPlanner` behind the
 * same `Planner` interface and swap it in — nothing else changes.
 */
export class HeuristicPlanner implements Planner {
  private readonly rules: Rule[] = [
    {
      match: /launch|new product|full workflow|end.to.end/i,
      steps: [
        { agentId: "research", taskType: "research.trending_products", description: "Research trending products and competitors" },
        { agentId: "content", taskType: "content.generate_listing", description: "Generate SEO listing copy" },
        { agentId: "design", taskType: "design.generate_product_images", description: "Generate product imagery" },
        { agentId: "video", taskType: "video.generate_ugc_ad", description: "Produce a UGC ad script and storyboard" },
        { agentId: "shopify", taskType: "shopify.create_product", description: "Create the Shopify listing" },
        { agentId: "marketplace", taskType: "marketplace.sync_listing", description: "Sync listing to marketplaces" },
        { agentId: "social", taskType: "social.schedule_launch_posts", description: "Schedule launch social posts" },
        { agentId: "analytics", taskType: "analytics.track_launch", description: "Set up launch performance tracking" },
      ],
    },
    {
      match: /research|competitor|trend/i,
      steps: [
        { agentId: "research", taskType: "research.trending_products", description: "Research trending products and competitors" },
      ],
    },
    {
      match: /seo|listing|description|title/i,
      steps: [
        { agentId: "content", taskType: "content.generate_listing", description: "Generate SEO listing copy" },
      ],
    },
    {
      match: /image|photo|design|banner/i,
      steps: [
        { agentId: "design", taskType: "design.generate_product_images", description: "Generate product imagery" },
      ],
    },
    {
      match: /video|ad|reel|ugc/i,
      steps: [
        { agentId: "video", taskType: "video.generate_ugc_ad", description: "Produce a UGC ad script and storyboard" },
      ],
    },
    {
      match: /shopify|inventory|order/i,
      steps: [
        { agentId: "shopify", taskType: "shopify.sync_store", description: "Sync Shopify store snapshot" },
      ],
    },
    {
      match: /amazon|flipkart|meesho|etsy|marketplace/i,
      steps: [
        { agentId: "marketplace", taskType: "marketplace.sync_listing", description: "Sync listing to marketplaces" },
      ],
    },
    {
      match: /instagram|facebook|pinterest|social|post/i,
      steps: [
        { agentId: "social", taskType: "social.schedule_launch_posts", description: "Schedule social posts" },
      ],
    },
    {
      match: /report|analytics|sales|revenue|dashboard/i,
      steps: [
        { agentId: "analytics", taskType: "analytics.daily_report", description: "Generate a business performance report" },
      ],
    },
    {
      match: /finance|gst|tax|expense|invoice/i,
      steps: [{ agentId: "finance", taskType: "finance.monthly_report", description: "Generate a finance report" }],
    },
    {
      match: /support|ticket|refund|customer/i,
      steps: [{ agentId: "support", taskType: "support.triage_tickets", description: "Triage open support tickets" }],
    },
  ];

  async plan(command: string, missionId: string): Promise<MissionPlan> {
    const matched = this.rules.find((rule) => rule.match.test(command));
    const chosenSteps = matched?.steps ?? [
      { agentId: "research" as AgentId, taskType: "research.trending_products", description: "Research context for this mission" },
      { agentId: "analytics" as AgentId, taskType: "analytics.daily_report", description: "Summarize current business status" },
    ];

    const steps: MissionStep[] = chosenSteps.map((step, index) => ({
      taskId: `${missionId}_step${index + 1}`,
      agentId: step.agentId,
      taskType: step.taskType,
      description: step.description,
    }));

    return {
      missionId,
      command,
      steps,
      createdAt: new Date().toISOString(),
    };
  }
}
