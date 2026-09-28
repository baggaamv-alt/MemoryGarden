import { caregiverPatient, deliveryFor } from "@/lib/api/context";
import { json, route } from "@/lib/api/http";
import { searchLibrary } from "@/lib/services/memories";

/** Library search through the Cloudinary Search API (structured metadata + tags). */
export const GET = route<{ pid: string }>(async (req, ctx) => {
  const { pid } = await ctx.params;
  const { patient } = await caregiverPatient(pid);
  const sp = req.nextUrl.searchParams;
  const num = (k: string) => (sp.get(k) ? Number(sp.get(k)) : undefined);
  return json(
    await searchLibrary(
      patient,
      {
        q: sp.get("q") || undefined,
        category: sp.get("category") || undefined,
        tag: sp.get("tag") || undefined,
        yearFrom: num("yearFrom"),
        yearTo: num("yearTo"),
        eligibleOnly: sp.get("eligible") === "1",
      },
      await deliveryFor(req),
    ),
  );
});
