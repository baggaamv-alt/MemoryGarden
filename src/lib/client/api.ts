"use client";

export class ApiClientError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

type NetInfo = { saveData?: boolean; effectiveType?: string };

/** Ask the server for lighter images on slow or data-saving connections. */
function slowConnection(): boolean {
  if (typeof navigator === "undefined") return false;
  const c = (navigator as Navigator & { connection?: NetInfo }).connection;
  return !!c && (c.saveData === true || ["slow-2g", "2g", "3g"].includes(c.effectiveType ?? ""));
}

export async function api<T = unknown>(
  path: string,
  opts: { method?: string; body?: unknown; form?: FormData; signal?: AbortSignal } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (slowConnection()) headers["x-mg-save-data"] = "1";
  let res: Response;
  try {
    res = await fetch(path, {
      method: opts.method ?? (opts.body !== undefined || opts.form ? "POST" : "GET"),
      headers,
      body: opts.form ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
      credentials: "same-origin",
      cache: "no-store",
      signal: opts.signal,
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    throw new ApiClientError(0, "We couldn't reach Memory Garden. Please check the internet connection.", "offline");
  }
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const d = (data ?? {}) as { error?: string; code?: string; details?: unknown };
    if (res.status === 423 && typeof window !== "undefined") window.location.href = "/unlock";
    throw new ApiClientError(res.status, d.error ?? `Request failed (${res.status})`, d.code, d.details);
  }
  return data as T;
}

export function errorText(err: unknown): string {
  if (err instanceof ApiClientError) {
    const details = Array.isArray(err.details)
      ? (err.details as { path?: string; message?: string }[]).map((d) => `${d.path ? d.path + ": " : ""}${d.message}`).join(" · ")
      : "";
    return details ? `${err.message} ${details}` : err.message;
  }
  return err instanceof Error ? err.message : "Something went wrong.";
}
