import type { AgentId } from "@ai-commander/core";

/**
 * Maps each backend agent to its display name everywhere in the dashboard
 * (Cluster Status list, Agents page, hover cards, ...) — plain functional
 * names (Research Cluster, SEO Cluster, ...) so the real purpose of each
 * agent stays legible outside the hero visualization.
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

/**
 * The evocative, cognitive-layer-style name shown on each cluster's floating
 * label inside the 3D Neural Network itself (matching the reference brief's
 * PRE-FRONTAL / HIPPOCAMPUS / MOTOR CORTEX label set) — a skin over the same
 * agent, not a rename. Hovering a cluster still reveals its real function
 * via CORTEX_LABEL.
 */
export const CORTEX_REGION_LABEL: Record<AgentId, string> = {
  commander: "Commander Core",
  research: "Concept Layer",
  content: "Language",
  design: "Feature Layer",
  video: "Motor Cortex",
  shopify: "Brainstem",
  marketplace: "Association",
  social: "Prefrontal",
  analytics: "Predictive",
  finance: "Reasoning",
  support: "Hippocampus",
  memory: "Memory",
};

/**
 * Neural color palette — each cluster gets one signature hue (never a
 * rainbow gradient). Muted jewel tones rather than pure saturated neon,
 * matching the reference footage's dim, glass-like filament colors — the
 * brightness comes from bloom on the geometry, not from oversaturated hex
 * values fighting the bloom for attention.
 */
export const NEURAL_PALETTE = {
  blue: "#5ea8ff",
  cyan: "#5fd6dd",
  purple: "#a37bf0",
  pink: "#e05fa8",
  green: "#6fdb95",
  yellow: "#e0c85f",
  orange: "#e0975f",
  red: "#e0625f",
} as const;

export const CORTEX_COLOR: Record<AgentId, string> = {
  commander: NEURAL_PALETTE.cyan,
  research: NEURAL_PALETTE.yellow, // Concept Layer
  content: NEURAL_PALETTE.orange, // Language
  design: NEURAL_PALETTE.blue, // Feature Layer
  video: NEURAL_PALETTE.red, // Motor Cortex
  shopify: NEURAL_PALETTE.orange, // Brainstem
  marketplace: NEURAL_PALETTE.red, // Association
  social: NEURAL_PALETTE.blue, // Prefrontal
  analytics: NEURAL_PALETTE.purple, // Predictive
  finance: NEURAL_PALETTE.pink, // Reasoning
  support: NEURAL_PALETTE.green, // Hippocampus
  memory: NEURAL_PALETTE.cyan, // Memory
};
