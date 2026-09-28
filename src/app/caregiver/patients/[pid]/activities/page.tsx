import { ActivitySettings } from "@/components/caregiver/ActivitySettings";
import { pageCaregiverFor } from "@/lib/auth/session";
import { patientOverview } from "@/lib/services/caregiver";

export default async function ActivitiesPage({ params }: { params: Promise<{ pid: string }> }) {
  const { pid } = await params;
  await pageCaregiverFor(pid);
  const o = await patientOverview(pid);
  return <ActivitySettings patientId={pid} name={o.patient.addressAs} initial={o.prefs} worlds={o.worlds} />;
}
