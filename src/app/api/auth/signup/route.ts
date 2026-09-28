import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { startSession } from "@/lib/auth/session";
import { clientIp, conflict, isSecureRequest, json, rateLimit, readJson, route } from "@/lib/api/http";

const Body = z.object({
  name: z.string().trim().min(1, "Please enter your name.").max(80),
  email: z.string().trim().toLowerCase().email("Please enter a valid email."),
  password: z.string().min(8, "Please use at least 8 characters.").max(200),
});

export const POST = route(async (req) => {
  rateLimit(`signup:${clientIp(req)}`, 10, 60 * 60 * 1000);
  const body = await readJson(req, Body);
  const db = await getDb();
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, body.email)).limit(1);
  if (existing) throw conflict("An account with this email already exists. Please sign in.", "email_taken");
  const id = crypto.randomUUID();
  await db.insert(users).values({
    id,
    role: "caregiver",
    email: body.email,
    name: body.name,
    passwordHash: await hashPassword(body.password),
  });
  await startSession({ kind: "caregiver", userId: id, secure: isSecureRequest(req) });
  return json({ ok: true });
});
