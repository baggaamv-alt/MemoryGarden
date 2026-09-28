import "server-only";
import { v2 as cloudinary } from "cloudinary";

export const ROOT_FOLDER = (process.env.MG_ROOT_FOLDER || "memory-garden").replace(/^\/+|\/+$/g, "");
export const DELIVERY_TYPE: "authenticated" | "upload" =
  process.env.MG_DELIVERY_TYPE === "upload" ? "upload" : "authenticated";

let configured = false;

function readCredentials() {
  const url = process.env.CLOUDINARY_URL?.trim();
  if (url) {
    const m = url.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
    if (m) return { api_key: m[1], api_secret: m[2], cloud_name: m[3] };
  }
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const api_key = process.env.CLOUDINARY_API_KEY?.trim();
  const api_secret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (cloud_name && api_key && api_secret) return { cloud_name, api_key, api_secret };
  return null;
}

export function isCloudinaryConfigured() {
  return readCredentials() !== null;
}

export class CloudinaryNotConfiguredError extends Error {
  constructor() {
    super("Cloudinary is not configured. Add your credentials to .env.local and restart the server.");
  }
}

/** The configured Cloudinary SDK. Server-only: the API secret never reaches the browser. */
export function cld() {
  if (!configured) {
    const creds = readCredentials();
    if (!creds) throw new CloudinaryNotConfiguredError();
    cloudinary.config({ ...creds, secure: true, analytics: false });
    configured = true;
  }
  return cloudinary;
}

export function cloudName() {
  return readCredentials()?.cloud_name ?? null;
}

let folderModeCache: { value: "dynamic" | "fixed"; at: number } | null = null;

/** Dynamic folder mode uses asset_folder; legacy fixed mode uses folder. Detected via the Admin API. */
export async function folderMode(): Promise<"dynamic" | "fixed"> {
  if (folderModeCache && Date.now() - folderModeCache.at < 60 * 60 * 1000) return folderModeCache.value;
  try {
    const res = (await cld().api.config({ settings: true })) as { settings?: { folder_mode?: string } };
    const value = res.settings?.folder_mode === "fixed" ? "fixed" : "dynamic";
    folderModeCache = { value, at: Date.now() };
    return value;
  } catch (err) {
    console.warn("[cloudinary] could not read folder mode, assuming dynamic", errorMessage(err));
    return "dynamic";
  }
}

export function errorMessage(err: unknown): string {
  if (!err) return "Unknown error";
  if (typeof err === "string") return err;
  const e = err as { message?: string; error?: { message?: string }; http_code?: number };
  return e.error?.message || e.message || JSON.stringify(err).slice(0, 300);
}

export function errorHttpCode(err: unknown): number | undefined {
  const e = err as { http_code?: number; error?: { http_code?: number } };
  return e?.http_code ?? e?.error?.http_code;
}
