import { z } from "zod";
import { CategorySchema } from "@/lib/api/schemas";

export const CollectionBody = z.object({
  kind: z.enum(["album", "story"]),
  title: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).nullable().optional(),
  category: CategorySchema.nullable().optional(),
  items: z
    .array(
      z.object({
        memoryId: z.string().max(64),
        caption: z.string().trim().max(1000).nullable().optional(),
        narrationMemoryId: z.string().max(64).nullable().optional(),
      }),
    )
    .max(60),
});
