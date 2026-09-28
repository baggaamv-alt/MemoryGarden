import { caregiverPatient } from "@/lib/api/context";
import { json, route } from "@/lib/api/http";
import { patientInsights } from "@/lib/services/insights";

export const GET = route<{ pid: string }>(async (req, ctx) => {
  const { pid } = await ctx.params;
  const { patient } = await caregiverPatient(pid);
  const days = Number(req.nextUrl.searchParams.get("days") ?? 30);
  return json(await patientInsights({ id: pid, name: patient.addressAs || patient.name, timezone: patient.timezone }, { days }));
});
