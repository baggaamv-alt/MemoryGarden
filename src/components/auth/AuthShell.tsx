import Link from "next/link";
import type { ReactNode } from "react";
import { MimoBadge } from "./MimoBadge";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <main className="mg-caregiver flex min-h-dvh items-center justify-center bg-gradient-to-b from-sky/50 to-cg-bg px-4 py-10">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 flex items-center justify-center gap-3">
          <MimoBadge />
          <span className="text-2xl font-display font-extrabold">Memory Garden</span>
        </Link>
        <div className="cg-card p-6 sm:p-8">
          <h1 className="text-2xl font-extrabold">{title}</h1>
          <p className="mb-6 mt-1 text-ink-soft">{subtitle}</p>
          {children}
        </div>
      </div>
    </main>
  );
}
