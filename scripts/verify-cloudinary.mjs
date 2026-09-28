// Live end-to-end check of the Cloudinary integration against YOUR product environment:
//   folder mode → structured metadata fields → authenticated upload with tags/metadata/face detection
//   → Search API retrieval by metadata → signed game transformations (blur, face crop, region blur,
//   puzzle tile) fetched over HTTP → clean-up of the single test asset it created.
// Usage: add credentials to .env.local, then `npm run verify:cloudinary`.
import fs from "node:fs";
import { v2 as cloudinary } from "cloudinary";

for (const file of [".env.local"]) {
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && m[2] && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const url = process.env.CLOUDINARY_URL?.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
const creds = url
  ? { api_key: url[1], api_secret: url[2], cloud_name: url[3] }
  : { cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET };
if (!creds.cloud_name || !creds.api_key || !creds.api_secret) {
  console.error("✗ No Cloudinary credentials in .env.local (CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET).");
  process.exit(1);
}
cloudinary.config({ ...creds, secure: true, analytics: false });

const ROOT = process.env.MG_ROOT_FOLDER || "memory-garden";
const FIELDS = [
  ["mg_patient_id", "string"], ["mg_memory_id", "string"], ["mg_media_kind", "string"], ["mg_category", "string"],
  ["mg_event", "string"], ["mg_year", "integer"], ["mg_people", "string"], ["mg_relationships", "string"],
  ["mg_location", "string"], ["mg_language", "string"], ["mg_importance", "integer"], ["mg_caption", "string"],
  ["mg_game_eligible", "string"],
];
const step = (ok, msg) => console.log(`${ok ? "✓" : "✗"} ${msg}`);
let failures = 0;
const check = (ok, msg) => {
  step(ok, msg);
  if (!ok) failures += 1;
};

const cfg = await cloudinary.api.config({ settings: true }).catch((e) => ({ error: e }));
const mode = cfg?.settings?.folder_mode === "fixed" ? "fixed" : "dynamic";
check(!cfg.error, `Connected to "${creds.cloud_name}" (folder mode: ${mode})`);

const existing = new Set(((await cloudinary.api.list_metadata_fields()).metadata_fields ?? []).map((f) => f.external_id));
for (const [id, type] of FIELDS) {
  if (!existing.has(id)) await cloudinary.api.add_metadata_field({ external_id: id, label: `Memory Garden · ${id}`, type, mandatory: false });
}
check(true, `Structured metadata fields ready (${FIELDS.length})`);

const folder = `${ROOT}/patients/VERIFY/family`;
const memoryId = `verify-${Date.now()}`;
const up = await cloudinary.uploader.upload("https://res.cloudinary.com/demo/image/upload/couple.jpg", {
  type: "authenticated",
  resource_type: "image",
  faces: true,
  tags: ["family", "patient-verify", "memory-garden"],
  context: { caption: "Verification photo", alt: "Two people" },
  metadata: { mg_patient_id: "VERIFY", mg_memory_id: memoryId, mg_media_kind: "photo", mg_category: "family", mg_year: 1999, mg_game_eligible: "yes" },
  transformation: [{ width: 2560, height: 2560, crop: "limit" }],
  ...(mode === "dynamic" ? { asset_folder: folder, public_id: `${folder}/${memoryId}` } : { folder, public_id: memoryId }),
});
check(!!up.public_id, `Uploaded authenticated asset ${up.public_id} (${up.width}×${up.height}, ${up.faces?.length ?? 0} face(s) detected)`);

let found = 0;
for (let i = 0; i < 12 && !found; i++) {
  const res = await cloudinary.search
    .expression(`metadata.mg_patient_id="VERIFY" AND metadata.mg_game_eligible="yes" AND tags="family"`)
    .with_field("metadata")
    .with_field("tags")
    .max_results(10)
    .execute();
  found = (res.resources ?? []).filter((r) => r.public_id === up.public_id).length;
  if (!found) await new Promise((r) => setTimeout(r, 2500));
}
check(found > 0, "Search API found it by structured metadata + tag");

const sign = (transformation) =>
  cloudinary.url(up.public_id, { type: "authenticated", sign_url: true, secure: true, version: up.version, transformation: [...transformation, { fetch_format: "auto", quality: "auto" }] });
const face = up.faces?.[0];
const urls = {
  "progressive blur (e_blur:1600)": sign([{ width: 1000, height: 1000, crop: "limit" }, { effect: "blur:1600" }, { width: 640, crop: "limit" }]),
  "face crop": face ? sign([{ crop: "crop", x: face[0], y: face[1], width: face[2], height: face[3] }, { width: 320, height: 320, crop: "fill" }]) : sign([{ crop: "thumb", gravity: "face", width: 320, height: 320 }]),
  "region blur (What's Missing?)": sign([{ effect: "blur_region:2000", x: 10, y: 10, width: 200, height: 200 }, { width: 640, crop: "limit" }]),
  "puzzle tile": sign([{ crop: "fill", gravity: "auto", width: 840, height: 840 }, { crop: "crop", x: 420, y: 0, width: 420, height: 420 }]),
};
for (const [name, u] of Object.entries(urls)) {
  const res = await fetch(u);
  check(res.ok, `${name}: HTTP ${res.status}`);
}
const unsigned = `https://res.cloudinary.com/${creds.cloud_name}/image/authenticated/e_blur:1600/v${up.version}/${up.public_id}`;
const blocked = await fetch(unsigned);
check(!blocked.ok, `Unsigned URL is refused (HTTP ${blocked.status}) — photos stay private`);

await cloudinary.uploader.destroy(up.public_id, { type: "authenticated", resource_type: "image", invalidate: true });
check(true, "Removed the verification asset");
console.log(failures ? `\n${failures} check(s) failed.` : "\nAll Cloudinary checks passed.");
process.exit(failures ? 1 : 0);
