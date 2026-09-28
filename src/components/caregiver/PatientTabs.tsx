"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function PatientTabs({ patientId }: { patientId: string }) {
  const pathname = usePathname();
  const base = `/caregiver/patients/${patientId}`;
  const tabs = [
    { href: base, label: "Overview" },
    { href: `${base}/memories`, label: "Memories" },
    { href: `${base}/people`, label: "People" },
    { href: `${base}/albums`, label: "Albums & stories" },
    { href: `${base}/activities`, label: "Activities" },
    { href: `${base}/insights`, label: "Insights" },
    { href: `${base}/settings`, label: "Settings & privacy" },
  ];
  return (
    <nav className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto border-b border-[#e7e0d3] px-1" aria-label="Patient sections">
      {tabs.map((t) => {
        const active = t.href === base ? pathname === base : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`shrink-0 border-b-[3px] px-3 py-2.5 text-sm font-bold transition ${active ? "border-sage-deep text-ink" : "border-transparent text-ink-soft hover:text-ink"}`}
            aria-current={active ? "page" : undefined}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
