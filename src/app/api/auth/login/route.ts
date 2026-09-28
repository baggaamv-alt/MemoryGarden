import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { verifyPassword } from "@/lib/auth/password";
import { startSession } from "@/lib/auth/session";
import { clientIp, isSecureRequest, json, rateLimit, readJson, route, unauthorized } from "@/lib/api/http";

const Body = z.object({
  email: z.string().trim().toLowerCase().email("Please enter a valid email."),
  password: z.string().min(1, "Please enter your password.").max(200),
});

export const POST = route(async (req) => {
  const body = await readJson(req, Body);
  rateLimit(`login:${clientIp(req)}:${body.email}`, 8, 10 * 60 * 1000);
  const db = await getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.email, body.email), eq(users.role, "caregiver")))
    .limit(1);
  if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
    throw unauthorized("That email and password don't match.");
  }
  await startSession({ kind: "caregiver", userId: user.id, secure: isSecureRequest(req) });
  return json({ ok: true });
});
