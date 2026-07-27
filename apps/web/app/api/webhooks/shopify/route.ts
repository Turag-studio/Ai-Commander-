import crypto from "node:crypto";
import { NextResponse } from "next/server";
import type { EventBus } from "@ai-commander/core";
import { getOrchestrator } from "@/lib/server/orchestrator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function verifyHmac(rawBody: string, hmacHeader: string | null, secret: string): boolean {
  if (!hmacHeader) return false;
  const digest = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader));
  } catch {
    return false;
  }
}

function handleTopic(topic: string, payload: Record<string, unknown>, eventBus: EventBus, shopDomain: string) {
  switch (topic) {
    case "orders/create": {
      const name = payload.name ?? payload.order_number ?? "new order";
      const total = payload.total_price ?? payload.current_total_price ?? "?";
      eventBus.success("New Order", `Order ${name} — $${total}`, "shopify");
      break;
    }
    case "orders/updated": {
      eventBus.info("Order Updated", `Order ${String(payload.name ?? "")} was updated`, "shopify");
      break;
    }
    case "products/create": {
      eventBus.success("Product Created", `"${String(payload.title ?? "A product")}" was created in Shopify`, "shopify");
      break;
    }
    case "products/update": {
      eventBus.info("Product Updated", `"${String(payload.title ?? "A product")}" was updated in Shopify`, "shopify");
      break;
    }
    case "inventory_levels/update": {
      const quantity = payload.available;
      eventBus.warning("Inventory Changed", `New available quantity: ${quantity ?? "unknown"}`, "shopify");
      break;
    }
    default: {
      eventBus.info(`Shopify webhook: ${topic}`, shopDomain ? `from ${shopDomain}` : "received", "shopify");
    }
  }
}

/**
 * Receives Shopify webhooks (orders/create, products/update, inventory_levels/update, ...).
 * Register the callback URL via the `shopify.register_webhooks` agent task, or manually
 * in Shopify Admin → Settings → Notifications, pointing at /api/webhooks/shopify.
 * Verifies the HMAC signature against SHOPIFY_WEBHOOK_SECRET when configured.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  const hmacHeader = request.headers.get("x-shopify-hmac-sha256");
  const topic = request.headers.get("x-shopify-topic") ?? "unknown";
  const shopDomain = request.headers.get("x-shopify-shop-domain") ?? "";

  if (secret && !verifyHmac(rawBody, hmacHeader, secret)) {
    return NextResponse.json({ error: "Invalid HMAC signature" }, { status: 401 });
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    // malformed payload — still acknowledge the topic so Shopify doesn't retry forever
  }

  const { eventBus } = await getOrchestrator();
  handleTopic(topic, payload, eventBus, shopDomain);

  return NextResponse.json({ received: true });
}
