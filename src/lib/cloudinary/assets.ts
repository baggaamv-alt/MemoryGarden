import "server-only";
import type { UploadApiOptions, UploadApiResponse } from "cloudinary";
import type { Box, MediaType } from "../types";
import { cld, DELIVERY_TYPE, errorMessage, folderMode, ROOT_FOLDER } from "./client";
import { buildMetadata, ensureMetadataFields, nonEmpty, type MetadataInput } from "./metadata";

export function patientFolder(patientCode: string, category: string) {
  const safeCat = category.replace(/[^a-z0-9-]/gi, "").toLowerCase() || "other";
  return `${ROOT_FOLDER}/patients/${patientCode}/${safeCat}`;
}

export function audioFolder(patientCode: string) {
  return `${ROOT_FOLDER}/patients/${patientCode}/audio`;
}

export type UploadedAsset = {
  publicId: string;
  assetId: string | null;
  version: number | null;
  format: string | null;
  resourceType: "image" | "video";
  deliveryType: "authenticated" | "upload";
  width: number | null;
  height: number | null;
  duration: number | null;
  bytes: number | null;
  assetFolder: string;
  faces: Box[];
  metadataApplied: boolean;
  metadataError?: string;
};

type UploadInput = {
  buffer: Buffer;
  memoryId: string;
  mediaType: MediaType;
  title: string;
  tags: string[];
  caption?: string | null;
  metadata: MetadataInput;
};

function streamUpload(buffer: Buffer, options: UploadApiOptions): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const stream = cld().uploader.upload_stream(options, (err, res) => {
      if (err || !res) reject(err ?? new Error("Upload failed"));
      else resolve(res);
    });
    stream.end(buffer);
  });
}

function parseFaces(raw: unknown): Box[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((f): f is number[] => Array.isArray(f) && f.length >= 4)
    .map(([x, y, w, h]) => ({ x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) }))
    .filter((b) => b.w > 4 && b.h > 4);
}

/**
 * Uploads a memory into a per-patient, per-category folder with tags, contextual metadata and
 * structured metadata. Images are auto-oriented and capped at 2560px on ingest, and Cloudinary's
 * built-in face detection returns face boxes that caregivers then label (Cloudinary detects faces,
 * it never identifies people).
 */
