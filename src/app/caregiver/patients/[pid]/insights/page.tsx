import { eq } from "drizzle-orm";
import { InsightsView } from "@/components/caregiver/InsightsView";
import { pageCaregiverFor } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { patientProfiles } from "@/lib/db/schema";
import { patientInsights } from "@/lib/services/insights";

export default async function InsightsPage({ params, searchParams }: { params: Promise<{ pid: string }>; searchParams: Promise<{ days?: string }> }) {
  const { pid } = await params;
  const sp = await searchParams;
  await pageCaregiverFor(pid);
  const db = await getDb();
  const [profile] = await db.select().from(patientProfiles).where(eq(patientProfiles.patientId, pid)).limit(1);
  const days = [14, 30, 90].includes(Number(sp.days)) ? Number(sp.days) : 30;
  const data = await patientInsights({ id: pid, name: profile.addressAs, timezone: profile.timezone }, { days });
  return <InsightsView data={data} patientId={pid} name={profile.addressAs} />;
}
