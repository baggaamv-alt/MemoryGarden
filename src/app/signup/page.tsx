import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthShell } from "@/components/auth/AuthShell";
import { getCaregiver } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Create a caregiver account" };

export default async function SignupPage() {
  const c = await getCaregiver();
  if (c) redirect(c.session.locked ? "/unlock" : "/caregiver");
  return (
    <AuthShell title="Create a caregiver account" subtitle="You'll add the person you care for, their memories and the people in their life.">
      <AuthForm mode="signup" />
    </AuthShell>
  );
}
