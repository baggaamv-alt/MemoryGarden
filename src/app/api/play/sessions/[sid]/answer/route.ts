import { z } from "zod";
import { patientRef } from "@/lib/api/context";
import { json, readJson, route } from "@/lib/api/http";
import { answerRound } from "@/lib/game/engine";

const Input = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("choice"), optionIds: z.array(z.string().max(32)).min(1).max(8) }),
  z.object({ kind: z.literal("match"), a: z.string().max(32), b: z.string().max(32) }),
  z.object({ kind: z.literal("puzzle"), pieceId: z.string().max(32), slot: z.number().int().min(0).max(63) }),
  z.object({ kind: z.literal("order"), order: z.array(z.string().max(32)).min(2).max(8) }),
  z.object({ kind: z.literal("story"), slide: z.number().int().min(0).max(100) }),
  z.object({ kind: z.literal("preview-seen") }),
  z.object({ kind: z.literal("reveal-all") }),
  z.object({ kind: z.literal("skip") }),
]);

const Body = z.object({
  round: z.number().int().min(0).max(50),
  input: Input,
  responseMs: z.number().int().min(0).max(3_600_000).optional(),
});

/** Answers are validated on the server against the stored answer key. */
export const POST = route<{ sid: string }>(async (req, ctx) => {
  const { sid } = await ctx.params;
  const p = await patientRef();
  const body = await readJson(req, Body);
  return json(await answerRound(p.patientId, sid, body.round, body.input, body.responseMs));
});
