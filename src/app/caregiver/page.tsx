import Link from "next/link";
import { CloudinaryStatusCard } from "@/components/caregiver/CloudinaryStatusCard";
import { LegacyImportCard } from "@/components/caregiver/LegacyImportCard";
import { pageCaregiver } from "@/lib/auth/session";
import { listPatients } from "@/lib/services/caregiver";

export default async function CaregiverHome() {
  const { user } = await pageCaregiver();
  const patients = await listPatients(user.id);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">Hello, {user.name.split(" ")[0]}</h1>
          <p className="text-ink-soft">The people you care for, their memories and their Memory Garden.</p>
        </div>
        <Link href="/caregiver/patients/new" className="cg-btn cg-btn-primary">
          + Add a person you care for
        </Link>
      </div>

      <CloudinaryStatusCard compact />
      <LegacyImportCard />

      {patients.length === 0 ? (
        <div className="cg-card flex flex-col items-center gap-3 p-10 text-center">
          <span className="text-5xl">🌱</span>
          <h2 className="text-xl font-extrabold">Let&apos;s plant the first garden</h2>
          <p className="max-w-md text-ink-soft">
            Create a profile for the person you care for. Then upload a few family photos, name the people in them, and approve the ones that can
            appear in activities.
          </p>
          <Link href="/caregiver/patients/new" className="cg-btn cg-btn-primary mt-2">
            Create a profile
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {patients.map((p) => (
            <li key={p.id}>
              <Link href={`/caregiver/patients/${p.id}`} className="cg-card flex h-full flex-col gap-3 p-5 transition hover:shadow-soft">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-peach text-xl font-display font-extrabold">{p.name.charAt(0)}</span>
                  <div>
                    <p className="text-lg font-extrabold leading-tight">{p.name}</p>
                    <p className="text-sm text-ink-soft">
                      “{p.addressAs}” · {p.code} · you are their {p.relationship.toLowerCase()}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-bold">
                  <span className="rounded-full bg-[#eef8ea] px-2 py-1 text-[#2f6a2c]">{p.memories.approved} in activities</span>
                  {p.memories.pending > 0 && <span className="rounded-full bg-[#fff4d6] px-2 py-1 text-[#7f5a08]">{p.memories.pending} need review</span>}
                  {p.memories.excluded > 0 && <span className="rounded-full bg-[#f3eef9] px-2 py-1 text-[#5a3fa3]">{p.memories.excluded} kept out</span>}
                </div>
                <p className="mt-auto text-sm text-ink-soft">
                  {p.lastActivityAt ? `Last activity ${new Date(p.lastActivityAt).toLocaleString()}` : "No activities yet"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
