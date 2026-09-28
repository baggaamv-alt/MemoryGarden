"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CloudImage } from "@/components/ui/CloudImage";
import { api, errorText } from "@/lib/client/api";
import { CATEGORY_INFO, RELATIONSHIPS, SUGGESTED_TAGS } from "@/lib/content/categories";
import type { memoryDetail } from "@/lib/services/memories";
import { CATEGORIES, type Box, type Category } from "@/lib/types";
import { BoxCanvas, type Overlay } from "./BoxCanvas";
import { Field, Notice, Section, StatusBadge, Toggle } from "./ui";
import { VoiceRecorder } from "./VoiceRecorder";

type Detail = Awaited<ReturnType<typeof memoryDetail>>;
type DrawMode = null | "face" | "object";

export function MemoryEditor({ patientId, initial }: { patientId: string; initial: Detail }) {
  const router = useRouter();
  const [d, setD] = useState(initial);
  const m = d.memory;
  const base = `/api/caregiver/patients/${patientId}/memories/${m.id}`;
  const [form, setForm] = useState({
    title: m.title,
    category: m.category as Category,
    event: m.event ?? "",
    year: m.year ? String(m.year) : "",
    approxDate: m.approxDate ?? "",
    location: m.location ?? "",
    language: m.language,
    importance: m.importance,
    caption: m.caption ?? "",
    tags: m.tags,
    sensitive: m.sensitive,
  });
  const [tagDraft, setTagDraft] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [draw, setDraw] = useState<DrawMode>(null);
  const [pendingBox, setPendingBox] = useState<{ mode: "face" | "object"; box: Box } | null>(null);
  const [assign, setAssign] = useState<{ box: Box | null } | null>(null);
  const [objectLabel, setObjectLabel] = useState("");
  const dirty = JSON.stringify(form) !== JSON.stringify({
    title: m.title,
    category: m.category,
    event: m.event ?? "",
    year: m.year ? String(m.year) : "",
    approxDate: m.approxDate ?? "",
    location: m.location ?? "",
    language: m.language,
    importance: m.importance,
    caption: m.caption ?? "",
    tags: m.tags,
    sensitive: m.sensitive,
  });

  async function refresh() {
    setD(await api<Detail>(base));
  }

  async function act(label: string, fn: () => Promise<unknown>, success?: string) {
    setBusy(label);
    setMessage(null);
    try {
      await fn();
      if (success) setMessage({ tone: "ok", text: success });
    } catch (e) {
      setMessage({ tone: "error", text: errorText(e) });
    } finally {
      setBusy(null);
    }
  }

  const save = () =>
    act(
      "save",
      async () => {
        const next = await api<Detail>(base, {
          method: "PATCH",
          body: {
            title: form.title,
            category: form.category,
            event: form.event || null,
            year: form.year ? Number(form.year) : null,
            approxDate: form.approxDate || null,
            location: form.location || null,
            language: form.language,
            importance: form.importance,
            caption: form.caption || null,
            tags: form.tags,
            sensitive: form.sensitive,
          },
        });
        setD(next);
      },
      "Saved and synced to Cloudinary.",
    );

  const setStatus = (status: "approved" | "excluded" | "pending") =>
    act(
      status,
      async () => {
        if (dirty) await save();
        await api(`${base}/status`, { body: { status } });
        await refresh();
      },
      status === "approved" ? "Approved — this memory can now appear in activities." : status === "excluded" ? "Kept out of activities." : "Sent back to review.",
    );

  const W = m.width ?? 1000;
  const H = m.height ?? 750;
  const overlays: Overlay[] = [
    ...m.faces
      .filter((f) => !d.people.some((p) => p.face && Math.abs(p.face.x - f.x) < 4 && Math.abs(p.face.y - f.y) < 4))
      .map((f, i) => ({ key: `f${i}`, box: f, label: `Face ${m.faces.indexOf(f) + 1}`, tone: "face" as const })),
    ...d.people.filter((p) => p.face).map((p) => ({ key: `p${p.personId}`, box: p.face as Box, label: p.name, tone: "person" as const })),
    ...d.objects.filter((o) => o.box).map((o) => ({ key: `o${o.id}`, box: o.box as Box, label: o.label, tone: "object" as const })),
    ...(m.ai.objects ?? []).filter((o) => o.status === "pending").map((o, i) => ({ key: `ai${i}`, box: o.box, label: `AI: ${o.label}`, tone: "ai" as const })),
  ];

  async function uploadAudio(file: File, title: string) {
    const fd = new FormData();
    fd.set("file", file);
    fd.set("title", title || `Sound for ${m.title}`);
    fd.set("category", m.category);
    fd.set("language", m.language);
    fd.set("linkedMemoryId", m.id);
    fd.set("mediaType", "audio");
    await api(`/api/caregiver/patients/${patientId}/memories`, { form: fd });
    await refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link href={`/caregiver/patients/${patientId}/memories`} className="cg-btn">
          ← All memories
        </Link>
        <h2 className="min-w-0 flex-1 truncate text-xl font-extrabold">{m.title || "Untitled memory"}</h2>
        <StatusBadge status={m.status} />
        {m.status !== "approved" && (
          <button className="cg-btn cg-btn-primary" disabled={!!busy || m.sensitive} onClick={() => setStatus("approved")} title={m.sensitive ? "Sensitive memories are never used in activities" : ""}>
            ✓ Approve for activities
          </button>
        )}
        {m.status !== "excluded" && (
          <button className="cg-btn" disabled={!!busy} onClick={() => setStatus("excluded")}>
            Keep out of activities
          </button>
        )}
        {m.status !== "pending" && (
          <button className="cg-btn" disabled={!!busy} onClick={() => setStatus("pending")}>
            Back to review
          </button>
        )}
      </div>
      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-5">
          <Section
            title={m.mediaType === "audio" ? "Sound" : "Photo"}
            description={
              m.mediaType === "photo"
                ? draw
                  ? draw === "face"
                    ? "Drag a box around the person's face."
                    : "Drag a box around the thing you want to name."
                  : "Blue boxes are faces Cloudinary detected. Name the people in them below — identities always come from you."
                : undefined
            }
            actions={
              m.mediaType === "photo" && (
                <>
                  <button className={`cg-btn ${draw === "face" ? "!border-sky-deep !bg-sky/40" : ""}`} onClick={() => setDraw(draw === "face" ? null : "face")}>
                    🙂 Draw a face box
                  </button>
                  <button className={`cg-btn ${draw === "object" ? "!border-gold-deep !bg-gold/40" : ""}`} onClick={() => setDraw(draw === "object" ? null : "object")}>
                    🔖 Mark a thing
                  </button>
                </>
              )
            }
          >
            {m.mediaType === "audio" ? (
              d.audio ? <audio src={d.audio} controls className="w-full" /> : <Notice tone="warn">Cloudinary is not configured.</Notice>
            ) : d.previews ? (
              m.mediaType === "video" && d.previews.video ? (
                <video src={d.previews.video} poster={d.previews.display.src} controls className="w-full rounded-xl" />
              ) : (
                <BoxCanvas
                  image={d.previews.display}
                  width={W}
                  height={H}
                  overlays={overlays}
                  drawing={!!draw}
                  onDrawn={(box) => {
                    setPendingBox({ mode: draw!, box });
                    if (draw === "face") setAssign({ box });
                    setDraw(null);
                  }}
                />
              )
            ) : (
              <Notice tone="warn">Previews need Cloudinary credentials.</Notice>
            )}
            {pendingBox?.mode === "object" && (
              <form
                className="mt-3 flex flex-wrap items-end gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void act("object", async () => {
                    await api(`${base}/objects`, { body: { label: objectLabel, box: pendingBox.box } });
                    setPendingBox(null);
                    setObjectLabel("");
                    await refresh();
                  });
                }}
              >
                <Field label="What is in the box?" htmlFor="objlabel">
                  <input id="objlabel" className="cg-input" autoFocus value={objectLabel} onChange={(e) => setObjectLabel(e.target.value)} placeholder="e.g. brass lamp, red saree, teacup" />
                </Field>
                <button className="cg-btn cg-btn-primary" disabled={!objectLabel.trim() || busy === "object"}>
                  Save
                </button>
                <button type="button" className="cg-btn" onClick={() => setPendingBox(null)}>
                  Cancel
                </button>
              </form>
            )}
          </Section>

          {m.mediaType === "photo" && (
            <Section title="People in this photo" description="Used by Who Is This?, face ↔ name matching and family albums. Only names you give are ever shown.">
              {d.previews && d.previews.faces.length > 0 && (
                <div className="mb-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-faint">Faces Cloudinary detected</p>
                  <ul className="flex flex-wrap gap-3">
                    {d.previews.faces.map((f) => {
                      const named = d.people.find((p) => p.face && Math.abs(p.face.x - f.box.x) < 4 && Math.abs(p.face.y - f.box.y) < 4);
                      return (
                        <li key={f.index} className="flex w-32 flex-col items-center gap-1 text-center">
                          <CloudImage image={f.image} className="h-24 w-24 rounded-full border-2 border-sky-deep" />
                          {named ? (
                            <span className="text-xs font-bold text-sage-deep">✓ {named.name}</span>
                          ) : (
                            <button className="cg-btn !min-h-8 !px-2 text-xs" onClick={() => setAssign({ box: f.box })}>
                              Who is this?
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              {d.people.length > 0 && (
                <ul className="mb-3 flex flex-col gap-2">
                  {d.people.map((p) => (
                    <li key={p.personId} className="flex items-center gap-3 rounded-lg border border-[#e7e0d3] p-2">
                      {p.faceImage && <CloudImage image={p.faceImage} className="h-12 w-12 rounded-full" />}
                      <span className="flex-1 text-sm">
                        <b>{p.name}</b> {p.relationship && <span className="text-ink-soft">— {p.relationship}</span>}
                        {!p.face && <span className="text-xs text-ink-faint"> (no face box)</span>}
                      </span>
                      <button
                        className="cg-btn cg-btn-danger !min-h-8 !px-2 text-xs"
                        onClick={() => act("rmperson", async () => {
                          await api(`${base}/people`, { method: "DELETE", body: { personId: p.personId } });
                          await refresh();
                        })}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <button className="cg-btn" onClick={() => setAssign({ box: null })}>
                + Add a person to this photo
              </button>
              {assign && (
                <AssignPerson
                  people={d.allPeople}
                  onCancel={() => {
                    setAssign(null);
                    setPendingBox(null);
                  }}
                  onSave={(payload) =>
                    act("assign", async () => {
                      await api(`${base}/people`, { body: { ...payload, face: assign.box } });
                      setAssign(null);
                      setPendingBox(null);
                      await refresh();
                    }, "Person saved and Cloudinary metadata updated.")
                  }
                />
              )}
            </Section>
          )}

          {m.mediaType === "photo" && (
            <Section
              title="Things in this photo"
              description="Caregiver-verified details for Remember the Scene. Things with a box can also hide in What's Missing? and be matched as crops."
            >
              {d.objects.length > 0 ? (
                <ul className="mb-3 flex flex-wrap gap-2">
                  {d.objects.map((o) => (
                    <li key={o.id} className="flex items-center gap-2 rounded-full border border-[#e7e0d3] bg-white py-1 pl-3 pr-1 text-sm">
                      {o.box ? "🔖" : "🏷️"} {o.label}
                      {o.source === "ai" && <span className="text-xs text-lavender-deep">AI</span>}
                      <button
                        className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-cg-bg"
                        aria-label={`Remove ${o.label}`}
                        onClick={() => act("rmobj", async () => {
                          await api(`${base}/objects`, { method: "DELETE", body: { objectId: o.id } });
                          await refresh();
                        })}
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mb-3 text-sm text-ink-soft">No things named yet. Use “Mark a thing” to draw a box, or add a label without a box.</p>
              )}
              <form
                className="flex flex-wrap gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const input = (e.currentTarget.elements.namedItem("label") as HTMLInputElement) ?? null;
                  const label = input?.value.trim();
                  if (!label) return;
                  void act("obj2", async () => {
                    await api(`${base}/objects`, { body: { label } });
                    input.value = "";
                    await refresh();
                  });
                }}
              >
                <input name="label" className="cg-input !w-auto flex-1" placeholder="Add a label without a box (e.g. wedding cake)" aria-label="Thing in the photo" />
                <button className="cg-btn">Add</button>
              </form>
            </Section>
          )}

          {d.previews && m.mediaType === "photo" && (
            <Section title="How this photo appears in activities" description="Live, signed Cloudinary transformations generated for this memory.">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-faint">Memory Reveal — progressive blur</p>
              <div className="mb-4 grid grid-cols-4 gap-2">
                {d.previews.blur.map((b) => (
                  <figure key={b.strength} className="flex flex-col gap-1">
                    <CloudImage image={b.image} className="aspect-square w-full rounded-lg" />
                    <figcaption className="text-center font-mono text-[11px] text-ink-soft">{b.strength ? `e_blur:${b.strength}` : "clear"}</figcaption>
                  </figure>
                ))}
              </div>
              {d.previews.autoFace && (
                <>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-faint">Face-focused crops</p>
                  <div className="mb-4 flex flex-wrap gap-2">
                    {d.people.filter((p) => p.faceImage).map((p) => (
                      <figure key={p.personId} className="flex w-24 flex-col items-center gap-1">
                        <CloudImage image={p.faceImage!} className="h-24 w-24 rounded-xl" />
                        <figcaption className="text-center text-[11px] text-ink-soft">{p.name}</figcaption>
                      </figure>
                    ))}
                    <figure className="flex w-24 flex-col items-center gap-1">
                      <CloudImage image={d.previews.autoFace} className="h-24 w-24 rounded-xl" />
                      <figcaption className="text-center font-mono text-[11px] text-ink-soft">c_thumb,g_face</figcaption>
                    </figure>
                  </div>
                </>
              )}
              {d.previews.objects.length > 0 && (
                <>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-faint">What&apos;s Missing? — object crop and region blur</p>
                  <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {d.previews.objects.slice(0, 3).map((o) => (
                      <figure key={o.id} className="flex flex-col gap-1">
                        <div className="grid grid-cols-2 gap-1">
                          <CloudImage image={o.crop} className="aspect-square w-full rounded-lg" />
                          <CloudImage image={o.hidden} className="aspect-square w-full rounded-lg" />
                        </div>
                        <figcaption className="text-center text-[11px] text-ink-soft">{o.label}</figcaption>
                      </figure>
                    ))}
                  </div>
                </>
              )}
              {d.previews.puzzle && (
                <>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-faint">Picture Puzzle — signed tile crops</p>
                  <div className="grid max-w-xs grid-cols-2 gap-1">
                    {d.previews.puzzle.tiles.map((tile, i) => (
                      <CloudImage key={i} image={tile} className="w-full rounded" style={{ aspectRatio: `${d.previews!.puzzle!.width / 2} / ${d.previews!.puzzle!.height / 2}` }} />
                    ))}
                  </div>
                </>
              )}
            </Section>
          )}
        </div>

        <div className="flex flex-col gap-5">
          <Section title="Details" description="Short, familiar wording works best. The name is shown as an answer in activities.">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Short name *" htmlFor="title" hint="e.g. “Lakshmi's wedding”, “Our house in Guntur”">
                  <input id="title" className="cg-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </Field>
              </div>
              <Field label="Category" htmlFor="cat">
                <select id="cat" className="cg-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Category })}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_INFO[c].icon} {CATEGORY_INFO[c].label.en}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Event" htmlFor="event">
                <input id="event" className="cg-input" value={form.event} onChange={(e) => setForm({ ...form, event: e.target.value })} />
              </Field>
              <Field label="Year" htmlFor="year" hint="Used for life timelines">
                <input id="year" className="cg-input" inputMode="numeric" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value.replace(/\D/g, "").slice(0, 4) })} />
              </Field>
              <Field label="Or roughly when" htmlFor="approx">
                <input id="approx" className="cg-input" value={form.approxDate} onChange={(e) => setForm({ ...form, approxDate: e.target.value })} placeholder="Summer of 1975" />
              </Field>
              <Field label="Place" htmlFor="loc">
                <input id="loc" className="cg-input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </Field>
              <Field label="Language of the name & caption" htmlFor="lang">
                <select id="lang" className="cg-input" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
                  <option value="en">English</option>
                  <option value="te">తెలుగు</option>
                </select>
              </Field>
              <div className="sm:col-span-2">
                <Field label="Caption (approved)" htmlFor="cap" hint="Read aloud in stories. Nothing here is generated automatically.">
                  <textarea id="cap" className="cg-input min-h-20" value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <span className="cg-label">How special is this memory?</span>
                <div className="flex gap-1" role="radiogroup" aria-label="Importance">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} role="radio" aria-checked={form.importance === n} className={`text-2xl ${n <= form.importance ? "" : "opacity-25"}`} onClick={() => setForm({ ...form, importance: n })}>
                      💛
                    </button>
                  ))}
                </div>
              </div>
              <div className="sm:col-span-2">
                <span className="cg-label">Tags</span>
                <div className="flex flex-wrap items-center gap-2">
                  {form.tags.map((t) => (
                    <span key={t} className="flex items-center gap-1 rounded-full bg-cg-bg py-1 pl-3 pr-1 text-sm">
                      {t}
                      <button className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-white" onClick={() => setForm({ ...form, tags: form.tags.filter((x) => x !== t) })} aria-label={`Remove ${t}`}>
                        ✕
                      </button>
                    </span>
                  ))}
                  <input
                    className="cg-input !w-40 !py-1"
                    list="tag-suggestions-2"
                    value={tagDraft}
                    placeholder="add tag…"
                    onChange={(e) => setTagDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.key === "Enter" || e.key === ",") && tagDraft.trim()) {
                        e.preventDefault();
                        const tag = tagDraft.trim().toLowerCase();
                        if (!form.tags.includes(tag)) setForm({ ...form, tags: [...form.tags, tag] });
                        setTagDraft("");
                      }
                    }}
                    aria-label="Add tag"
                  />
                  <datalist id="tag-suggestions-2">
                    {SUGGESTED_TAGS.map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                </div>
              </div>
              <div className="sm:col-span-2">
                <Toggle
                  checked={form.sensitive}
                  onChange={(v) => setForm({ ...form, sensitive: v })}
                  label="Sensitive — never use in activities"
                  description="For memories that might upset (a loss, an illness). They stay in the library only."
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button className="cg-btn cg-btn-primary" disabled={!dirty || busy === "save"} onClick={save}>
                {busy === "save" ? "Saving…" : "Save details"}
              </button>
            </div>
          </Section>

          {m.ai && (d.aiAvailable || m.ai.caption || m.ai.objects?.length || m.ai.error) && m.mediaType === "photo" && (
            <Section title="✨ Suggestions from Cloudinary AI" description="Optional add-ons. Nothing is used until you approve it.">
              {m.ai.error && <Notice tone="warn">{m.ai.error}</Notice>}
              {m.ai.caption && m.ai.caption.status === "pending" && (
                <div className="mt-2 rounded-lg border border-[#d9ccf4] bg-[#f7f3fd] p-3">
                  <p className="text-sm">
                    Suggested caption: <i>“{m.ai.caption.text}”</i>
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button className="cg-btn cg-btn-primary !min-h-8 text-xs" onClick={() => act("ai", async () => { await api(`${base}/ai`, { method: "PATCH", body: { caption: { action: "approve" } } }); await refresh(); })}>
                      Use this caption
                    </button>
                    <button className="cg-btn !min-h-8 text-xs" onClick={() => setForm({ ...form, caption: m.ai.caption!.text })}>
                      Edit first
                    </button>
                    <button className="cg-btn !min-h-8 text-xs" onClick={() => act("ai", async () => { await api(`${base}/ai`, { method: "PATCH", body: { caption: { action: "dismiss" } } }); await refresh(); })}>
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
              {(m.ai.objects ?? []).some((o) => o.status === "pending") && (
                <ul className="mt-3 flex flex-col gap-2">
                  {(m.ai.objects ?? []).map((o, i) =>
                    o.status === "pending" ? (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <span className="flex-1">
                          {o.label} <span className="text-xs text-ink-faint">({Math.round(o.confidence * 100)}% confident)</span>
                        </span>
                        <button className="cg-btn !min-h-8 text-xs" onClick={() => act("ai", async () => { await api(`${base}/ai`, { method: "PATCH", body: { object: { index: i, action: "accept" } } }); await refresh(); })}>
                          It&apos;s right
                        </button>
                        <button className="cg-btn !min-h-8 text-xs" onClick={() => act("ai", async () => { await api(`${base}/ai`, { method: "PATCH", body: { object: { index: i, action: "dismiss" } } }); await refresh(); })}>
                          Dismiss
                        </button>
                      </li>
                    ) : null,
                  )}
                </ul>
              )}
              {d.aiAvailable && (
                <button className="cg-btn mt-3" disabled={busy === "ai-run"} onClick={() => act("ai-run", async () => { await api(`${base}/ai`, { body: {} }); await refresh(); }, "Suggestions requested.")}>
                  {busy === "ai-run" ? "Asking Cloudinary…" : "Ask for suggestions"}
                </button>
              )}
            </Section>
          )}

          {m.mediaType !== "audio" && (
            <Section title="Sounds for this memory" description="Familiar music or a recorded greeting. Used by Sound and Memory.">
              {d.audioClips.length > 0 && (
                <ul className="mb-3 flex flex-col gap-2">
                  {d.audioClips.map((a) => (
                    <li key={a.id} className="flex flex-wrap items-center gap-2 text-sm">
                      <Link href={`/caregiver/patients/${patientId}/memories/${a.id}`} className="font-bold underline">
                        {a.title || "Sound"}
                      </Link>
                      <StatusBadge status={a.status} />
                      {a.src && <audio src={a.src} controls className="h-9" />}
                    </li>
                  ))}
                </ul>
              )}
              <AudioAdder onUpload={(file, title) => act("audio", () => uploadAudio(file, title), "Sound uploaded. Approve it to use it in activities.")} />
            </Section>
          )}

          <Section title="☁️ Cloudinary" description="Where this memory lives and how it is found.">
            <dl className="grid gap-2 text-sm">
              <Info label="Public ID" value={m.publicId} mono />
              <Info label="Folder" value={m.assetFolder ?? "—"} mono />
              <Info label="Delivery" value={`${m.resourceType} · ${m.deliveryType}${m.deliveryType === "authenticated" ? " (signed URLs only)" : ""}`} />
              <Info label="Size" value={[m.width && m.height ? `${m.width}×${m.height}` : null, m.format, m.bytes ? `${Math.round(m.bytes / 1024)} KB` : null, m.duration ? `${Math.round(m.duration)}s` : null].filter(Boolean).join(" · ")} />
              <Info label="Structured metadata" value={m.sync.metadataSynced ? `Synced ${m.sync.syncedAt ? new Date(m.sync.syncedAt).toLocaleString() : ""}` : `Not synced${m.sync.error ? ` — ${m.sync.error}` : ""}`} bad={!m.sync.metadataSynced} />
              <Info label="Search API" value={m.sync.searchIndexedAt ? `Found in search (${new Date(m.sync.searchIndexedAt).toLocaleString()})` : m.sync.searchCheckedAt ? "Not in the search index yet — usually takes a few seconds" : "Not checked yet"} />
            </dl>
            <button
              className="cg-btn mt-3"
              disabled={busy === "sync"}
              onClick={() => act("sync", async () => { await api(`${base}/sync`, { body: {} }); await refresh(); }, "Re-synced and checked the search index.")}
            >
              {busy === "sync" ? "Checking…" : "Re-sync & check Search"}
            </button>
          </Section>

          <Section title="Remove">
            <button
              className="cg-btn cg-btn-danger"
              disabled={busy === "delete"}
              onClick={() => {
                if (!confirm("Delete this memory from Memory Garden and from Cloudinary? This can't be undone.")) return;
                void act("delete", async () => {
                  await api(base, { method: "DELETE" });
                  router.push(`/caregiver/patients/${patientId}/memories`);
                  router.refresh();
                });
              }}
            >
              Delete this memory
            </button>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value, mono, bad }: { label: string; value: string; mono?: boolean; bad?: boolean }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-2">
      <dt className="text-xs font-bold uppercase tracking-wide text-ink-faint">{label}</dt>
      <dd className={`${mono ? "break-all font-mono text-xs" : ""} ${bad ? "text-coral-deep" : ""}`}>{value}</dd>
    </div>
  );
}

function AssignPerson({
  people,
  onSave,
  onCancel,
}: {
  people: { id: string; name: string; relationship: string }[];
  onSave: (payload: { personId?: string; newPerson?: { name: string; relationshipKey: string; relationshipLabel?: string | null } }) => void;
  onCancel: () => void;
}) {
  const [personId, setPersonId] = useState(people[0]?.id ?? "new");
  const [name, setName] = useState("");
  const [rel, setRel] = useState("daughter");
  const [custom, setCustom] = useState("");
  return (
    <div className="mt-3 flex flex-col gap-3 rounded-xl border border-[#bcdcf1] bg-[#f3f9fd] p-3">
      <Field label="Who is this?" htmlFor="who">
        <select id="who" className="cg-input" value={personId} onChange={(e) => setPersonId(e.target.value)}>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.relationship ? ` — ${p.relationship}` : ""}
            </option>
          ))}
          <option value="new">+ Someone new…</option>
        </select>
      </Field>
      {personId === "new" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name" htmlFor="pname">
            <input id="pname" className="cg-input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </Field>
          <Field label="Relationship to them" htmlFor="prel">
            <select id="prel" className="cg-input" value={rel} onChange={(e) => setRel(e.target.value)}>
              {RELATIONSHIPS.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label.en} · {r.label.te}
                </option>
              ))}
              <option value="custom">Other (write it)</option>
            </select>
          </Field>
          {rel === "custom" && (
            <div className="sm:col-span-2">
              <Field label="Relationship in your words" htmlFor="pcustom">
                <input id="pcustom" className="cg-input" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="e.g. childhood friend from the village" />
              </Field>
            </div>
          )}
        </div>
      )}
      <div className="flex justify-end gap-2">
        <button className="cg-btn" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="cg-btn cg-btn-primary"
          disabled={personId === "new" && !name.trim()}
          onClick={() =>
            onSave(personId === "new" ? { newPerson: { name, relationshipKey: rel, relationshipLabel: rel === "custom" ? custom : null } } : { personId })
          }
        >
          Save
        </button>
      </div>
    </div>
  );
}

function AudioAdder({ onUpload }: { onUpload: (file: File, title: string) => void }) {
  const [title, setTitle] = useState("");
  return (
    <div className="flex flex-col gap-3">
      <Field label="Name for the sound" htmlFor="atitle" hint="e.g. “Ravi says hello”, “Amma's favourite song”">
        <input id="atitle" className="cg-input" value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <div className="flex flex-wrap items-center gap-2">
        <label className="cg-btn cursor-pointer">
          📁 Upload a sound file
          <input
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f, title);
              e.target.value = "";
            }}
          />
        </label>
        <VoiceRecorder onRecorded={(f) => onUpload(f, title)} />
      </div>
    </div>
  );
}
