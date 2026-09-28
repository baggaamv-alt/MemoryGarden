import "server-only";
import type { TransformationOptions } from "cloudinary";
import type { Box, Img } from "../types";
import { cld } from "./client";

/**
 * Signed Cloudinary delivery URLs. These transformations *are* the game mechanics:
 * progressive blur reveal, face-focused crops, object/region crops, region blur ("what's missing"),
 * puzzle tiles and responsive/low-bandwidth delivery. Everything is signed on the server because
 * memories are stored as `authenticated` assets.
 */

export type AssetLike = {
  publicId: string;
  deliveryType: "authenticated" | "upload";
  resourceType: "image" | "video";
  version: number | null;
  width: number | null;
  height: number | null;
};

export type DeliveryOptions = { saveData?: boolean };

type Chain = TransformationOptions[];

const WIDTHS = [320, 480, 640, 800, 1080, 1440];

function sign(asset: AssetLike, transformation: Chain, extra: Record<string, unknown> = {}) {
  return cld().url(asset.publicId, {
    type: asset.deliveryType,
    resource_type: asset.resourceType,
    version: asset.version ?? undefined,
    sign_url: true,
    secure: true,
    transformation,
    ...extra,
  });
}

function finish(o: DeliveryOptions): Chain {
  return [{ fetch_format: "auto", quality: o.saveData ? "auto:eco" : "auto" }];
}

/** Responsive image: one signed URL per width so the browser picks the right size. */
function responsive(asset: AssetLike, chain: Chain, alt: string, o: DeliveryOptions, maxWidth: number, sizes: string): Img {
  const cap = o.saveData ? Math.min(maxWidth, 800) : maxWidth;
  const widths = WIDTHS.filter((w) => w < cap).concat(cap);
  // Videos are shown as a still frame (poster) wherever a picture is needed.
  const isVideo = asset.resourceType === "video";
  const lead: Chain = isVideo ? [{ start_offset: 1 }] : [];
  const extra = isVideo ? { format: "jpg" } : {};
  const urlFor = (w: number) => sign(asset, [...lead, ...chain, { width: w, crop: "limit" }, ...finish(o)], extra);
  const mid = widths[Math.min(widths.length - 1, Math.floor(widths.length / 2))];
  return {
    src: urlFor(mid),
    srcSet: widths.map((w) => `${urlFor(w)} ${w}w`).join(", "),
    sizes,
    width: asset.width ?? undefined,
    height: asset.height ?? undefined,
    alt,
  };
}

function fixed(asset: AssetLike, chain: Chain, alt: string, o: DeliveryOptions, w: number, h: number, gravity = "center"): Img {
  const isVideo = asset.resourceType === "video";
  const lead: Chain = isVideo ? [{ start_offset: 1 }] : [];
  const extra = isVideo ? { format: "jpg" } : {};
  const one = (scale: number) =>
    sign(
      asset,
      [...lead, ...chain, { width: Math.round(w * scale), height: Math.round(h * scale), crop: "fill", gravity }, ...finish(o)],
      extra,
    );
  return {
    src: one(1),
    srcSet: o.saveData ? undefined : `${one(1)} 1x, ${one(2)} 2x`,
    width: w,
    height: h,
    alt,
  };
}

// ─── Geometry helpers ─────────────────────────────────────────

export function padBox(box: Box, asset: AssetLike, pad: number): Box {
  const W = asset.width ?? box.x + box.w;
  const H = asset.height ?? box.y + box.h;
  const px = Math.round(box.w * pad);
  const py = Math.round(box.h * pad);
  const x = Math.max(0, box.x - px);
  const y = Math.max(0, box.y - py);
  const w = Math.min(W - x, box.w + px * 2);
  const h = Math.min(H - y, box.h + py * 2);
  return { x, y, w: Math.max(1, w), h: Math.max(1, h) };
}

/** Makes a box square (for face tiles) without leaving the picture. */
function squareBox(box: Box, asset: AssetLike): Box {
  const W = asset.width ?? box.x + box.w;
  const H = asset.height ?? box.y + box.h;
  const side = Math.min(Math.max(box.w, box.h), W, H);
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const x = Math.round(Math.min(Math.max(0, cx - side / 2), W - side));
  const y = Math.round(Math.min(Math.max(0, cy - side / 2), H - side));
  return { x, y, w: Math.round(side), h: Math.round(side) };
}

const crop = (b: Box): TransformationOptions => ({ crop: "crop", x: b.x, y: b.y, width: b.w, height: b.h });

// ─── Presets ──────────────────────────────────────────────────

export function photo(asset: AssetLike, alt: string, o: DeliveryOptions = {}, maxWidth = 1440): Img {
  return responsive(asset, [], alt, o, maxWidth, "(max-width: 900px) 100vw, 900px");
}

