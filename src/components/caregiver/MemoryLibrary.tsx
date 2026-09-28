"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import { CloudImage } from "@/components/ui/CloudImage";
import { api, errorText } from "@/lib/client/api";
import { CATEGORY_INFO, SUGGESTED_TAGS } from "@/lib/content/categories";
import { CATEGORIES, type Category, type Img, type SyncInfo } from "@/lib/types";
import { Empty, Field, Notice, Section, StatusBadge } from "./ui";

export type LibraryItem = {
  id: string;
  mediaType: "photo" | "video" | "audio";
  title: string;
  category: string;
  event: string | null;
  year: number | null;
  status: "pending" | "approved" | "excluded";
  sensitive: boolean;
  gameEligible: boolean;
  favorite: boolean;
  importance: number;
  tags: string[];
  caption: string | null;
  hasAiSuggestion: boolean;
  people: string[];
  faces: number;
  objects: number;
  linkedMemoryId: string | null;
  sync: SyncInfo;
  createdAt: string;
  thumb: Img | null;
  audio: string | null;
};

type UploadRow = { key: string; file: File; title: string; state: "ready" | "uploading" | "done" | "error"; message?: string };

const titleFromFile = (name: string) =>
  name
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/^(img|dsc|pxl|vid|wa)[-_]?\d+[-_]?(wa)?\d*$/i, "")
    .replace(/[-_]+/g, " ")
    .trim();

