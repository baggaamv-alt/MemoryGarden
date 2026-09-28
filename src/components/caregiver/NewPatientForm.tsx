"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, errorText } from "@/lib/client/api";
import { Field, Notice, Section, Toggle } from "./ui";

export function NewPatientForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    addressAs: "",
    language: "en" as "en" | "te",
    birthYear: "",
    hometown: "",
    about: "",
    relationship: "",
    timezone: typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "Asia/Kolkata",
    starterPack: true,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ id: string }>("/api/caregiver/patients", {
        body: {
          name: form.name,
          addressAs: form.addressAs || form.name,
          language: form.language,
          birthYear: form.birthYear ? Number(form.birthYear) : null,
          hometown: form.hometown || null,
          about: form.about || null,
          relationship: form.relationship || "Caregiver",
          timezone: form.timezone,
          starterPack: form.starterPack,
        },
      });
      router.push(`/caregiver/patients/${res.id}/memories`);
      router.refresh();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <Section title="About them">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor="name">
            <input id="name" className="cg-input" value={form.name} onChange={(e) => set("name", e.target.value)} required />
          </Field>
          <Field label="What Mimo should call them" hint="e.g. Amma, Nanna, Ammamma, Grandpa" htmlFor="addr">
            <input id="addr" className="cg-input" value={form.addressAs} onChange={(e) => set("addressAs", e.target.value)} placeholder="Amma" />
          </Field>
          <Field label="Your relationship to them" hint="e.g. Daughter, Son, Nurse" htmlFor="rel">
            <input id="rel" className="cg-input" value={form.relationship} onChange={(e) => set("relationship", e.target.value)} placeholder="Daughter" />
          </Field>
          <Field label="Language for Memory Garden" htmlFor="lang">
            <select id="lang" className="cg-input" value={form.language} onChange={(e) => set("language", e.target.value as "en" | "te")}>
              <option value="en">English</option>
              <option value="te">తెలుగు (Telugu)</option>
            </select>
          </Field>
          <Field label="Birth year (optional)" htmlFor="by">
            <input id="by" className="cg-input" inputMode="numeric" value={form.birthYear} onChange={(e) => set("birthYear", e.target.value.replace(/\D/g, "").slice(0, 4))} />
          </Field>
          <Field label="Hometown (optional)" htmlFor="ht">
            <input id="ht" className="cg-input" value={form.hometown} onChange={(e) => set("hometown", e.target.value)} />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Anything that helps (optional)" hint="Favourite songs, festivals, foods, things that comfort them." htmlFor="about">
            <textarea id="about" className="cg-input min-h-24" value={form.about} onChange={(e) => set("about", e.target.value)} />
          </Field>
        </div>
      </Section>

      <Section title="Starting content" description="Memory Garden is built from your own photographs. While you add them, these illustrated cards can be used.">
        <Toggle
          checked={form.starterPack}
          onChange={(v) => set("starterPack", v)}
          label="Include the illustrated everyday cards"
          description="Simple pictures of everyday things (tea cup ↔ teapot, kite ↔ Sankranti…) for Daily Life Match. You can switch them off later."
        />
      </Section>

      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex justify-end gap-3">
        <button type="button" className="cg-btn" onClick={() => router.back()}>
          Cancel
        </button>
        <button className="cg-btn cg-btn-primary" disabled={busy || !form.name.trim()}>
          {busy ? "Creating…" : "Create and add memories →"}
        </button>
      </div>
    </form>
  );
}
