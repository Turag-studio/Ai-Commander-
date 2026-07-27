import type { AgentId } from "@ai-commander/core";

/**
 * Maps each backend agent to an anatomical brain region for the Neural
 * Brain visualization, per the reference brief (Research → Frontal Lobe,
 * SEO/Content → Language Area, Shopify → Motor Cortex, Memory →
 * Hippocampus, ...).
 */
export const CORTEX_LABEL: Record<AgentId, string> = {
  commander: "Brainstem — Commander Core",
  research: "Frontal Lobe",
  content: "Language Area",
  design: "Parietal Area",
  video: "Temporal Area",
  shopify: "Motor Cortex",
  marketplace: "Basal Ganglia",
  social: "Limbic Area",
  analytics: "Occipital Cortex",
  finance: "Insular Cortex",
  support: "Cerebellum",
  memory: "Hippocampus",
};

/** Neural color palette — each region gets a signature hue so the brain reads as distinct functional areas, not one uniform glow. */
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
