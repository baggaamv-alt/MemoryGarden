import "server-only";
import { cld, errorMessage } from "./client";
import { MD } from "./metadata";

export type SearchResource = {
  public_id: string;
  asset_id?: string;
  resource_type: string;
  type: string;
  format?: string;
  width?: number;
  height?: number;
  created_at?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  context?: Record<string, unknown>;
};

export type SearchQuery = {
  patientCode: string;
  /** Only memories the caregiver approved for activities (metadata.mg_game_eligible = yes). */
  eligibleOnly?: boolean;
  categories?: string[];
  tags?: string[];
  mediaKinds?: string[];
  text?: string;
  yearFrom?: number;
  yearTo?: number;
  maxResults?: number;
};

const quote = (v: string) => `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

/** Builds a Cloudinary Search expression from structured metadata and tags — not folder paths. */
export function buildExpression(q: SearchQuery): string {
  const parts = [`metadata.${MD.patientId}=${quote(q.patientCode)}`];
  if (q.eligibleOnly) parts.push(`metadata.${MD.gameEligible}="yes"`);
  if (q.categories?.length) parts.push(`(${q.categories.map((c) => `metadata.${MD.category}=${quote(c)}`).join(" OR ")})`);
  if (q.tags?.length) parts.push(`(${q.tags.map((t) => `tags=${quote(t)}`).join(" OR ")})`);
  if (q.mediaKinds?.length) parts.push(`(${q.mediaKinds.map((k) => `metadata.${MD.mediaKind}=${quote(k)}`).join(" OR ")})`);
  if (q.yearFrom) parts.push(`metadata.${MD.year}>=${Math.floor(q.yearFrom)}`);
  if (q.yearTo) parts.push(`metadata.${MD.year}<=${Math.floor(q.yearTo)}`);
  const text = q.text?.trim().replace(/["\\()]/g, " ").split(/\s+/).filter(Boolean).slice(0, 6);
  if (text?.length) {
    for (const word of text) {
      const w = quote(word);
      parts.push(
        `(tags:${w} OR metadata.${MD.event}:${w} OR metadata.${MD.people}:${w} OR metadata.${MD.caption}:${w} OR metadata.${MD.location}:${w} OR metadata.${MD.relationships}:${w} OR context.caption:${w})`,
      );
    }
  }
  return parts.join(" AND ");
}

type CacheEntry = { at: number; value: { resources: SearchResource[]; total: number } };
const cache = new Map<string, CacheEntry>();
const TTL_MS = 30_000;

export function invalidateSearchCache(patientCode?: string) {
  if (!patientCode) return cache.clear();
  for (const key of cache.keys()) if (key.includes(`"${patientCode}"`)) cache.delete(key);
}

export async function searchMemories(q: SearchQuery, opts: { fresh?: boolean } = {}) {
  const expression = buildExpression(q);
  const key = `${expression}|${q.maxResults ?? 100}`;
  const hit = cache.get(key);
  if (!opts.fresh && hit && Date.now() - hit.at < TTL_MS) return { ...hit.value, expression, cached: true };

  const res = (await cld()
    .search.expression(expression)
    .with_field("tags")
    .with_field("metadata")
    .with_field("context")
    .sort_by("created_at", "desc")
    .max_results(Math.min(q.maxResults ?? 100, 500))
    .execute()) as { resources?: SearchResource[]; total_count?: number };

  const value = { resources: res.resources ?? [], total: res.total_count ?? 0 };
  cache.set(key, { at: Date.now(), value });
  return { ...value, expression, cached: false };
}

/** Confirms an individual asset is visible to the Search API (index lag is usually seconds). */
export async function isIndexed(publicId: string): Promise<boolean> {
  const res = (await cld().search.expression(`public_id=${quote(publicId)}`).max_results(1).execute()) as {
    total_count?: number;
  };
  return (res.total_count ?? 0) > 0;
}

export async function searchHealth(): Promise<{ ok: boolean; error?: string }> {
  try {
    await cld().search.expression("resource_type:image").max_results(1).execute();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}
