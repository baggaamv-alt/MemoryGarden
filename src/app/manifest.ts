import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Memory Garden",
    short_name: "Memory Garden",
    description: "A warm, personal memory adventure made from family photographs.",
    start_url: "/play",
    display: "standalone",
    background_color: "#FFF8EC",
    theme_color: "#FFF8EC",
    orientation: "any",
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
