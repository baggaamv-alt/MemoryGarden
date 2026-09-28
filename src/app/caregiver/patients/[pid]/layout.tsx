import { eq } from "drizzle-orm";
import { OpenGardenButton } from "@/components/caregiver/OpenGardenButton";
import { PatientTabs } from "@/components/caregiver/PatientTabs";
import { pageCaregiverFor } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { patientProfiles, users } from "@/lib/db/schema";

export default async function PatientLayout({ children, params }: { children: React.ReactNode; params: Promise<{ pid: string }> }) {
  const { pid } = await params;
  await pageCaregiverFor(pid);
  const db = await getDb();
  const [row] = await db
    .select({ name: users.name, code: patientProfiles.code, addressAs: patientProfiles.addressAs })
    .from(users)
    .innerJoin(patientProfiles, eq(patientProfiles.patientId, users.id))
    .where(eq(users.id, pid))
    .limit(1);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-4">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-peach text-2xl font-display font-extrabold">{row?.name.charAt(0)}</span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-extrabold sm:text-3xl">{row?.name}</h1>
          <p className="text-sm text-ink-soft">
            Mimo calls them “{row?.addressAs}” · Patient ID {row?.code}
          </p>
        </div>
        <OpenGardenButton patientId={pid} name={row?.addressAs ?? ""} />
      </div>
      <PatientTabs patientId={pid} />
      {children}
    </div>
  );
}
