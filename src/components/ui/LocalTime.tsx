"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => undefined;

/**
 * Formats a timestamp in the viewer's own locale and time zone. The server renders a neutral
 * ISO date first, so server and browser HTML always match (no hydration mismatch).
 */
export function LocalTime({ iso, date = false }: { iso: string | Date; date?: boolean }) {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const text = useSyncExternalStore(
    subscribe,
    () => (date ? d.toLocaleDateString() : d.toLocaleString()),
    () => d.toISOString().slice(0, date ? 10 : 16).replace("T", " "),
  );
  return <time dateTime={d.toISOString()}>{text}</time>;
}
