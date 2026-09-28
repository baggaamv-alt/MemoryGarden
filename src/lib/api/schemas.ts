import { z } from "zod";
import { CATEGORIES } from "../types";

export const BoxSchema = z.object({
  x: z.number().min(0),
  y: z.number().min(0),
  w: z.number().positive(),
  h: z.number().positive(),
});

export const CategorySchema = z.enum(CATEGORIES);

export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((v) => (v === "" ? null : v));

export const optionalYear = z.union([z.number().int().min(1850).max(2100), z.null()]).optional();
