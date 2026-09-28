import { PatientSettings } from "@/components/caregiver/PatientSettings";
import { pageCaregiverFor } from "@/lib/auth/session";
import { patientOverview, recentAudit } from "@/lib/services/caregiver";

export default async function SettingsPage({ params }: { params: Promise<{ pid: string }> }) {
  const { pid } = await params;
  const { link } = await pageCaregiverFor(pid);
  const [o, audit] = await Promise.all([patientOverview(pid), recentAudit(pid)]);
  return <PatientSettings patientId={pid} overview={o} audit={audit} isOwner={link.role === "owner"} />;
}
