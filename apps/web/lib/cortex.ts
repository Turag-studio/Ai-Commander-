import type { AgentId } from "@ai-commander/core";

/**
 * Maps each backend agent to its display name in the Neural Network
 * visualization — plain functional names (Research Cluster, SEO Cluster,
 * ...), not anatomical brain regions.
 */
export const CORTEX_LABEL: Record<AgentId, string> = {
  commander: "Commander Core",
  research: "Research Cluster",
  content: "SEO Cluster",
  design: "Design Cluster",
  video: "Video Cluster",
  shopify: "Shopify Cluster",
  marketplace: "Marketplace Cluster",
  social: "Marketing Cluster",
  analytics: "Analytics Cluster",
  finance: "Finance Cluster",
  support: "Support Cluster",
  memory: "Memory Cluster",
};

/** Neural color palette — each cluster gets a signature hue so the network reads as distinct functional areas, not one uniform glow. */
export const NEURAL_PALETTE = {
  blue: "#00d4ff",
  cyan: "#00ffff",
  purple: "#8a2be2",
  pink: "#ff00a6",
  green: "#00ff9d",
  yellow: "#ffd700",
} as const;

export const CORTEX_COLOR: Record<AgentId, string> = {
  commander: NEURAL_PALETTE.cyan,
  research: NEURAL_PALETTE.blue,
  content: NEURAL_PALETTE.cyan,
  design: NEURAL_PALETTE.purple,
  video: NEURAL_PALETTE.green,
  shopify: NEURAL_PALETTE.yellow,
  marketplace: NEURAL_PALETTE.pink,
  social: NEURAL_PALETTE.blue,
  analytics: NEURAL_PALETTE.cyan,
  finance: NEURAL_PALETTE.purple,
  support: NEURAL_PALETTE.green,
  memory: NEURAL_PALETTE.yellow,
};
