import type { AgentId } from "@ai-commander/core";

/** Maps each backend agent to its "brain region" identity for the Neural Brain visualization. */
export const CORTEX_LABEL: Record<AgentId, string> = {
  commander: "Commander Core",
  research: "Research Cortex",
  content: "SEO Cortex",
  design: "Creative Cortex",
  video: "Motion Cortex",
  shopify: "Commerce Cortex",
  marketplace: "Marketplace Cortex",
  social: "Marketing Cortex",
  analytics: "Analytics Cortex",
  finance: "Finance Cortex",
  support: "Support Cortex",
  memory: "Memory Cortex",
};