export function thumb(asset: AssetLike, alt: string, size = 360, o: DeliveryOptions = {}): Img {
  return fixed(asset, [], alt, o, size, size, "auto");
}

/**
 * Progressive blur reveal. The photo is first normalised to ≤1000px so the same strength looks the
 * same at every delivered width; strength 0 returns the clear photo.
 */
export function blurStage(asset: AssetLike, strength: number, alt: string, o: DeliveryOptions = {}): Img {
  const chain: Chain = [{ width: 1000, height: 1000, crop: "limit" }];
  if (strength > 0) chain.push({ effect: `blur:${Math.min(2000, Math.max(1, Math.round(strength)))}` });
  return responsive(asset, chain, alt, o, 1080, "(max-width: 900px) 100vw, 900px");
}

/** Face-focused crop: exact caregiver-confirmed face box when known, otherwise Cloudinary face gravity. */
export function faceCrop(asset: AssetLike, face: Box | null, alt: string, size = 420, o: DeliveryOptions = {}): Img {
  if (face && asset.width && asset.height) {
    const b = squareBox(padBox(face, asset, 0.45), asset);
    return fixed(asset, [crop(b)], alt, o, size, size);
  }
  // Face gravity picks the most prominent detected face; the square is cut large, then scaled.
  return fixed(asset, [{ crop: "thumb", gravity: "face", width: 900, height: 900, zoom: 0.75 }], alt, o, size, size);
}

/** Object/scene crop around a caregiver-marked region. */
export function regionCrop(asset: AssetLike, box: Box, alt: string, size = 360, o: DeliveryOptions = {}): Img {
  if (!asset.width || !asset.height) return thumb(asset, alt, size, o);
  const b = padBox(box, asset, 0.12);
  return fixed(asset, [crop(b)], alt, o, size, size);
}

/** Hides one caregiver-marked object with a strong region blur ("What's missing?"). */
export function hideRegion(asset: AssetLike, box: Box, alt: string, o: DeliveryOptions = {}): Img {
  const b = padBox(box, asset, 0.06);
  const region = { x: b.x, y: b.y, width: b.w, height: b.h };
  const chain: Chain = [
    { effect: "blur_region:2000", ...region },
    { effect: "blur_region:2000", ...region },
  ];
  return responsive(asset, chain, alt, o, 1080, "(max-width: 900px) 100vw, 900px");
}

export type PuzzleBoard = { rows: number; cols: number; width: number; height: number; tiles: Img[]; ghost: Img; full: Img };

/** Picture puzzle: the photo is normalised with content-aware fill, then cut into signed tile crops. */
export function puzzle(asset: AssetLike, rows: number, cols: number, alt: string, o: DeliveryOptions = {}): PuzzleBoard {
  const aspect = asset.width && asset.height ? asset.width / asset.height : 1;
  const [W, H] = aspect > 1.15 ? [960, 720] : aspect < 0.87 ? [720, 960] : [840, 840];
  const base: TransformationOptions = { crop: "fill", gravity: "auto", width: W, height: H };
  const tw = Math.floor(W / cols);
  const th = Math.floor(H / rows);
  const tiles: Img[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const src = sign(asset, [base, { crop: "crop", x: c * tw, y: r * th, width: tw, height: th }, ...finish(o)]);
      tiles.push({ src, width: tw, height: th, alt: `${alt} (${r * cols + c + 1})` });
    }
  }
  const ghost = { src: sign(asset, [base, { effect: "grayscale" }, ...finish(o)]), width: W, height: H, alt: "" };
  const full = { src: sign(asset, [base, ...finish(o)]), width: W, height: H, alt };
  return { rows, cols, width: tw * cols, height: th * rows, tiles, ghost, full };
}

export function videoPoster(asset: AssetLike, alt: string, o: DeliveryOptions = {}): Img {
  return {
    src: sign(asset, [{ start_offset: 1 }, { width: o.saveData ? 640 : 960, crop: "limit" }, ...finish(o)], { format: "jpg" }),
    alt,
  };
}

export function videoSource(asset: AssetLike, o: DeliveryOptions = {}) {
  return sign(asset, [{ width: o.saveData ? 640 : 960, crop: "limit", quality: "auto" }], { format: "mp4" });
}

/** Audio is stored as a Cloudinary "video" resource and transcoded to MP3 for every browser. */
export function audioSource(asset: AssetLike) {
  return sign(asset, [], { format: "mp3" });
}

/** A picture for any memory kind (videos use a poster frame). */
export function memoryPicture(asset: AssetLike, alt: string, o: DeliveryOptions = {}): Img {
  return photo(asset, alt, o);
}

export function memoryThumb(asset: AssetLike, alt: string, size = 360, o: DeliveryOptions = {}): Img {
  return thumb(asset, alt, size, o);
}
