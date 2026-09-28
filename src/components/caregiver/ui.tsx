"use client";

import type { ReactNode } from "react";

export function Section({ title, description, actions, children, className = "" }: { title?: ReactNode; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`cg-card p-5 ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-lg font-extrabold">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-ink-soft">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Field({ label, hint, children, htmlFor }: { label: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div>
      <label className="cg-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-ink-faint">{hint}</p>}
    </div>
  );
}

export function Toggle({ checked, onChange, label, description, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string; disabled?: boolean }) {
  return (
    <label className={`flex items-start gap-3 rounded-xl border border-[#e7e0d3] bg-white p-3 ${disabled ? "opacity-60" : "cursor-pointer hover:bg-[#fcfaf6]"}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-sage-deep" : "bg-[#d9d1c3]"}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-[1.4rem]" : "left-0.5"}`} />
      </button>
      <span>
        <span className="block text-sm font-bold">{label}</span>
        {description && <span className="block text-xs text-ink-soft">{description}</span>}
      </span>
    </label>
  );
}

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-[#fff4d6] text-[#7f5a08] border-[#f0d58a]",
  approved: "bg-[#eef8ea] text-[#2f6a2c] border-[#bfe0b4]",
  excluded: "bg-[#f3eef9] text-[#5a3fa3] border-[#d9ccf4]",
};

export function StatusBadge({ status }: { status: string }) {
  const label = status === "pending" ? "Needs review" : status === "approved" ? "In activities" : status === "excluded" ? "Kept out" : status;
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-bold ${STATUS_STYLE[status] ?? "bg-cg-bg"}`}>{label}</span>;
}

export function Notice({ tone = "info", children }: { tone?: "info" | "warn" | "error" | "ok"; children: ReactNode }) {
  const style =
    tone === "error"
      ? "bg-[#fdf1ef] border-[#e3b1ab] text-[#7d2a22]"
      : tone === "warn"
        ? "bg-[#fff8e5] border-[#f0d58a] text-[#6b4d05]"
        : tone === "ok"
          ? "bg-[#eef8ea] border-[#bfe0b4] text-[#2f5f2c]"
          : "bg-[#eef6fc] border-[#bcdcf1] text-[#1f4e73]";
  return <div className={`rounded-xl border p-3 text-sm ${style}`}>{children}</div>;
}

export function Empty({ icon, title, children }: { icon: string; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[#d9d1c3] bg-[#fcfaf6] px-6 py-10 text-center">
      <span className="text-4xl" aria-hidden="true">
        {icon}
      </span>
      <p className="font-bold">{title}</p>
      {children && <div className="max-w-md text-sm text-ink-soft">{children}</div>}
    </div>
  );
}
