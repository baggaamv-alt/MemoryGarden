import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { UnlockForm } from "@/components/auth/UnlockForm";
import { getCaregiver, getPatientContext } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Caregiver area" };

export default async function UnlockPage() {
  const [c, p] = await Promise.all([getCaregiver(), getPatientContext()]);
  if (!c) redirect("/login");
  if (!c.session.locked) redirect("/caregiver");
  return (
    <AuthShell title="Caregiver area" subtitle={`Memory Garden is open on this device. Enter ${c.user.name}'s password to continue.`}>
      <UnlockForm hasPatientMode={!!p} />
      {p && (
        <Link href="/play" className="cg-btn mt-4 w-full">
          ← Back to Memory Garden
        </Link>
      )}
    </AuthShell>
  );
}
