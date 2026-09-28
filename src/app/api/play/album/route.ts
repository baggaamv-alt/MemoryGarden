import { deliveryFor, patientRef } from "@/lib/api/context";
import { json, route } from "@/lib/api/http";
import { albumState, exploreCategory } from "@/lib/services/play";

export const GET = route(async (req) => {
  const p = await patientRef();
  const delivery = await deliveryFor(req, p.patientId);
  const category = req.nextUrl.searchParams.get("category");
  if (category) return json(await exploreCategory(p, category, delivery));
  return json(await albumState(p, delivery));
});
