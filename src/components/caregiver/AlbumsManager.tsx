"use client";

import { useMemo, useState } from "react";
import { CloudImage } from "@/components/ui/CloudImage";
import { api, errorText } from "@/lib/client/api";
import { CATEGORY_INFO } from "@/lib/content/categories";
import type { listCollections, listDailyPairs } from "@/lib/services/caregiver";
import { CATEGORIES, type Category } from "@/lib/types";
import type { LibraryItem } from "./MemoryLibrary";
import { Empty, Field, Notice, Section, StatusBadge } from "./ui";

type Collection = Awaited<ReturnType<typeof listCollections>>[number];
type Pair = Awaited<ReturnType<typeof listDailyPairs>>[number];
type Draft = {
  id?: string;
  kind: "album" | "story";
  title: string;
  description: string;
  category: Category | "";
  items: { memoryId: string; caption: string; narrationMemoryId: string }[];
};

export function AlbumsManager({
  patientId,
  initialCollections,
  initialPairs,
  memories,
}: {
  patientId: string;
  initialCollections: Collection[];
  initialPairs: Pair[];
  memories: LibraryItem[];
}) {
  const [collections, setCollections] = useState(initialCollections);
  const [pairs, setPairs] = useState(initialPairs);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const base = `/api/caregiver/patients/${patientId}`;
  const visual = memories.filter((m) => m.mediaType !== "audio");
  const audio = memories.filter((m) => m.mediaType === "audio");
  const photos = memories.filter((m) => m.mediaType === "photo");
  const byId = useMemo(() => new Map(memories.map((m) => [m.id, m])), [memories]);

  async function reload() {
    const [c, p] = await Promise.all([api<{ collections: Collection[] }>(`${base}/collections`), api<{ pairs: Pair[] }>(`${base}/daily-pairs`)]);
    setCollections(c.collections);
    setPairs(p.pairs);
  }

  async function saveDraft() {
    if (!draft) return;
    setError(null);
    const body = {
      kind: draft.kind,
      title: draft.title,
      description: draft.description || null,
      category: draft.category || null,
      items: draft.items.map((i) => ({ memoryId: i.memoryId, caption: i.caption || null, narrationMemoryId: i.narrationMemoryId || null })),
    };
    try {
      if (draft.id) await api(`${base}/collections/${draft.id}`, { method: "PUT", body });
      else await api(`${base}/collections`, { body });
      setDraft(null);
      await reload();
    } catch (e) {
      setError(errorText(e));
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Section
        title="Albums & stories"
        description="A story shows photos one at a time with your captions (read aloud, or your own recorded narration). An album with 4 or more approved photos becomes a new trail on the adventure map."
        actions={
          <>
            <button className="cg-btn" onClick={() => setDraft({ kind: "album", title: "", description: "", category: "", items: [] })}>
              + New album
            </button>
            <button className="cg-btn cg-btn-primary" onClick={() => setDraft({ kind: "story", title: "", description: "", category: "", items: [] })}>
              + New story
            </button>
          </>
        }
      >
        {error && <Notice tone="error">{error}</Notice>}
        {draft && (
          <div className="mb-5 flex flex-col gap-4 rounded-xl border border-[#bcdcf1] bg-[#f3f9fd] p-4">
            <div className="grid gap-3 sm:grid-cols-4">
              <Field label="Type" htmlFor="dkind">
                <select id="dkind" className="cg-input" value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as Draft["kind"] })}>
                  <option value="story">Story</option>
                  <option value="album">Album</option>
                </select>
              </Field>
              <div className="sm:col-span-2">
                <Field label="Title" htmlFor="dtitle">
                  <input id="dtitle" className="cg-input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Our trip to Tirupati" />
                </Field>
              </div>
              <Field label="Theme (optional)" htmlFor="dcat" hint="Stories with a theme appear in that world first">
                <select id="dcat" className="cg-input" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as Category | "" })}>
                  <option value="">Any</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_INFO[c].label.en}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div>
              <p className="cg-label">Choose memories (tap to add, in order)</p>
              {visual.length === 0 ? (
                <p className="text-sm text-ink-soft">Upload some photos first.</p>
              ) : (
                <ul className="grid max-h-72 grid-cols-4 gap-2 overflow-y-auto rounded-lg bg-white p-2 sm:grid-cols-6 lg:grid-cols-8">
                  {visual.map((m) => {
                    const pos = draft.items.findIndex((i) => i.memoryId === m.id);
                    return (
                      <li key={m.id}>
                        <button
                          type="button"
                          className={`relative w-full overflow-hidden rounded-lg border-2 ${pos >= 0 ? "border-sage-deep" : "border-transparent"}`}
                          onClick={() =>
                            setDraft({
                              ...draft,
                              items: pos >= 0 ? draft.items.filter((i) => i.memoryId !== m.id) : [...draft.items, { memoryId: m.id, caption: "", narrationMemoryId: "" }],
                            })
                          }
                          title={m.title}
                          aria-pressed={pos >= 0}
                        >
                          {m.thumb ? <CloudImage image={m.thumb} className="aspect-square w-full" /> : <div className="aspect-square w-full bg-cg-bg" />}
                          {pos >= 0 && <span className="absolute left-1 top-1 rounded-full bg-sage-deep px-1.5 text-xs font-bold text-white">{pos + 1}</span>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {draft.items.length > 0 && (
              <ol className="flex flex-col gap-2">
                {draft.items.map((item, i) => {
                  const m = byId.get(item.memoryId);
                  return (
                    <li key={item.memoryId} className="flex flex-wrap items-center gap-2 rounded-lg bg-white p-2">
                      <span className="w-6 text-center font-bold">{i + 1}</span>
                      {m?.thumb && <CloudImage image={m.thumb} className="h-12 w-12 rounded" />}
                      <span className="w-40 truncate text-sm font-bold">{m?.title}</span>
                      {m && m.status !== "approved" && <StatusBadge status={m.status} />}
                      {draft.kind === "story" && (
                        <>
                          <input
                            className="cg-input !w-auto flex-1 !py-1.5"
                            placeholder={m?.caption || "Caption for this page (uses the memory's caption if empty)"}
                            value={item.caption}
                            onChange={(e) => setDraft({ ...draft, items: draft.items.map((x, j) => (j === i ? { ...x, caption: e.target.value } : x)) })}
                            aria-label="Caption"
                          />
                          <select
                            className="cg-input !w-auto !py-1.5"
                            value={item.narrationMemoryId}
                            onChange={(e) => setDraft({ ...draft, items: draft.items.map((x, j) => (j === i ? { ...x, narrationMemoryId: e.target.value } : x)) })}
                            aria-label="Narration"
                          >
                            <option value="">No recorded narration</option>
                            {audio.map((a) => (
                              <option key={a.id} value={a.id}>
                                🎵 {a.title}
                              </option>
                            ))}
                          </select>
                        </>
                      )}
                      <div className="ml-auto flex gap-1">
                        <button type="button" className="cg-btn !min-h-8 !px-2" disabled={i === 0} onClick={() => setDraft({ ...draft, items: move(draft.items, i, i - 1) })} aria-label="Move up">
                          ↑
                        </button>
                        <button
                          type="button"
                          className="cg-btn !min-h-8 !px-2"
                          disabled={i === draft.items.length - 1}
                          onClick={() => setDraft({ ...draft, items: move(draft.items, i, i + 1) })}
                          aria-label="Move down"
                        >
                          ↓
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
            <p className="text-xs text-ink-soft">Only approved memories appear in activities; others wait until you approve them.</p>
            <div className="flex justify-end gap-2">
              <button className="cg-btn" onClick={() => setDraft(null)}>
                Cancel
              </button>
              <button className="cg-btn cg-btn-primary" disabled={!draft.title.trim()} onClick={saveDraft}>
                Save {draft.kind}
              </button>
            </div>
          </div>
        )}

        {collections.length === 0 ? (
          !draft && (
            <Empty icon="📖" title="No albums or stories yet">
              A short story of 4–6 photos with simple captions (“This is our house in Guntur. We planted the mango tree in 1978.”) is lovely for Memory
              Story.
            </Empty>
          )
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {collections.map((c) => (
              <li key={c.id} className="flex flex-col gap-2 rounded-xl border border-[#e7e0d3] bg-white p-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-cg-bg px-2 py-0.5 text-xs font-bold uppercase">{c.kind}</span>
                  <p className="flex-1 truncate font-bold">{c.title}</p>
                  <span className="text-xs text-ink-soft">{c.items.length} memories</span>
                </div>
                <div className="flex gap-1 overflow-hidden">
                  {c.items.slice(0, 8).map((i) => (i.thumb ? <CloudImage key={i.id} image={i.thumb} className="h-14 w-14 shrink-0 rounded" /> : null))}
                </div>
                <div className="flex gap-2">
                  <button
                    className="cg-btn !min-h-8 text-xs"
                    onClick={() =>
                      setDraft({
                        id: c.id,
                        kind: c.kind,
                        title: c.title,
                        description: c.description ?? "",
                        category: (c.category as Category) ?? "",
                        items: c.items.map((i) => ({ memoryId: i.memoryId, caption: i.caption ?? "", narrationMemoryId: i.narrationMemoryId ?? "" })),
                      })
                    }
                  >
                    Edit
                  </button>
                  <button
                    className="cg-btn cg-btn-danger !min-h-8 text-xs"
                    onClick={async () => {
                      if (!confirm(`Delete “${c.title}”? The memories themselves stay.`)) return;
                      await api(`${base}/collections/${c.id}`, { method: "DELETE" });
                      await reload();
                    }}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <DailyPairs base={base} photos={photos} pairs={pairs} onChange={reload} />
    </div>
  );
}

function move<T>(list: T[], from: number, to: number) {
  const next = list.slice();
  const [x] = next.splice(from, 1);
  next.splice(to, 0, x);
  return next;
}

function DailyPairs({ base, photos, pairs, onChange }: { base: string; photos: LibraryItem[]; pairs: Pair[]; onChange: () => Promise<void> }) {
  const [form, setForm] = useState({ leftMemoryId: "", leftLabel: "", rightMemoryId: "", rightLabel: "" });
  const [error, setError] = useState<string | null>(null);
  return (
    <Section
      title="Daily Life pairs"
      description="Pairs made from their own photos — their teacup and their kitchen, their walking stick and the garden path. Used before the illustrated starter cards."
    >
      {photos.length < 2 ? (
        <p className="text-sm text-ink-soft">Upload at least two photos to make a pair.</p>
      ) : (
        <form
          className="grid gap-3 sm:grid-cols-5"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            try {
              await api(`${base}/daily-pairs`, { body: form });
              setForm({ leftMemoryId: "", leftLabel: "", rightMemoryId: "", rightLabel: "" });
              await onChange();
            } catch (err) {
              setError(errorText(err));
            }
          }}
        >
          <Field label="Photo of the thing" htmlFor="lp">
            <select id="lp" className="cg-input" value={form.leftMemoryId} onChange={(e) => setForm({ ...form, leftMemoryId: e.target.value })} required>
              <option value="">Choose…</option>
              {photos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title || "Untitled"}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Its name" htmlFor="ll">
            <input id="ll" className="cg-input" value={form.leftLabel} onChange={(e) => setForm({ ...form, leftLabel: e.target.value })} placeholder="Amma's teacup" required />
          </Field>
          <Field label="Goes with (photo)" htmlFor="rp">
            <select id="rp" className="cg-input" value={form.rightMemoryId} onChange={(e) => setForm({ ...form, rightMemoryId: e.target.value })} required>
              <option value="">Choose…</option>
              {photos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title || "Untitled"}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Its name" htmlFor="rl">
            <input id="rl" className="cg-input" value={form.rightLabel} onChange={(e) => setForm({ ...form, rightLabel: e.target.value })} placeholder="Our kitchen" required />
          </Field>
          <div className="flex items-end">
            <button className="cg-btn cg-btn-primary w-full">Add pair</button>
          </div>
        </form>
      )}
      {error && (
        <div className="mt-3">
          <Notice tone="error">{error}</Notice>
        </div>
      )}
      {pairs.length > 0 && (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {pairs.map((p) => (
            <li key={p.id} className="flex items-center gap-2 rounded-lg border border-[#e7e0d3] bg-white p-2 text-sm">
              {p.left && <CloudImage image={p.left} className="h-12 w-12 rounded" />}
              <span className="font-bold">{p.leftLabel}</span>
              <span>↔</span>
              {p.right && <CloudImage image={p.right} className="h-12 w-12 rounded" />}
              <span className="font-bold">{p.rightLabel}</span>
              {!p.ready && <span className="text-xs text-[#7f5a08]">(photos need approval)</span>}
              <button
                className="cg-btn cg-btn-danger ml-auto !min-h-8 !px-2 text-xs"
                onClick={async () => {
                  await api(`${base}/daily-pairs/${p.id}`, { method: "DELETE" });
                  await onChange();
                }}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
