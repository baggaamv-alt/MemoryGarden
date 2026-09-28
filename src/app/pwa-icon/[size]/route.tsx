import { ImageResponse } from "next/og";
import fs from "node:fs";
import path from "node:path";

/** PNG app icons for the web app manifest, rendered from the SVG icon. */
export async function GET(_req: Request, ctx: { params: Promise<{ size: string }> }) {
  const { size } = await ctx.params;
  const px = size === "512" ? 512 : size === "180" ? 180 : 192;
  const svg = fs.readFileSync(path.join(process.cwd(), "src/app/icon.svg"), "utf8");
  const src = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#FFF8EC" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} width={px * 0.86} height={px * 0.86} alt="" />
      </div>
    ),
    { width: px, height: px, headers: { "Cache-Control": "public, max-age=86400" } },
  );
}
