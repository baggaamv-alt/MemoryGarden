import { z } from "zod";
import { caregiverPatient, deliveryFor } from "@/lib/api/context";
import { badRequest, json, route } from "@/lib/api/http";
import { CategorySchema } from "@/lib/api/schemas";
import { listMemories, uploadMemory } from "@/lib/services/memories";
import type { MediaType } from "@/lib/types";

export const GET = route<{ pid: string }>(async (req, ctx) => {
  const { pid } = await ctx.params;
  const { patient } = await caregiverPatient(pid);
  const sp = req.nextUrl.searchParams;
  const status = sp.get("status") as "pending" | "approved" | "excluded" | "all" | null;
  const items = await listMemories(
    patient,
    {
      status: status ?? "all",
      category: sp.get("category") || undefined,
      mediaType: (sp.get("mediaType") as MediaType) || undefined,
      q: sp.get("q") || undefined,
    },
    await deliveryFor(req),
  );
  return json({ items });
});

const Fields = z.object({
  title: z.string().trim().max(120).default(""),
  category: CategorySchema,
  event: z.string().trim().max(120).optional(),
  year: z.coerce.number().int().min(1850).max(2100).optional(),
  approxDate: z.string().trim().max(60).optional(),
  location: z.string().trim().max(120).optional(),
  language: z.enum(["en", "te"]).default("en"),
  importance: z.coerce.number().int().min(1).max(5).default(3),
  caption: z.string().trim().max(1000).optional(),
  tags: z.string().max(500).optional(),
  linkedMemoryId: z.string().max(64).optional(),
  linkedPersonId: z.string().max(64).optional(),
  collectionId: z.string().max(64).optional(),
  mediaType: z.enum(["photo", "video", "audio"]).optional(),
});

/** Multipart upload: the file goes server → Cloudinary (the API secret never leaves the server). */
export const POST = route<{ pid: string }>(async (req, ctx) => {
  const { pid } = await ctx.params;
  const { patient, caregiver } = await caregiverPatient(pid);
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw badRequest("Please attach a file.");
  }
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) throw badRequest("Please attach a file.");
  const raw = Object.fromEntries([...form.entries()].filter(([k, v]) => k !== "file" && typeof v === "string" && v !== ""));
  const f = Fields.parse(raw);
  const memory = await uploadMemory(
    caregiver.id,
    patient,
    { buffer: Buffer.from(await file.arrayBuffer()), name: file.name || "memory", type: file.type || "", size: file.size },
    {
      title: f.title,
      category: f.category,
      event: f.event,
      year: f.year ?? null,
      approxDate: f.approxDate,
      location: f.location,
      language: f.language,
      importance: f.importance,
      caption: f.caption,
      tags: f.tags ? f.tags.split(",") : [],
      linkedMemoryId: f.linkedMemoryId,
      linkedPersonId: f.linkedPersonId,
      collectionId: f.collectionId,
    },
    f.mediaType,
  );
  return json(
    { memory: { id: memory.id, publicId: memory.publicId, status: memory.status, faces: memory.faces.length, sync: memory.sync } },
    { status: 201 },
  );
});
