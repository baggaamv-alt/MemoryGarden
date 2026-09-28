"use client";

import { useState } from "react";
import type { Img } from "@/lib/types";

type Props = {
  image: Img;
  className?: string;
  sizes?: string;
  priority?: boolean;
  fit?: "cover" | "contain";
  alt?: string;
  style?: React.CSSProperties;
};

/**
 * Signed Cloudinary delivery with responsive candidates (f_auto/q_auto are part of each URL).
 * next/image is not used: Cloudinary already optimises, and URLs must stay exactly as signed.
 */
export function CloudImage({ image, className = "", sizes, priority, fit = "cover", alt, style }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className={`flex items-center justify-center bg-cream-deep text-4xl ${className}`} role="img" aria-label={alt ?? image.alt} style={style}>
        🌼
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={image.src}
      srcSet={image.srcSet}
      sizes={sizes ?? image.sizes}
      alt={alt ?? image.alt}
      width={image.width}
      height={image.height}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      draggable={false}
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
      className={`${fit === "cover" ? "object-cover" : "object-contain"} transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"} ${className}`}
      style={{ backgroundColor: "#f6e9d3", ...style }}
    />
  );
}
