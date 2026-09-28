import "server-only";
import { cld, errorMessage } from "./client";

/**
 * Structured metadata fields created in the Cloudinary product environment (prefixed `mg_`
 * so they never collide with the account's own fields). They make every memory retrievable
 * through the Search API by patient, category, event, year, people, language and eligibility.
 */
export const MD = {
  patientId: "mg_patient_id",
  memoryId: "mg_memory_id",
  mediaKind: "mg_media_kind",
  category: "mg_category",
  event: "mg_event",
  year: "mg_year",
  people: "mg_people",
  relationships: "mg_relationships",
  location: "mg_location",
  language: "mg_language",
  importance: "mg_importance",
  caption: "mg_caption",
  gameEligible: "mg_game_eligible",
} as const;

type FieldDef = { external_id: string; label: string; type: "string" | "integer" };

const FIELDS: FieldDef[] = [
  { external_id: MD.patientId, label: "Memory Garden · Patient ID", type: "string" },
  { external_id: MD.memoryId, label: "Memory Garden · Memory ID", type: "string" },
  { external_id: MD.mediaKind, label: "Memory Garden · Media kind", type: "string" },
  { external_id: MD.category, label: "Memory Garden · Category", type: "string" },
  { external_id: MD.event, label: "Memory Garden · Event", type: "string" },
  { external_id: MD.year, label: "Memory Garden · Year", type: "integer" },
  { external_id: MD.people, label: "Memory Garden · People", type: "string" },
  { external_id: MD.relationships, label: "Memory Garden · Relationships", type: "string" },
  { external_id: MD.location, label: "Memory Garden · Location", type: "string" },
  { external_id: MD.language, label: "Memory Garden · Language", type: "string" },
  { external_id: MD.importance, label: "Memory Garden · Importance (1-5)", type: "integer" },
  { external_id: MD.caption, label: "Memory Garden · Approved caption", type: "string" },
  { external_id: MD.gameEligible, label: "Memory Garden · Game eligible", type: "string" },
];

let ensured: { ok: true; at: number } | null = null;
let inflight: Promise<{ created: string[]; existing: string[] }> | null = null;

export type MetadataStatus = { ready: boolean; missing: string[]; error?: string };

export async function metadataStatus(): Promise<MetadataStatus> {
  try {
    const res = (await cld().api.list_metadata_fields()) as { metadata_fields?: { external_id: string }[] };
    const have = new Set((res.metadata_fields ?? []).map((f) => f.external_id));
    const missing = FIELDS.filter((f) => !have.has(f.external_id)).map((f) => f.external_id);
    return { ready: missing.length === 0, missing };
  } catch (err) {
    return { ready: false, missing: FIELDS.map((f) => f.external_id), error: errorMessage(err) };
  }
}

/** Creates any missing fields. Safe to call often — the result is cached for the process. */
export async function ensureMetadataFields() {
  if (ensured && Date.now() - ensured.at < 6 * 60 * 60 * 1000) return { created: [], existing: FIELDS.map((f) => f.external_id) };
  if (inflight) return inflight;
  inflight = (async () => {
    const api = cld().api;
    const res = (await api.list_metadata_fields()) as { metadata_fields?: { external_id: string }[] };
    const have = new Set((res.metadata_fields ?? []).map((f) => f.external_id));
    const created: string[] = [];
    for (const f of FIELDS) {
      if (have.has(f.external_id)) continue;
      await api.add_metadata_field({ external_id: f.external_id, label: f.label, type: f.type, mandatory: false });
      created.push(f.external_id);
    }
    ensured = { ok: true, at: Date.now() };
    return { created, existing: [...have] };
  })().finally(() => {
    inflight = null;
  });
  return inflight;
}

export type MetadataInput = {
  patientCode: string;
  memoryId: string;
  mediaType: string;
  category: string;
  event?: string | null;
  year?: number | null;
  people?: string[];
  relationships?: string[];
  location?: string | null;
  language?: string | null;
  importance?: number | null;
  caption?: string | null;
  gameEligible: boolean;
};

const clip = (s: string, n = 900) => (s.length > n ? s.slice(0, n) : s);

/** Values for Cloudinary structured metadata. Empty values are sent as "" so edits can clear them. */
export function buildMetadata(m: MetadataInput): Record<string, string | number> {
  const out: Record<string, string | number> = {
    [MD.patientId]: m.patientCode,
    [MD.memoryId]: m.memoryId,
    [MD.mediaKind]: m.mediaType,
    [MD.category]: m.category,
    [MD.gameEligible]: m.gameEligible ? "yes" : "no",
    [MD.event]: clip(m.event?.trim() ?? ""),
    [MD.people]: clip((m.people ?? []).join(", ")),
    [MD.relationships]: clip((m.relationships ?? []).join(", ")),
    [MD.location]: clip(m.location?.trim() ?? ""),
    [MD.language]: m.language ?? "en",
    [MD.caption]: clip(m.caption?.trim() ?? "", 2000),
  };
  if (m.year && Number.isInteger(m.year)) out[MD.year] = m.year;
  if (m.importance && Number.isInteger(m.importance)) out[MD.importance] = m.importance;
  return out;
}

/** Drops empty strings (for the initial upload, where there is nothing to clear). */
export function nonEmpty(md: Record<string, string | number>) {
  return Object.fromEntries(Object.entries(md).filter(([, v]) => v !== ""));
}