export function MemoryLibrary({
  patientId,
  patientCode,
  initialItems,
  initialStatus,
  cloudinaryReady,
}: {
  patientId: string;
  patientCode: string;
  initialItems: LibraryItem[];
  initialStatus: "all" | "pending" | "approved" | "excluded";
  cloudinaryReady: boolean;
}) {
  const [items, setItems] = useState(initialItems);
  const [status, setStatus] = useState(initialStatus);
  const [category, setCategory] = useState("");
  const [media, setMedia] = useState("");
  const [q, setQ] = useState("");
  const [showUpload, setShowUpload] = useState(initialItems.length === 0);
  const [search, setSearch] = useState<{ expression: string; total: number; items: LibraryItem[] } | null>(null);
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [sq, setSq] = useState({ q: "", tag: "", category: "", yearFrom: "", yearTo: "", eligible: false });
  const base = `/api/caregiver/patients/${patientId}`;

  const reload = useCallback(async () => {
    const res = await api<{ items: LibraryItem[] }>(`${base}/memories`);
    setItems(res.items);
  }, [base]);

  const counts = useMemo(
    () => ({
      all: items.length,
      pending: items.filter((i) => i.status === "pending").length,
      approved: items.filter((i) => i.status === "approved").length,
      excluded: items.filter((i) => i.status === "excluded").length,
    }),
    [items],
  );

  const visible = useMemo(() => {
    const text = q.trim().toLowerCase();
    return items.filter(
      (i) =>
        (status === "all" || i.status === status) &&
        (!category || i.category === category) &&
        (!media || i.mediaType === media) &&
        (!text || [i.title, i.event, i.caption, ...i.people, ...i.tags].some((s) => s?.toLowerCase().includes(text))),
    );
  }, [items, status, category, media, q]);

  async function setItemStatus(id: string, next: "approved" | "excluded" | "pending") {
    try {
      await api(`${base}/memories/${id}/status`, { body: { status: next } });
      setItems((list) => list.map((i) => (i.id === id ? { ...i, status: next, gameEligible: next === "approved" && !i.sensitive } : i)));
    } catch (e) {
      alert(errorText(e));
    }
  }

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchBusy(true);
    setSearchError(null);
    const params = new URLSearchParams();
    if (sq.q) params.set("q", sq.q);
    if (sq.tag) params.set("tag", sq.tag);
    if (sq.category) params.set("category", sq.category);
    if (sq.yearFrom) params.set("yearFrom", sq.yearFrom);
    if (sq.yearTo) params.set("yearTo", sq.yearTo);
    if (sq.eligible) params.set("eligible", "1");
    try {
      setSearch(await api(`${base}/memories/search?${params.toString()}`));
    } catch (err) {
      setSearchError(errorText(err));
    } finally {
      setSearchBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {!cloudinaryReady && (
        <Notice tone="warn">
          Cloudinary isn&apos;t connected, so memories can&apos;t be uploaded yet. Add your credentials to <code>.env.local</code> and restart.
        </Notice>
      )}

      <Section
        title="Add memories"
        description={`Photos, short videos and sounds are uploaded to Cloudinary under memory-garden/patients/${patientCode}/<category>, with tags and structured metadata.`}
        actions={
          <button className="cg-btn" onClick={() => setShowUpload((v) => !v)}>
            {showUpload ? "Hide" : "+ Upload"}
          </button>
        }
      >
        {showUpload && <Uploader base={base} disabled={!cloudinaryReady} onDone={reload} />}
      </Section>

      <Section
        title="Library"
        description="New memories wait for your review. Only approved memories appear in activities — and you can keep any memory out."
      >
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {(
            [
              ["pending", "Needs review"],
              ["approved", "In activities"],
              ["excluded", "Kept out"],
              ["all", "All"],
            ] as const
          ).map(([key, label]) => (
            <button key={key} className={`cg-btn !min-h-9 ${status === key ? "!border-sage-deep !bg-[#eef8ea]" : ""}`} onClick={() => setStatus(key)} aria-pressed={status === key}>
              {label} <span className="rounded-full bg-cg-bg px-1.5 text-xs">{counts[key]}</span>
            </button>
          ))}
          <select className="cg-input !w-auto !py-1.5" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_INFO[c].icon} {CATEGORY_INFO[c].label.en}
              </option>
            ))}
          </select>
          <select className="cg-input !w-auto !py-1.5" value={media} onChange={(e) => setMedia(e.target.value)} aria-label="Media type">
            <option value="">Photos, videos & sounds</option>
            <option value="photo">Photos</option>
            <option value="video">Videos</option>
            <option value="audio">Sounds</option>
          </select>
          <input className="cg-input !w-56 !py-1.5" placeholder="Filter by name, person, tag…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter" />
        </div>

        {items.length === 0 ? (
          <Empty icon="📷" title="No memories yet">
            Start with 5–10 photos of familiar faces, places and celebrations. You&apos;ll name the people and approve each one.
          </Empty>
        ) : visible.length === 0 ? (
          <Empty icon="🔍" title="Nothing matches these filters" />
        ) : (
          <MemoryGrid items={visible} patientId={patientId} onStatus={setItemStatus} />
        )}
      </Section>

      <Section
        title="Search with Cloudinary"
        description="Runs a live Cloudinary Search API query over this person's structured metadata and tags — the same retrieval the activities use."
      >
        <form onSubmit={runSearch} className="grid gap-3 sm:grid-cols-6">
          <div className="sm:col-span-2">
            <Field label="Words (event, people, caption, place)" htmlFor="sq">
              <input id="sq" className="cg-input" value={sq.q} onChange={(e) => setSq({ ...sq, q: e.target.value })} placeholder="wedding Lakshmi" />
            </Field>
          </div>
          <Field label="Tag" htmlFor="stag">
            <input id="stag" className="cg-input" list="tag-suggestions" value={sq.tag} onChange={(e) => setSq({ ...sq, tag: e.target.value })} placeholder="birthday" />
          </Field>
          <Field label="Category" htmlFor="scat">
            <select id="scat" className="cg-input" value={sq.category} onChange={(e) => setSq({ ...sq, category: e.target.value })}>
              <option value="">Any</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_INFO[c].label.en}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Year from" htmlFor="syf">
            <input id="syf" className="cg-input" inputMode="numeric" value={sq.yearFrom} onChange={(e) => setSq({ ...sq, yearFrom: e.target.value.replace(/\D/g, "").slice(0, 4) })} />
          </Field>
          <Field label="Year to" htmlFor="syt">
            <input id="syt" className="cg-input" inputMode="numeric" value={sq.yearTo} onChange={(e) => setSq({ ...sq, yearTo: e.target.value.replace(/\D/g, "").slice(0, 4) })} />
          </Field>
          <label className="flex items-center gap-2 text-sm sm:col-span-3">
            <input type="checkbox" className="h-4 w-4 accent-[#4f8a4b]" checked={sq.eligible} onChange={(e) => setSq({ ...sq, eligible: e.target.checked })} />
            Only memories approved for activities
          </label>
          <div className="flex justify-end sm:col-span-3">
            <button className="cg-btn cg-btn-primary" disabled={searchBusy || !cloudinaryReady}>
              {searchBusy ? "Searching…" : "Search Cloudinary"}
            </button>
          </div>
        </form>
        <datalist id="tag-suggestions">
          {SUGGESTED_TAGS.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
        {searchError && (
          <div className="mt-3">
            <Notice tone="error">{searchError}</Notice>
          </div>
        )}
        {search && (
          <div className="mt-4 flex flex-col gap-3">
            <p className="break-all rounded-lg bg-cg-bg p-2 font-mono text-xs text-ink-soft">
              {search.total} result{search.total === 1 ? "" : "s"} · {search.expression}
            </p>
            {search.items.length ? <MemoryGrid items={search.items} patientId={patientId} /> : <Empty icon="🔍" title="No matches" />}
          </div>
        )}
      </Section>
    </div>
  );
}

