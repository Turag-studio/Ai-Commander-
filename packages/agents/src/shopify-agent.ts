import { BaseAgent, type AgentId, type AgentTaskInput } from "@ai-commander/core";

interface ShopifyCredentials {
  domain: string;
  accessToken: string;
  apiVersion: string;
}

function getCredentials(): ShopifyCredentials | null {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const accessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  if (!domain || !accessToken) return null;
  return { domain, accessToken, apiVersion: process.env.SHOPIFY_API_VERSION ?? "2024-10" };
}

async function shopifyGraphQL<T>(
  creds: ShopifyCredentials,
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const response = await fetch(`https://${creds.domain}/admin/api/${creds.apiVersion}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": creds.accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
  }

  const json = (await response.json()) as { data: T; errors?: Array<{ message: string }> };
  if (json.errors?.length) {
    throw new Error(`Shopify API error: ${json.errors.map((e) => e.message).join(", ")}`);
  }
  return json.data;
}

interface HandlerResult {
  summary: string;
  output: Record<string, unknown>;
}

/**
 * Runs `live` against the Shopify Admin API when credentials are configured,
 * falling back to `mock` (labeled `mocked: true`) when they're missing or
 * the API call fails, so every task type degrades gracefully instead of
 * throwing through to the Commander.
 */
async function withShopify(
  mock: () => HandlerResult,
  live: (creds: ShopifyCredentials) => Promise<HandlerResult>
): Promise<{ summary: string; output: Record<string, unknown>; logs: string[]; mocked: boolean }> {
  const creds = getCredentials();
  if (!creds) {
    const { summary, output } = mock();
    return {
      summary,
      output,
      logs: ["SHOPIFY_STORE_DOMAIN / SHOPIFY_ADMIN_ACCESS_TOKEN not configured — returning sample data"],
      mocked: true,
    };
  }

  try {
    const { summary, output } = await live(creds);
    return { summary, output, logs: ["Shopify Admin API call succeeded"], mocked: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const { summary, output } = mock();
    return {
      summary: `${summary} (live call failed: ${message})`,
      output: { ...output, error: message },
      logs: [`Shopify Admin API error: ${message}`],
      mocked: true,
    };
  }
}

/**
 * Manages products, collections, inventory, pricing, orders, customers,
 * publishing and webhooks through the Shopify Admin API. Falls back to
 * representative mock data whenever SHOPIFY_STORE_DOMAIN /
 * SHOPIFY_ADMIN_ACCESS_TOKEN are not configured, so the dashboard always
 * has something meaningful to render.
 */
export class ShopifyAgent extends BaseAgent {
  readonly id: AgentId = "shopify";
  readonly name = "Shopify Agent";
  readonly role = "Store Operations";
  readonly description =
    "Manages products, collections, inventory, pricing, orders, customers, publishing and webhooks through the Shopify Admin API.";
  readonly capabilities = [
    "Live products, orders & customers",
    "Inventory & low-stock monitoring",
    "Collections management",
    "Product creation, update & publishing",
    "Draft product workflow",
    "Live revenue analytics",
    "Webhook registration & ingestion",
  ];

  protected async handle(task: AgentTaskInput) {
    switch (task.type) {
      case "shopify.list_products":
        return this.listProducts(task);
      case "shopify.list_orders":
        return this.listOrders(task);
      case "shopify.list_customers":
        return this.listCustomers(task);
      case "shopify.list_collections":
        return this.listCollections(task);
      case "shopify.get_inventory":
        return this.getInventory(task);
      case "shopify.create_product":
        return this.createProduct(task);
      case "shopify.update_product":
        return this.updateProduct(task);
      case "shopify.publish_product":
        return this.publishProduct(task);
      case "shopify.analytics":
        return this.analytics(task);
      case "shopify.register_webhooks":
        return this.registerWebhooks(task);
      case "shopify.sync_store":
      default:
        return this.syncStore(task);
    }
  }

  private async syncStore(_task: AgentTaskInput) {
    return withShopify(
      () => ({
        summary: "Shopify not connected — showing sample store snapshot.",
        output: { connected: false, shop: null, products: 128, orders: 34, lowInventory: 6 },
      }),
      async (creds) => {
        const data = await shopifyGraphQL<{
          shop: { name: string; myshopifyDomain: string; currencyCode: string; plan: { displayName: string } };
          productsCount: { count: number };
        }>(
          creds,
          `query {
             shop { name myshopifyDomain currencyCode plan { displayName } }
             productsCount { count }
           }`
        );
        return {
          summary: `Connected to Shopify store "${data.shop.name}" (${data.productsCount.count} products).`,
          output: { connected: true, shop: data.shop, products: data.productsCount.count },
        };
      }
    );
  }

  private async listProducts(task: AgentTaskInput) {
    const limit = Number(task.payload.limit ?? 20);
    return withShopify(
      () => ({
        summary: `Sample catalog of ${limit} products (Shopify not connected).`,
        output: {
          products: [
            { id: "gid://mock/1", title: "Minimalist Ceramic Mug Set", status: "ACTIVE", inventory: 42, price: "27.99" },
            { id: "gid://mock/2", title: "Bamboo Desk Organizer", status: "ACTIVE", inventory: 4, price: "34.50" },
            { id: "gid://mock/3", title: "Personalized Pet Portrait Print", status: "DRAFT", inventory: 0, price: "45.00" },
          ],
        },
      }),
      async (creds) => {
        const data = await shopifyGraphQL<{
          products: { nodes: Array<{ id: string; title: string; status: string; totalInventory: number; priceRangeV2: { minVariantPrice: { amount: string } } }> };
        }>(
          creds,
          `query Products($first: Int!) {
             products(first: $first, sortKey: UPDATED_AT, reverse: true) {
               nodes { id title status totalInventory priceRangeV2 { minVariantPrice { amount } } }
             }
           }`,
          { first: limit }
        );
        const products = data.products.nodes.map((p) => ({
          id: p.id,
          title: p.title,
          status: p.status,
          inventory: p.totalInventory,
          price: p.priceRangeV2.minVariantPrice.amount,
        }));
        return { summary: `Fetched ${products.length} live products from Shopify.`, output: { products } };
      }
    );
  }

  private async listOrders(task: AgentTaskInput) {
    const limit = Number(task.payload.limit ?? 20);
    return withShopify(
      () => ({
        summary: `Sample order feed (Shopify not connected).`,
        output: {
          orders: [
            { id: "gid://mock/o1", name: "#1042", total: "56.20", status: "FULFILLED", customer: "A. Sharma" },
            { id: "gid://mock/o2", name: "#1043", total: "134.00", status: "UNFULFILLED", customer: "J. Doe" },
          ],
        },
      }),
      async (creds) => {
        const data = await shopifyGraphQL<{
          orders: {
            nodes: Array<{
              id: string;
              name: string;
              displayFinancialStatus: string;
              displayFulfillmentStatus: string;
              totalPriceSet: { shopMoney: { amount: string } };
              customer: { displayName: string } | null;
              createdAt: string;
            }>;
          };
        }>(
          creds,
          `query Orders($first: Int!) {
             orders(first: $first, sortKey: CREATED_AT, reverse: true) {
               nodes {
                 id name displayFinancialStatus displayFulfillmentStatus createdAt
                 totalPriceSet { shopMoney { amount } }
                 customer { displayName }
               }
             }
           }`,
          { first: limit }
        );
        const orders = data.orders.nodes.map((o) => ({
          id: o.id,
          name: o.name,
          total: o.totalPriceSet.shopMoney.amount,
          status: o.displayFulfillmentStatus,
          financialStatus: o.displayFinancialStatus,
          customer: o.customer?.displayName ?? "Guest",
          createdAt: o.createdAt,
        }));
        return { summary: `Fetched ${orders.length} live orders from Shopify.`, output: { orders } };
      }
    );
  }

  private async listCustomers(task: AgentTaskInput) {
    const limit = Number(task.payload.limit ?? 20);
    return withShopify(
      () => ({
        summary: "Sample customer list (Shopify not connected).",
        output: {
          customers: [
            { id: "gid://mock/c1", name: "A. Sharma", email: "a.sharma@example.com", orders: 4, spent: "312.40" },
            { id: "gid://mock/c2", name: "J. Doe", email: "j.doe@example.com", orders: 1, spent: "134.00" },
          ],
        },
      }),
      async (creds) => {
        const data = await shopifyGraphQL<{
          customers: {
            nodes: Array<{ id: string; displayName: string; email: string | null; numberOfOrders: string; amountSpent: { amount: string } }>;
          };
        }>(
          creds,
          `query Customers($first: Int!) {
             customers(first: $first, sortKey: CREATED_AT, reverse: true) {
               nodes { id displayName email numberOfOrders amountSpent { amount } }
             }
           }`,
          { first: limit }
        );
        const customers = data.customers.nodes.map((c) => ({
          id: c.id,
          name: c.displayName,
          email: c.email,
          orders: Number(c.numberOfOrders),
          spent: c.amountSpent.amount,
        }));
        return { summary: `Fetched ${customers.length} live customers from Shopify.`, output: { customers } };
      }
    );
  }

  private async listCollections(task: AgentTaskInput) {
    const limit = Number(task.payload.limit ?? 20);
    return withShopify(
      () => ({
        summary: "Sample collections (Shopify not connected).",
        output: { collections: [{ id: "gid://mock/col1", title: "New Arrivals", productsCount: 12 }] },
      }),
      async (creds) => {
        const data = await shopifyGraphQL<{
          collections: { nodes: Array<{ id: string; title: string; productsCount: { count: number } }> };
        }>(
          creds,
          `query Collections($first: Int!) {
             collections(first: $first) { nodes { id title productsCount { count } } }
           }`,
          { first: limit }
        );
        const collections = data.collections.nodes.map((c) => ({ id: c.id, title: c.title, productsCount: c.productsCount.count }));
        return { summary: `Fetched ${collections.length} live collections from Shopify.`, output: { collections } };
      }
    );
  }

  private async getInventory(task: AgentTaskInput) {
    const threshold = Number(task.payload.threshold ?? 5);
    return withShopify(
      () => ({
        summary: "Sample low-inventory alerts (Shopify not connected).",
        output: {
          lowStock: [
            { sku: "MUG-BLUE", product: "Ceramic Mug Set (blue)", quantity: 0 },
            { sku: "DESK-ORG-01", product: "Bamboo Desk Organizer", quantity: 4 },
          ],
        },
      }),
      async (creds) => {
        const data = await shopifyGraphQL<{
          productVariants: {
            nodes: Array<{ sku: string | null; inventoryQuantity: number; product: { title: string } }>;
          };
        }>(
          creds,
          `query LowStock($query: String!) {
             productVariants(first: 25, query: $query) {
               nodes { sku inventoryQuantity product { title } }
             }
           }`,
          { query: `inventory_quantity:<=${threshold}` }
        );
        const lowStock = data.productVariants.nodes.map((v) => ({
          sku: v.sku ?? "—",
          product: v.product.title,
          quantity: v.inventoryQuantity,
        }));
        return { summary: `${lowStock.length} variants at or below ${threshold} units.`, output: { lowStock, threshold } };
      }
    );
  }

  private async createProduct(task: AgentTaskInput) {
    const productName = String(task.payload.productName ?? "New Product");
    const descriptionHtml = String(task.payload.descriptionHtml ?? "");
    const price = task.payload.price ? Number(task.payload.price) : undefined;
    const tags = Array.isArray(task.payload.tags) ? (task.payload.tags as string[]) : [];
    const publish = Boolean(task.payload.publish);

    return withShopify(
      () => ({
        summary: `Mock-created Shopify product draft "${productName}" (connect Shopify to go live).`,
        output: { productName, status: "draft", id: `mock_${Date.now()}` },
      }),
      async (creds) => {
        const created = await shopifyGraphQL<{
          productCreate: { product: { id: string; title: string; status: string } | null; userErrors: Array<{ message: string }> };
        }>(
          creds,
          `mutation ProductCreate($input: ProductInput!) {
             productCreate(input: $input) { product { id title status } userErrors { message } }
           }`,
          { input: { title: productName, descriptionHtml, tags, status: publish ? "ACTIVE" : "DRAFT" } }
        );
        if (created.productCreate.userErrors.length) {
          throw new Error(created.productCreate.userErrors.map((e) => e.message).join(", "));
        }
        const product = created.productCreate.product;

        if (price && product) {
          try {
            const variants = await shopifyGraphQL<{ product: { variants: { nodes: Array<{ id: string }> } } }>(
              creds,
              `query DefaultVariant($id: ID!) { product(id: $id) { variants(first: 1) { nodes { id } } } }`,
              { id: product.id }
            );
            const variantId = variants.product.variants.nodes[0]?.id;
            if (variantId) {
              await shopifyGraphQL(
                creds,
                `mutation SetPrice($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
                   productVariantsBulkUpdate(productId: $productId, variants: $variants) { userErrors { message } }
                 }`,
                { productId: product.id, variants: [{ id: variantId, price: price.toFixed(2) }] }
              );
            }
          } catch {
            // price set failed — product still created as a draft, non-fatal
          }
        }

        return {
          summary: `Created Shopify product "${productName}"${publish ? " and published it" : " as a draft"}.`,
          output: { product },
        };
      }
    );
  }

  private async updateProduct(task: AgentTaskInput) {
    const id = String(task.payload.id ?? "");
    const productName = String(task.payload.productName ?? "Updated Product");

    return withShopify(
      () => ({ summary: `Mock-updated product "${productName}" (connect Shopify to go live).`, output: { id, productName } }),
      async (creds) => {
        if (!id) throw new Error("Missing Shopify product id");
        const input: Record<string, unknown> = { id };
        if (task.payload.productName) input.title = productName;
        if (task.payload.descriptionHtml) input.descriptionHtml = task.payload.descriptionHtml;
        if (task.payload.tags) input.tags = task.payload.tags;

        const data = await shopifyGraphQL<{
          productUpdate: { product: { id: string; title: string } | null; userErrors: Array<{ message: string }> };
        }>(
          creds,
          `mutation ProductUpdate($input: ProductInput!) {
             productUpdate(input: $input) { product { id title } userErrors { message } }
           }`,
          { input }
        );
        if (data.productUpdate.userErrors.length) {
          throw new Error(data.productUpdate.userErrors.map((e) => e.message).join(", "));
        }
        return { summary: `Updated Shopify product "${data.productUpdate.product?.title}".`, output: { product: data.productUpdate.product } };
      }
    );
  }

  private async publishProduct(task: AgentTaskInput) {
    const id = String(task.payload.id ?? "");
    return withShopify(
      () => ({ summary: "Mock-published product (connect Shopify to go live).", output: { id, status: "ACTIVE" } }),
      async (creds) => {
        if (!id) throw new Error("Missing Shopify product id");
        const data = await shopifyGraphQL<{
          productUpdate: { product: { id: string; title: string; status: string } | null; userErrors: Array<{ message: string }> };
        }>(
          creds,
          `mutation Publish($input: ProductInput!) {
             productUpdate(input: $input) { product { id title status } userErrors { message } }
           }`,
          { input: { id, status: "ACTIVE" } }
        );
        if (data.productUpdate.userErrors.length) {
          throw new Error(data.productUpdate.userErrors.map((e) => e.message).join(", "));
        }
        return { summary: `Published "${data.productUpdate.product?.title}" to the storefront.`, output: { product: data.productUpdate.product } };
      }
    );
  }

  private async analytics(_task: AgentTaskInput) {
    return withShopify(
      () => ({
        summary: "Sample revenue analytics (Shopify not connected).",
        output: { revenue: 8420.75, orderCount: 146, averageOrderValue: 57.68, currency: "USD" },
      }),
      async (creds) => {
        const data = await shopifyGraphQL<{
          orders: { nodes: Array<{ totalPriceSet: { shopMoney: { amount: string; currencyCode: string } } }> };
        }>(
          creds,
          `query RecentOrders {
             orders(first: 250, sortKey: CREATED_AT, reverse: true) {
               nodes { totalPriceSet { shopMoney { amount currencyCode } } }
             }
           }`
        );
        const amounts = data.orders.nodes.map((o) => Number(o.totalPriceSet.shopMoney.amount));
        const revenue = amounts.reduce((sum, v) => sum + v, 0);
        const currency = data.orders.nodes[0]?.totalPriceSet.shopMoney.currencyCode ?? "USD";
        const orderCount = amounts.length;
        return {
          summary: `Live analytics over the last ${orderCount} orders: ${currency} ${revenue.toFixed(2)}.`,
          output: {
            revenue: Number(revenue.toFixed(2)),
            orderCount,
            averageOrderValue: orderCount ? Number((revenue / orderCount).toFixed(2)) : 0,
            currency,
          },
        };
      }
    );
  }

  private async registerWebhooks(_task: AgentTaskInput) {
    const domainName = process.env.DOMAIN_NAME;
    const topics = ["ORDERS_CREATE", "PRODUCTS_UPDATE", "INVENTORY_LEVELS_UPDATE", "ORDERS_UPDATED"];

    return withShopify(
      () => ({
        summary: "Cannot register webhooks — Shopify not connected.",
        output: { registered: [], topics },
      }),
      async (creds) => {
        if (!domainName) {
          throw new Error("DOMAIN_NAME is not configured — set it so Shopify knows where to send webhooks");
        }
        const callbackUrl = `https://${domainName}/api/webhooks/shopify`;
        const registered: Array<{ topic: string; id?: string; error?: string }> = [];

        for (const topic of topics) {
          try {
            const data = await shopifyGraphQL<{
              webhookSubscriptionCreate: {
                webhookSubscription: { id: string } | null;
                userErrors: Array<{ message: string }>;
              };
            }>(
              creds,
              `mutation CreateWebhook($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
                 webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
                   webhookSubscription { id }
                   userErrors { message }
                 }
               }`,
              { topic, webhookSubscription: { callbackUrl, format: "JSON" } }
            );
            if (data.webhookSubscriptionCreate.userErrors.length) {
              registered.push({ topic, error: data.webhookSubscriptionCreate.userErrors.map((e) => e.message).join(", ") });
            } else {
              registered.push({ topic, id: data.webhookSubscriptionCreate.webhookSubscription?.id });
            }
          } catch (error) {
            registered.push({ topic, error: error instanceof Error ? error.message : String(error) });
          }
        }

        return {
          summary: `Registered ${registered.filter((r) => r.id).length}/${topics.length} webhook subscriptions to ${callbackUrl}.`,
          output: { registered, callbackUrl },
        };
      }
    );
  }
}
