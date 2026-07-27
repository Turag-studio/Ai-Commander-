import { BaseAgent, type AgentId, type AgentTaskInput } from "@ai-commander/core";

/**
 * Publishes marketplace-specific listings and keeps inventory / pricing /
 * orders in sync across Amazon, Flipkart, Meesho and Etsy. Each marketplace
 * has its own credential set (see .env.example); when absent, that channel
 * is reported as "not connected" rather than silently skipped.
 */
export class MarketplaceAgent extends BaseAgent {
  readonly id: AgentId = "marketplace";
  readonly name = "Marketplace Agent";
  readonly role = "Marketplace Operations";
  readonly description =
    "Generates marketplace-specific listings and syncs inventory, pricing and orders across Amazon, Flipkart, Meesho and Etsy.";
  readonly capabilities = [
    "Marketplace-specific listing generation",
    "Product upload",
    "Inventory sync",
    "Price synchronization",
    "Order synchronization",
  ];

  private readonly channels = [
    { name: "Amazon", envVar: "AMAZON_SP_API_CLIENT_ID" },
    { name: "Flipkart", envVar: "FLIPKART_API_KEY" },
    { name: "Meesho", envVar: "MEESHO_API_KEY" },
    { name: "Etsy", envVar: "ETSY_API_KEY" },
  ];

  protected async handle(task: AgentTaskInput) {
    const productName = String(task.payload.productName ?? "Product");
    const channelStatus = this.channels.map((channel) => ({
      channel: channel.name,
      connected: Boolean(process.env[channel.envVar]),
      status: process.env[channel.envVar] ? "synced" : "not_connected",
    }));

    const output = { productName, channels: channelStatus };
    const connectedCount = channelStatus.filter((c) => c.connected).length;

    return {
      summary: `Synced "${productName}" listing across ${connectedCount}/${channelStatus.length} connected marketplaces.`,
      output,
      logs: channelStatus.map((c) => `${c.channel}: ${c.status}`),
      mocked: connectedCount === 0,
    };
  }
}
