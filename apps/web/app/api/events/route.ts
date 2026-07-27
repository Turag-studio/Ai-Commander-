import { getOrchestrator } from "@/lib/server/orchestrator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Server-Sent Events stream of every Commander notification — order events,
 * agent status changes, mission progress. Powers instant dashboard updates
 * and the Neural Brain's live pulses without polling.
 */
export async function GET() {
  const { eventBus } = await getOrchestrator();
  const encoder = new TextEncoder();

  let unsubscribe: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      for (const notification of [...eventBus.getHistory(20)].reverse()) {
        send("notification", notification);
      }

      unsubscribe = eventBus.subscribe((notification) => send("notification", notification));

      heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`: heartbeat\n\n`));
      }, 25000);
    },
    cancel() {
      unsubscribe?.();
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
