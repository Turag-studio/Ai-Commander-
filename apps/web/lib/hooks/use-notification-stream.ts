"use client";

import { useEffect, useRef } from "react";
import type { CommanderNotification } from "@ai-commander/core";

/**
 * Subscribes to the /api/events SSE stream for the lifetime of the
 * component. The server replays recent history on connect, so callers
 * don't need a separate initial fetch.
 */
export function useNotificationStream(onNotification: (notification: CommanderNotification) => void) {
  const handlerRef = useRef(onNotification);
  handlerRef.current = onNotification;

  useEffect(() => {
    const source = new EventSource("/api/events");
    const listener = (event: MessageEvent<string>) => {
      try {
        const data = JSON.parse(event.data) as CommanderNotification;
        handlerRef.current(data);
      } catch {
        // ignore malformed event
      }
    };
    source.addEventListener("notification", listener as EventListener);
    return () => {
      source.removeEventListener("notification", listener as EventListener);
      source.close();
    };
  }, []);
}
