import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthShell } from "@/components/auth/AuthShell";
import { getCaregiver } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Caregiver sign in" };

export default async function LoginPage() {
  const c = await getCaregiver();
  if (c) redirect(c.session.locked ? "/unlock" : "/caregiver");
  return (
    <AuthShell title="Welcome back" subtitle="Sign in to manage memories, activities and progress.">
      <AuthForm mode="login" />
    </AuthShell>
  );
}
