"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, errorText } from "@/lib/client/api";
import type { ImportReport } from "@/lib/legacy/importer";
import { Field, Notice } from "./ui";

/** Brings an account from the previous Memory Garden backend (Express + MongoDB) into this app. */
export function LegacyImportCard() {
  const [available, setAvailable] = useState<{ available: boolean; cloudinary: boolean } | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", addressAs: "", relationship: "", language: "en" as "en" | "te" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);

  useEffect(() => {
    let alive = true;
    api<{ available: boolean; cloudinary: boolean }>("/api/caregiver/import-legacy")
      .then((r) => alive && setAvailable(r))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  if (!available?.available) return null;

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setReport(null);
    try {
      const res = await api<{ report: ImportReport }>("/api/caregiver/import-legacy", { body: form });
      setReport(res.report);
      setForm((f) => ({ ...f, password: "" }));
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="cg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold">📦 Bring memories from the previous Memory Garden</h2>
          <p className="mt-0.5 max-w-2xl text-sm text-ink-soft">
            Imports an account from the earlier backend: its photos, people and albums. Photos are copied into private, face-detected Cloudinary
            assets (the originals stay untouched) and wait for your review before appearing in activities. Old scores and difficulty settings are not
            carried over. Running it again only adds what&apos;s new.
          </p>
        </div>
        {!open && (
          <button className="cg-btn" onClick={() => setOpen(true)}>
            Import an account…
          </button>
        )}
      </div>

      {open && (
        <form onSubmit={run} className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Email used in the previous app" htmlFor="le">
            <input id="le" type="email" className="cg-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required autoComplete="off" />
          </Field>
          <Field label="Its password" hint="Used once to confirm the account is yours; never stored." htmlFor="lp">
            <input id="lp" type="password" className="cg-input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required autoComplete="off" />
          </Field>
          <Field label="What Mimo should call them" htmlFor="la">
            <input id="la" className="cg-input" value={form.addressAs} onChange={(e) => setForm({ ...form, addressAs: e.target.value })} placeholder="Amma" />
          </Field>
          <Field label="Your relationship to them" htmlFor="lr">
            <input id="lr" className="cg-input" value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} placeholder="Daughter" />
          </Field>
          <Field label="Language for Memory Garden" htmlFor="ll">
            <select id="ll" className="cg-input" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value as "en" | "te" })}>
              <option value="en">English</option>
              <option value="te">తెలుగు (Telugu)</option>
            </select>
          </Field>
          <div className="flex items-end justify-end gap-2">
            <button type="button" className="cg-btn" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button className="cg-btn cg-btn-primary" disabled={busy || !available.cloudinary}>
              {busy ? "Importing… (this can take a minute)" : "Import"}
            </button>
          </div>
          {!available.cloudinary && (
            <div className="sm:col-span-2">
              <Notice tone="warn">Cloudinary must be connected before photos can be imported.</Notice>
            </div>
          )}
        </form>
      )}

      {error && (
        <div className="mt-3">
          <Notice tone="error">{error}</Notice>
        </div>
      )}
      {report && (
        <div className="mt-3">
          <Notice tone={report.failed.length ? "warn" : "ok"}>
            <p className="font-bold">
              {report.createdPatient ? `Created profile ${report.patientCode}.` : `Updated profile ${report.patientCode}.`} Imported {report.memoriesCreated} photo
              {report.memoriesCreated === 1 ? "" : "s"}, {report.people} people and {report.albums} albums
              {report.alreadyImported ? ` (${report.alreadyImported} already imported earlier)` : ""}.
            </p>
            {report.failed.length > 0 && (
              <ul className="mt-1 list-disc pl-5">
                {report.failed.slice(0, 5).map((f, i) => (
                  <li key={i}>
                    {f.title}: {f.reason}
                  </li>
                ))}
              </ul>
            )}
            <Link href={`/caregiver/patients/${report.patientId}/memories?status=pending`} className="mt-2 inline-block font-bold underline">
              Review the imported memories →
            </Link>
          </Notice>
        </div>
      )}
    </section>
  );
}
