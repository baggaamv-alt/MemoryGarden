import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodType } from "zod";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const badRequest = (msg: string, details?: unknown) => new ApiError(400, msg, "bad_request", details);
export const unauthorized = (msg = "Please sign in.") => new ApiError(401, msg, "unauthorized");
export const forbidden = (msg = "You don't have access to this.") => new ApiError(403, msg, "forbidden");
export const notFound = (msg = "Not found.") => new ApiError(404, msg, "not_found");
export const conflict = (msg: string, code = "conflict") => new ApiError(409, msg, code);

export function json<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

type Ctx<P> = { params: Promise<P> };

/**
 * Wraps a route handler with origin checks for state-changing requests and uniform error
 * responses. Unexpected errors are logged and returned without internals.
 */
export function route<P = Record<string, string>>(
  fn: (req: NextRequest, ctx: Ctx<P>) => Promise<Response>,
) {
  return async (req: NextRequest, ctx: Ctx<P>) => {
    try {
      if (req.method !== "GET" && req.method !== "HEAD") assertSameOrigin(req);
      return await fn(req, ctx);
    } catch (err) {
      return errorResponse(err);
    }
  };
}

export function errorResponse(err: unknown) {
  if (err instanceof ApiError) {
    return NextResponse.json({ error: err.message, code: err.code, details: err.details }, { status: err.status });
  }
  if (err instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Some details need another look.",
        code: "validation",
        details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
      { status: 400 },
    );
  }
  console.error("[api] unexpected error", err);
  return NextResponse.json({ error: "Something went wrong on our side.", code: "server_error" }, { status: 500 });
}

export async function readJson<T>(req: NextRequest, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw badRequest("Expected a JSON body.");
  }
  return schema.parse(body);
}

/** Basic CSRF protection: browsers always send Origin on cross-site POST/PATCH/DELETE. */
function assertSameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) return; // same-origin requests from older browsers / server-to-server tools
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    if (new URL(origin).host !== host) throw forbidden("Cross-site request blocked.");
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw forbidden("Cross-site request blocked.");
  }
}

export function isSecureRequest(req: NextRequest) {
  const proto = req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "");
  return proto === "https";
}

/** Simple in-memory rate limiter (per process) for sign-in attempts. */
const buckets = new Map<string, { count: number; resetAt: number }>();
export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  b.count += 1;
  if (b.count > limit) {
    throw new ApiError(429, "Too many attempts. Please wait a few minutes and try again.", "rate_limited");
  }
}

export function clientIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}