export async function uploadMemoryAsset(input: UploadInput): Promise<UploadedAsset> {
  const folder = input.mediaType === "audio" ? audioFolder(input.metadata.patientCode) : patientFolder(input.metadata.patientCode, input.metadata.category);
  const mode = await folderMode();
  const resourceType = input.mediaType === "photo" ? "image" : "video";

  let metadataApplied = true;
  let metadataError: string | undefined;
  try {
    await ensureMetadataFields();
  } catch (err) {
    metadataApplied = false;
    metadataError = `Structured metadata unavailable: ${errorMessage(err)}`;
  }

  const options: UploadApiOptions = {
    resource_type: resourceType,
    type: DELIVERY_TYPE,
    overwrite: false,
    unique_filename: false,
    tags: input.tags,
    context: {
      caption: input.caption?.trim() || input.title || "Memory",
      alt: input.title || "A personal memory",
    },
    ...(mode === "dynamic"
      ? { asset_folder: folder, public_id: `${folder}/${input.memoryId}`, display_name: (input.title || input.memoryId).replace(/\//g, "-").slice(0, 200) }
      : { folder, public_id: input.memoryId }),
  };
  if (metadataApplied) options.metadata = nonEmpty(buildMetadata(input.metadata));
  if (resourceType === "image") {
    options.faces = true;
    options.transformation = [{ width: 2560, height: 2560, crop: "limit" }];
  }

  let res: UploadApiResponse;
  try {
    res = await streamUpload(input.buffer, options);
  } catch (err) {
    // If only the metadata was rejected (e.g. fields removed from the account), keep the upload
    // and report the metadata problem so the caregiver can re-sync later.
    if (options.metadata && /metadata/i.test(errorMessage(err))) {
      delete options.metadata;
      metadataApplied = false;
      metadataError = errorMessage(err);
      res = await streamUpload(input.buffer, options);
    } else {
      throw err;
    }
  }

  return {
    publicId: res.public_id,
    assetId: (res.asset_id as string | undefined) ?? null,
    version: res.version ?? null,
    format: res.format ?? null,
    resourceType,
    deliveryType: DELIVERY_TYPE,
    width: res.width ?? null,
    height: res.height ?? null,
    duration: typeof res.duration === "number" ? res.duration : null,
    bytes: res.bytes ?? null,
    assetFolder: (res.asset_folder as string | undefined) ?? folder,
    faces: parseFaces(res.faces),
    metadataApplied,
    metadataError,
  };
}

type AssetRef = { publicId: string; resourceType: "image" | "video"; deliveryType: "authenticated" | "upload" };

/**
 * Pushes the caregiver's latest edits (tags, caption, structured metadata) to Cloudinary using
 * the Upload API `explicit` method, which is not subject to Admin API rate limits.
 */
export async function syncAssetDetails(
  asset: AssetRef,
  details: { tags: string[]; title: string; caption?: string | null; metadata: MetadataInput },
) {
  await ensureMetadataFields();
  const md = buildMetadata(details.metadata);
  const base = {
    type: asset.deliveryType,
    resource_type: asset.resourceType,
    tags: details.tags,
    context: { caption: details.caption?.trim() || details.title || "Memory", alt: details.title || "A personal memory" },
  };
  try {
    await cld().uploader.explicit(asset.publicId, { ...base, metadata: md });
  } catch (err) {
    // Some environments reject empty values for clearing; retry with non-empty values only.
    if (/metadata|empty|value/i.test(errorMessage(err))) {
      await cld().uploader.explicit(asset.publicId, { ...base, metadata: nonEmpty(md) });
    } else {
      throw err;
    }
  }
}

/** Moves an asset into a new category folder (dynamic folders: asset_folder only, URLs unchanged). */
export async function moveAssetFolder(asset: AssetRef, patientCode: string, category: string): Promise<string | null> {
  const mode = await folderMode();
  if (mode !== "dynamic") return null; // fixed mode would require renaming the public ID; keep it stable
  const folder = patientFolder(patientCode, category);
  await cld().api.update(asset.publicId, { type: asset.deliveryType, resource_type: asset.resourceType, asset_folder: folder });
  return folder;
}

export async function deleteAsset(asset: AssetRef) {
  const res = (await cld().uploader.destroy(asset.publicId, {
    type: asset.deliveryType,
    resource_type: asset.resourceType,
    invalidate: true,
  })) as { result?: string };
  return res.result === "ok" || res.result === "not found";
}

/** Optional Cloudinary AI add-ons. Results are stored as suggestions for caregiver review only. */
export async function requestAiAnalysis(asset: AssetRef, opts: { captioning: boolean; objectModel?: string }) {
  const detections = [opts.captioning ? "captioning" : null, opts.objectModel || null].filter(Boolean) as string[];
  if (detections.length === 0) return { caption: null as string | null, objects: [] as { label: string; box: Box; confidence: number }[] };
  const res = (await cld().uploader.explicit(asset.publicId, {
    type: asset.deliveryType,
    resource_type: asset.resourceType,
    detection: detections.join(","),
  })) as { info?: { detection?: Record<string, unknown> } };
  const detection = res.info?.detection ?? {};
  return { caption: findCaption(detection), objects: findObjects(detection) };
}

function findCaption(node: unknown, depth = 0): string | null {
  if (!node || typeof node !== "object" || depth > 6) return null;
  const obj = node as Record<string, unknown>;
  if (typeof obj.caption === "string" && obj.caption.trim()) return obj.caption.trim();
  for (const v of Object.values(obj)) {
    const found = findCaption(v, depth + 1);
    if (found) return found;
  }
  return null;
}

function findObjects(detection: Record<string, unknown>) {
  const out: { label: string; box: Box; confidence: number }[] = [];
  const visit = (node: unknown, depth: number) => {
    if (!node || typeof node !== "object" || depth > 7) return;
    const obj = node as Record<string, unknown>;
    const tags = obj.tags;
    if (tags && typeof tags === "object" && !Array.isArray(tags)) {
      for (const [label, list] of Object.entries(tags as Record<string, unknown>)) {
        if (!Array.isArray(list)) continue;
        for (const d of list as Record<string, unknown>[]) {
          const bb = d["bounding-box"] ?? d.bounding_box;
          const conf = typeof d.confidence === "number" ? d.confidence : 0;
          if (Array.isArray(bb) && bb.length >= 4) {
            const [x, y, w, h] = bb.map(Number);
            out.push({ label, box: { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) }, confidence: conf });
          }
        }
      }
    }
    for (const v of Object.values(obj)) visit(v, depth + 1);
  };
  visit(detection, 0);
  return out.filter((o) => o.confidence >= 0.6).sort((a, b) => b.confidence - a.confidence).slice(0, 12);
}
