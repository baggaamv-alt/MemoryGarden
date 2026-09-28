import { caregiverPatient } from "@/lib/api/context";
import { json, route } from "@/lib/api/http";
import { checkSearchIndex, syncToCloudinary } from "@/lib/services/memories";

/** Re-pushes tags/metadata to Cloudinary and confirms the asset is visible to the Search API. */
export const POST = route<{ pid: string; mid: string }>(async (_req, ctx) => {
  const { pid, mid } = await ctx.params;
  const { patient } = await caregiverPatient(pid);
  await syncToCloudinary(mid, patient);
  return json(await checkSearchIndex(patient, mid));
});
