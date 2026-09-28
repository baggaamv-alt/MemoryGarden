import { eq } from "drizzle-orm";
import { AlbumsManager } from "@/components/caregiver/AlbumsManager";
import { pageCaregiverFor } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { patientProfiles } from "@/lib/db/schema";
import { listCollections, listDailyPairs } from "@/lib/services/caregiver";
import { listMemories } from "@/lib/services/memories";

export default async function AlbumsPage({ params }: { params: Promise<{ pid: string }> }) {
  const { pid } = await params;
  await pageCaregiverFor(pid);
  const db = await getDb();
  const [profile] = await db.select().from(patientProfiles).where(eq(patientProfiles.patientId, pid)).limit(1);
  const [collections, pairs, memories] = await Promise.all([
    listCollections(pid, {}),
    listDailyPairs(pid, {}),
    listMemories({ id: pid, code: profile.code }, { status: "all" }, {}),
  ]);
  return <AlbumsManager patientId={pid} initialCollections={collections} initialPairs={pairs} memories={memories} />;
}
