"use client";

import { useState } from "react";
import { CloudImage } from "@/components/ui/CloudImage";
import { api, errorText } from "@/lib/client/api";
import { RELATIONSHIPS } from "@/lib/content/categories";
import type { listPeople } from "@/lib/services/caregiver";
import { Empty, Field, Notice, Section } from "./ui";

type Person = Awaited<ReturnType<typeof listPeople>>[number];

export function PeopleManager({ patientId, initial }: { patientId: string; initial: Person[] }) {
  const [people, setPeople] = useState(initial);
  const [editing, setEditing] = useState<Person | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const base = `/api/caregiver/patients/${patientId}/people`;

  async function reload() {
    const res = await api<{ people: Person[] }>(base);
    setPeople(res.people);
  }

  return (
    <div className="flex flex-col gap-5">
      <Section
        title="People in their life"
        description="Names and relationships come only from you. Cloudinary finds faces in photos; you say who they are. Relationship names are shown in Telugu too."
        actions={
          <button className="cg-btn cg-btn-primary" onClick={() => setEditing("new")}>
            + Add a person
          </button>
        }
      >
        {error && <Notice tone="error">{error}</Notice>}
        {editing && (
          <PersonForm
            person={editing === "new" ? null : editing}
            onCancel={() => setEditing(null)}
            onSave={async (body) => {
              setError(null);
              try {
                if (editing === "new") await api(base, { body });
                else await api(`${base}/${editing.id}`, { method: "PATCH", body });
                setEditing(null);
                await reload();
              } catch (e) {
                setError(errorText(e));
              }
            }}
          />
        )}
        {people.length === 0 ? (
          <Empty icon="🧑‍🤝‍🧑" title="No people yet">
            Add family and friends here, or name them directly on a photo — faces are detected automatically when you upload.
          </Empty>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {people.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-xl border border-[#e7e0d3] bg-white p-3">
                {p.face ? (
                  <CloudImage image={p.face} className="h-16 w-16 shrink-0 rounded-full" />
                ) : (
                  <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-peach text-2xl font-display font-extrabold">{p.name.charAt(0)}</span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{p.name}</p>
                  <p className="text-sm text-ink-soft">
                    {p.relationship || "—"} {p.relationshipTe && p.relationshipTe !== p.relationship && <span lang="te">· {p.relationshipTe}</span>}
                  </p>
                  <p className="text-xs text-ink-faint">
                    In {p.photos} photo{p.photos === 1 ? "" : "s"} · {p.approvedPhotos} approved
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <button className="cg-btn !min-h-8 !px-2 text-xs" onClick={() => setEditing(p)}>
                    Edit
                  </button>
                  <button
                    className="cg-btn cg-btn-danger !min-h-8 !px-2 text-xs"
                    onClick={async () => {
                      if (!confirm(`Remove ${p.name}? They will be unlinked from all photos (the photos stay).`)) return;
                      await api(`${base}/${p.id}`, { method: "DELETE" });
                      await reload();
                    }}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function PersonForm({
  person,
  onSave,
  onCancel,
}: {
  person: Person | null;
  onSave: (body: { name: string; relationshipKey: string; relationshipLabel: string | null; notes: string | null }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(person?.name ?? "");
  const [rel, setRel] = useState(person?.relationshipKey ?? "daughter");
  const [custom, setCustom] = useState(person?.relationshipLabel ?? "");
  const [notes, setNotes] = useState(person?.notes ?? "");
  return (
    <form
      className="mb-4 grid gap-3 rounded-xl border border-[#bcdcf1] bg-[#f3f9fd] p-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ name, relationshipKey: rel, relationshipLabel: rel === "custom" ? custom : custom || null, notes: notes || null });
      }}
    >
      <Field label="Name" htmlFor="pn">
        <input id="pn" className="cg-input" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
      </Field>
      <Field label="Relationship to them" htmlFor="pr">
        <select id="pr" className="cg-input" value={rel} onChange={(e) => setRel(e.target.value)}>
          {RELATIONSHIPS.map((r) => (
            <option key={r.key} value={r.key}>
              {r.label.en} · {r.label.te}
            </option>
          ))}
          <option value="custom">Other (write it)</option>
        </select>
      </Field>
      <Field label={rel === "custom" ? "Relationship in your words" : "Your own wording (optional)"} htmlFor="pc" hint="Shown instead of the standard name, e.g. “Chinni's husband”">
        <input id="pc" className="cg-input" value={custom} onChange={(e) => setCustom(e.target.value)} />
      </Field>
      <Field label="Notes (optional)" htmlFor="pnotes">
        <input id="pnotes" className="cg-input" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <div className="flex justify-end gap-2 sm:col-span-2">
        <button type="button" className="cg-btn" onClick={onCancel}>
          Cancel
        </button>
        <button className="cg-btn cg-btn-primary" disabled={!name.trim()}>
          Save
        </button>
      </div>
    </form>
  );
}
