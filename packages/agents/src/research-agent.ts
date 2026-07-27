import { BaseAgent, type AgentId, type AgentTaskInput } from "@ai-commander/core";

/**
 * Discovers trending products, analyzes competitors across Amazon, Flipkart,
 * Meesho, Etsy, Pinterest and Instagram, and produces pricing/demand
 * recommendations. Real integrations (marketplace scraping APIs, Google
 * Trends, social listening) plug into `handle` behind the same output shape.
 */
export class ResearchAgent extends BaseAgent {
  readonly id: AgentId = "research";
  readonly name = "Research Agent";
  readonly role = "Market Intelligence";
  readonly description =
    "Analyzes competitors and marketplaces, discovers trending products, and estimates demand and pricing.";
  readonly capabilities = [
    "Competitor analysis",
    "Trending product discovery",
    "Amazon / Flipkart / Meesho / Etsy analysis",
    "Pinterest & Instagram trend analysis",
    "Keyword research",
    "Pricing suggestions",
    "Demand estimation",
    "Seasonal trend prediction",
  ];

  protected async handle(task: AgentTaskInput) {
    const query = String(task.payload.command ?? task.payload.query ?? "general ecommerce");

    const keywords = deriveKeywords(query);
    const output = {
      query,
      trendingProducts: [
        { name: "Minimalist ceramic mug set", demandScore: 87, trend: "rising" },
        { name: "Bamboo desk organizer", demandScore: 74, trend: "stable" },
        { name: "Personalized pet portrait print", demandScore: 91, trend: "rising" },
      ],
      competitorComparison: [
        { marketplace: "Amazon", avgPrice: 24.99, avgRating: 4.3, listingCount: 1240 },
        { marketplace: "Etsy", avgPrice: 29.5, avgRating: 4.7, listingCount: 860 },
        { marketplace: "Flipkart", avgPrice: 1899, avgRating: 4.1, listingCount: 540 },
        { marketplace: "Meesho", avgPrice: 499, avgRating: 3.9, listingCount: 2100 },
      ],
      keywordList: keywords,
      pricingRecommendation: {
        suggestedPrice: 27.99,
        currency: "USD",
        rationale: "Positioned between Amazon and Etsy averages to stay competitive while signalling quality.",
      },
      demandEstimate: { monthlyUnits: 1450, confidence: "medium" },
      seasonalTrend: "Demand typically rises 35% in Q4 (Oct-Dec) ahead of the holiday season.",
    };

    return {
      summary: `Found ${output.trendingProducts.length} trending products and compared ${output.competitorComparison.length} marketplaces for "${query}".`,
      output,
      logs: [
        `Scanned marketplaces for query: ${query}`,
        "Compiled competitor pricing matrix",
        "Estimated demand and seasonality",
      ],
      mocked: true,
    };
  }
}

function deriveKeywords(query: string): string[] {
  const base = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((word) => word.length > 2);
  const unique = Array.from(new Set(base));
  const suffixes = ["best", "near me", "for gift", "handmade", "custom", "sale"];
  return unique.length
    ? unique.flatMap((word) => suffixes.slice(0, 2).map((suffix) => `${word} ${suffix}`)).slice(0, 8)
    : ["trending gifts 2026", "best handmade decor", "custom home accessories"];
}
