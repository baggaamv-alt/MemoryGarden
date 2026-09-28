"use client";

import { useEffect } from "react";

/** Offline-friendly caching (app shell + already-seen photos). Production only, so dev reloads stay fresh. */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => undefined);
  }, []);
  return null;
}
