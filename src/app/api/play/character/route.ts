import { z } from "zod";
import { patientRef } from "@/lib/api/context";
import { json, readJson, route } from "@/lib/api/http";
import { equipItem, saveCharacter } from "@/lib/services/play";

const Create = z.object({
  name: z.string().trim().min(1).max(24),
  appearance: z.object({
    color: z.enum(["peach", "lavender", "sage", "sky", "butter", "rose"]),
    sprout: z.enum(["leaf", "bud", "clover"]),
    cheeks: z.boolean().default(true),
  }),
});

export const POST = route(async (req) => {
  const p = await patientRef();
  await saveCharacter(p.patientId, await readJson(req, Create));
  return json({ ok: true });
});

const Equip = z.object({
  slot: z.enum(["hat", "glasses", "scarf", "outfit", "shoes", "accessory", "animation", "companion"]),
  itemId: z.string().max(64).nullable(),
});

export const PATCH = route(async (req) => {
  const body = await readJson(req, Equip);
  return json(await equipItem(await patientRef(), body.slot, body.itemId));
});
