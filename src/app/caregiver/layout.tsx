import type { Metadata } from "next";
import Link from "next/link";
import { MimoBadge } from "@/components/auth/MimoBadge";
import { SignOutButton } from "@/components/caregiver/SignOutButton";
import { pageCaregiver } from "@/lib/auth/session";

export const metadata: Metadata = { title: { default: "Caregiver", template: "%s · Caregiver · Memory Garden" } };

export default async function CaregiverLayout({ children }: { children: React.ReactNode }) {
  const { user } = await pageCaregiver();
  return (
    <div className="mg-caregiver min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-[#e7e0d3] bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 sm:px-6">
          <Link href="/caregiver" className="flex items-center gap-2">
            <MimoBadge size={40} />
            <span className="text-lg font-display font-extrabold">Memory Garden</span>
            <span className="hidden rounded-full bg-cg-bg px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-ink-soft sm:inline">Caregiver</span>
          </Link>
          <nav className="ml-4 hidden items-center gap-1 text-sm font-bold md:flex">
            <Link href="/caregiver" className="rounded-lg px-3 py-2 hover:bg-cg-bg">
              People I care for
            </Link>
            <Link href="/caregiver/cloudinary" className="rounded-lg px-3 py-2 hover:bg-cg-bg">
              Cloudinary
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-ink-soft sm:inline">{user.name}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6">{children}</div>
    </div>
  );
}
