"use client";

import { useRef, useState } from "react";
import { CloudImage } from "@/components/ui/CloudImage";
import type { Box, Img } from "@/lib/types";

export type Overlay = { key: string; box: Box; label: string; tone: "face" | "person" | "object" | "ai" | "draft" };

const TONE: Record<Overlay["tone"], string> = {
  face: "border-sky-deep bg-sky/20",
  person: "border-sage-deep bg-sage/20",
  object: "border-gold-deep bg-gold/20",
  ai: "border-lavender-deep bg-lavender/20 border-dashed",
  draft: "border-coral-deep bg-coral/25",
};

/**
 * Shows the photo with boxes in original-pixel coordinates. In drawing mode the caregiver drags a
 * rectangle; it is converted back to original pixels for Cloudinary crops.
 */
export function BoxCanvas({
  image,
  width,
  height,
  overlays,
  drawing,
  onDrawn,
}: {
  image: Img;
  width: number;
  height: number;
  overlays: Overlay[];
  drawing: boolean;
  onDrawn: (box: Box) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);
  const [draft, setDraft] = useState<Box | null>(null);

  const toOriginal = (e: React.PointerEvent) => {
    const rect = ref.current!.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)) * width;
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)) * height;
    return { x, y };
  };

  return (
    <div
      ref={ref}
      className={`relative w-full select-none overflow-hidden rounded-xl bg-cg-bg ${drawing ? "cursor-crosshair touch-none" : ""}`}
      style={{ aspectRatio: `${width} / ${height}` }}
      onPointerDown={(e) => {
        if (!drawing) return;
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        const p = toOriginal(e);
        setStart(p);
        setDraft({ x: p.x, y: p.y, w: 0, h: 0 });
      }}
      onPointerMove={(e) => {
        if (!drawing || !start) return;
        const p = toOriginal(e);
        setDraft({ x: Math.min(start.x, p.x), y: Math.min(start.y, p.y), w: Math.abs(p.x - start.x), h: Math.abs(p.y - start.y) });
      }}
      onPointerUp={() => {
        if (!drawing || !draft) return;
        setStart(null);
        if (draft.w > width * 0.02 && draft.h > height * 0.02) onDrawn({ x: Math.round(draft.x), y: Math.round(draft.y), w: Math.round(draft.w), h: Math.round(draft.h) });
        setDraft(null);
      }}
    >
      <CloudImage image={image} className="absolute inset-0 h-full w-full" fit="contain" priority />
      {[...overlays, ...(draft ? [{ key: "draft", box: draft, label: "", tone: "draft" as const }] : [])].map((o) => (
        <div
          key={o.key}
          className={`pointer-events-none absolute rounded-md border-2 ${TONE[o.tone]}`}
          style={{
            left: `${(o.box.x / width) * 100}%`,
            top: `${(o.box.y / height) * 100}%`,
            width: `${(o.box.w / width) * 100}%`,
            height: `${(o.box.h / height) * 100}%`,
          }}
        >
          {o.label && <span className="absolute -top-6 left-0 whitespace-nowrap rounded bg-white/95 px-1.5 py-0.5 text-[11px] font-bold shadow">{o.label}</span>}
        </div>
      ))}
    </div>
  );
}