function MemoryGrid({ items, patientId, onStatus }: { items: LibraryItem[]; patientId: string; onStatus?: (id: string, s: "approved" | "excluded") => void }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {items.map((m) => (
        <li key={m.id} className="flex flex-col overflow-hidden rounded-xl border border-[#e7e0d3] bg-white">
          <Link href={`/caregiver/patients/${patientId}/memories/${m.id}`} className="group relative block">
            {m.thumb ? (
              <CloudImage image={m.thumb} className="aspect-square w-full" />
            ) : (
              <div className="flex aspect-square w-full items-center justify-center bg-sky/50 text-5xl">{m.mediaType === "audio" ? "🎵" : "🖼️"}</div>
            )}
            <span className="absolute left-2 top-2">
              <StatusBadge status={m.status} />
            </span>
            {m.mediaType !== "photo" && (
              <span className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-xs font-bold">{m.mediaType === "video" ? "🎬 Video" : "🎵 Sound"}</span>
            )}
            {m.hasAiSuggestion && <span className="absolute bottom-2 right-2 rounded-full bg-lavender px-2 py-0.5 text-xs font-bold">✨ AI suggestion</span>}
          </Link>
          <div className="flex flex-1 flex-col gap-1 p-3">
            <p className="line-clamp-2 text-sm font-bold">{m.title || <span className="text-coral-deep">Needs a short name</span>}</p>
            <p className="text-xs text-ink-soft">
              {CATEGORY_INFO[m.category as Category]?.icon} {CATEGORY_INFO[m.category as Category]?.label.en}
              {m.year ? ` · ${m.year}` : ""}
            </p>
            <p className="text-xs text-ink-soft">
              {m.people.length ? `👥 ${m.people.join(", ")}` : m.faces ? `🙂 ${m.faces} face${m.faces > 1 ? "s" : ""} to name` : ""}
              {m.objects ? ` · 🔖 ${m.objects}` : ""}
            </p>
            <p className="text-xs" title={m.sync.error ?? ""}>
              {m.sync.metadataSynced ? <span className="text-sage-deep">☁️ Synced</span> : <span className="text-coral-deep">⚠ Not synced</span>}
              {m.sync.searchIndexedAt ? <span className="text-ink-soft"> · 🔎 in Search</span> : null}
            </p>
            {onStatus && m.status === "pending" && (
              <div className="mt-auto flex gap-1 pt-2">
                <button className="cg-btn cg-btn-primary !min-h-8 flex-1 !px-2 text-xs" onClick={() => onStatus(m.id, "approved")} disabled={!m.title && m.mediaType !== "audio"}>
                  Approve
                </button>
                <button className="cg-btn !min-h-8 flex-1 !px-2 text-xs" onClick={() => onStatus(m.id, "excluded")}>
                  Keep out
                </button>
              </div>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function Uploader({ base, disabled, onDone }: { base: string; disabled: boolean; onDone: () => Promise<void> }) {
  const [rows, setRows] = useState<UploadRow[]>([]);
  const [shared, setShared] = useState({ category: "family" as Category, year: "", event: "", location: "", tags: "", caption: "", language: "en", importance: 3 });
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  function add(files: FileList | File[]) {
    const list = Array.from(files).slice(0, 40);
    setRows((r) => [
      ...r,
      ...list.map((file) => ({ key: `${file.name}-${file.size}-${Math.random()}`, file, title: titleFromFile(file.name), state: "ready" as const })),
    ]);
  }

  async function uploadAll() {
    setBusy(true);
    for (const row of rows) {
      if (row.state === "done") continue;
      setRows((r) => r.map((x) => (x.key === row.key ? { ...x, state: "uploading", message: undefined } : x)));
      const form = new FormData();
      form.set("file", row.file);
      form.set("title", row.title);
      form.set("category", shared.category);
      if (shared.year) form.set("year", shared.year);
      if (shared.event) form.set("event", shared.event);
      if (shared.location) form.set("location", shared.location);
      if (shared.tags) form.set("tags", shared.tags);
      if (shared.caption) form.set("caption", shared.caption);
      form.set("language", shared.language);
      form.set("importance", String(shared.importance));
      try {
        const res = await api<{ memory: { faces: number; sync: SyncInfo } }>(`${base}/memories`, { form });
        const note = [res.memory.faces ? `${res.memory.faces} face${res.memory.faces > 1 ? "s" : ""} detected` : "", res.memory.sync.error ? `metadata: ${res.memory.sync.error}` : ""]
          .filter(Boolean)
          .join(" · ");
        setRows((r) => r.map((x) => (x.key === row.key ? { ...x, state: "done", message: note || "Uploaded" } : x)));
      } catch (e) {
        setRows((r) => r.map((x) => (x.key === row.key ? { ...x, state: "error", message: errorText(e) } : x)));
      }
    }
    setBusy(false);
    await onDone();
  }

  const pending = rows.filter((r) => r.state !== "done").length;

  return (
    <div className="flex flex-col gap-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          if (!disabled) add(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition ${drag ? "border-sage-deep bg-[#eef8ea]" : "border-[#d9d1c3] bg-[#fcfaf6]"}`}
      >
        <span className="text-4xl">📸</span>
        <p className="font-bold">Drop photos, short videos or sound clips here</p>
        <p className="text-xs text-ink-soft">Photos up to 10 MB · videos up to 100 MB · sounds up to 25 MB</p>
        <button className="cg-btn mt-1" type="button" disabled={disabled} onClick={() => input.current?.click()}>
          Choose files
        </button>
        <input ref={input} type="file" multiple accept="image/*,video/*,audio/*" className="hidden" onChange={(e) => e.target.files && add(e.target.files)} />
      </div>

      {rows.length > 0 && (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="Category (all files)" htmlFor="ucat">
              <select id="ucat" className="cg-input" value={shared.category} onChange={(e) => setShared({ ...shared, category: e.target.value as Category })}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_INFO[c].icon} {CATEGORY_INFO[c].label.en}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Year (optional)" htmlFor="uyear">
              <input id="uyear" className="cg-input" inputMode="numeric" value={shared.year} onChange={(e) => setShared({ ...shared, year: e.target.value.replace(/\D/g, "").slice(0, 4) })} />
            </Field>
            <Field label="Event (optional)" htmlFor="uevent">
              <input id="uevent" className="cg-input" value={shared.event} onChange={(e) => setShared({ ...shared, event: e.target.value })} placeholder="Lakshmi's wedding" />
            </Field>
            <Field label="Place (optional)" htmlFor="uloc">
              <input id="uloc" className="cg-input" value={shared.location} onChange={(e) => setShared({ ...shared, location: e.target.value })} placeholder="Guntur" />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Tags (comma separated)" htmlFor="utags" hint="e.g. wedding, family, festival — used by Find the Memory">
                <input id="utags" className="cg-input" list="tag-suggestions" value={shared.tags} onChange={(e) => setShared({ ...shared, tags: e.target.value })} />
              </Field>
            </div>
            <Field label="Language of names & captions" htmlFor="ulang">
              <select id="ulang" className="cg-input" value={shared.language} onChange={(e) => setShared({ ...shared, language: e.target.value })}>
                <option value="en">English</option>
                <option value="te">తెలుగు</option>
              </select>
            </Field>
            <Field label="How special (1–5)" htmlFor="uimp">
              <input id="uimp" type="range" min={1} max={5} value={shared.importance} onChange={(e) => setShared({ ...shared, importance: Number(e.target.value) })} className="w-full accent-[#4f8a4b]" />
            </Field>
          </div>

          <ul className="flex flex-col gap-2">
            {rows.map((row) => (
              <li key={row.key} className="flex flex-wrap items-center gap-3 rounded-lg border border-[#e7e0d3] bg-white p-2">
                <span className="w-44 truncate text-xs text-ink-soft" title={row.file.name}>
                  {row.file.type.startsWith("video") ? "🎬" : row.file.type.startsWith("audio") ? "🎵" : "📷"} {row.file.name}
                </span>
                <input
                  className="cg-input !w-auto flex-1 !py-1.5"
                  value={row.title}
                  placeholder="Short name, e.g. Ravi's first birthday"
                  onChange={(e) => setRows((r) => r.map((x) => (x.key === row.key ? { ...x, title: e.target.value } : x)))}
                  disabled={row.state === "done" || row.state === "uploading"}
                  aria-label={`Name for ${row.file.name}`}
                />
                <span
                  className={`w-56 text-xs ${row.state === "error" ? "text-coral-deep" : row.state === "done" ? "text-sage-deep" : "text-ink-soft"}`}
                  role={row.state === "error" ? "alert" : undefined}
                >
                  {row.state === "uploading" ? "Uploading to Cloudinary…" : row.state === "ready" ? "Ready" : row.message}
                </span>
                {row.state !== "uploading" && row.state !== "done" && (
                  <button className="cg-btn !min-h-8 !px-2 text-xs" onClick={() => setRows((r) => r.filter((x) => x.key !== row.key))} aria-label="Remove">
                    ✕
                  </button>
                )}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center justify-end gap-3">
            {rows.some((r) => r.state === "done") && (
              <button className="cg-btn" onClick={() => setRows((r) => r.filter((x) => x.state !== "done"))}>
                Clear finished
              </button>
            )}
            <button className="cg-btn cg-btn-primary" disabled={busy || disabled || pending === 0} onClick={uploadAll}>
              {busy ? "Uploading…" : `Upload ${pending} ${pending === 1 ? "memory" : "memories"}`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
