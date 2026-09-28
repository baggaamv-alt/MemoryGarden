import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { MemoryEditor } from "@/components/caregiver/MemoryEditor";
import { pageCaregiverFor } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { patientProfiles } from "@/lib/db/schema";
import { memoryDetail } from "@/lib/services/memories";

export default async function MemoryPage({ params }: { params: Promise<{ pid: string; mid: string }> }) {
  const { pid, mid } = await params;
  await pageCaregiverFor(pid);
  const db = await getDb();
  const [profile] = await db.select().from(patientProfiles).where(eq(patientProfiles.patientId, pid)).limit(1);
  const detail = await memoryDetail({ id: pid, code: profile.code }, mid, {}).catch(() => null);
  if (!detail) notFound();
  return <MemoryEditor patientId={pid} initial={detail} />;
}
