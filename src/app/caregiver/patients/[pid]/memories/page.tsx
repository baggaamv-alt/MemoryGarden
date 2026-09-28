import { MemoryLibrary } from "@/components/caregiver/MemoryLibrary";
import { pageCaregiverFor } from "@/lib/auth/session";
import { isCloudinaryConfigured } from "@/lib/cloudinary/client";
import { getDb } from "@/lib/db";
import { patientProfiles } from "@/lib/db/schema";
import { listMemories } from "@/lib/services/memories";
import { eq } from "drizzle-orm";

export default async function MemoriesPage({ params, searchParams }: { params: Promise<{ pid: string }>; searchParams: Promise<{ status?: string }> }) {
  const { pid } = await params;
  const sp = await searchParams;
  await pageCaregiverFor(pid);
  const db = await getDb();
  const [profile] = await db.select().from(patientProfiles).where(eq(patientProfiles.patientId, pid)).limit(1);
  const items = await listMemories({ id: pid, code: profile.code }, { status: "all" }, {});
  return (
    <MemoryLibrary
      patientId={pid}
      patientCode={profile.code}
      initialItems={items}
      initialStatus={sp.status === "pending" || sp.status === "approved" || sp.status === "excluded" ? sp.status : "all"}
      cloudinaryReady={isCloudinaryConfigured()}
    />
  );
}
