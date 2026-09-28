"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, errorText } from "@/lib/client/api";
import { Notice } from "./ui";

type Status =
  | { configured: false; database: string }
  | {
      configured: true;
      cloudName: string | null;
      rootFolder: string;
      deliveryType: string;
      folderMode: string;
      metadata: { ready: boolean; missing: string[]; error?: string };
      search: { ok: boolean; error?: string };
      created: string[];
      setupError?: string;
      database: string;
    };

/** Connection, folder mode, structured-metadata fields and Search API health, with one-click setup. */
export function CloudinaryStatusCard({ compact = false }: { compact?: boolean }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(setup = false) {
    setBusy(true);
    setError(null);
    try {
      setStatus(await api<Status>("/api/caregiver/cloudinary", setup ? { body: {} } : {}));
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    let alive = true;
    api<Status>("/api/caregiver/cloudinary")
      .then((s) => alive && setStatus(s))
      .catch((e) => alive && setError(errorText(e)));
    return () => {
      alive = false;
    };
  }, []);

  if (error) return <Notice tone="error">Couldn&apos;t check Cloudinary: {error}</Notice>;
  if (!status) return <div className="cg-card h-20 animate-pulse" aria-busy="true" />;

  if (!status.configured) {
    return (
      <Notice tone="warn">
        <p className="font-bold">Cloudinary isn&apos;t connected yet.</p>
        <p className="mt-1">
          Memory Garden stores and transforms every photo with Cloudinary. Add <code>CLOUDINARY_CLOUD_NAME</code>, <code>CLOUDINARY_API_KEY</code> and{" "}
          <code>CLOUDINARY_API_SECRET</code> (or <code>CLOUDINARY_URL</code>) to <code>.env.local</code> and restart the server. Until then, only the
          illustrated everyday cards can be played.
        </p>
      </Notice>
    );
  }

  const ok = status.metadata.ready && status.search.ok;
  if (compact && ok) {
    return (
      <Notice tone="ok">
        ☁️ Cloudinary connected — <b>{status.cloudName}</b> · {status.folderMode} folders · structured metadata ready · Search API ready.{" "}
        <Link href="/caregiver/cloudinary" className="font-bold underline">
          Details
        </Link>
      </Notice>
    );
  }

  return (
    <div className="cg-card p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-extrabold">☁️ Cloudinary</h2>
        <button className="cg-btn" onClick={() => load()} disabled={busy}>
          Re-check
        </button>
      </div>
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <Row label="Product environment" value={status.cloudName ?? "—"} />
        <Row label="Folder mode" value={`${status.folderMode} (${status.folderMode === "dynamic" ? "asset_folder + public ID prefix" : "legacy folder paths"})`} />
        <Row label="Root folder" value={`${status.rootFolder}/patients/<code>/<category>`} />
        <Row label="Delivery type" value={`${status.deliveryType}${status.deliveryType === "authenticated" ? " — every URL is signed by this server" : ""}`} />
        <Row label="Structured metadata" value={status.metadata.ready ? "All 13 fields ready" : `${status.metadata.missing.length} field(s) to create`} good={status.metadata.ready} />
        <Row label="Search API" value={status.search.ok ? "Working" : status.search.error ?? "Unavailable"} good={status.search.ok} />
        <Row label="Database" value={status.database === "pglite" ? "Embedded PostgreSQL (PGlite)" : "PostgreSQL"} />
      </dl>
      {!status.metadata.ready && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button className="cg-btn cg-btn-primary" onClick={() => load(true)} disabled={busy}>
            {busy ? "Setting up…" : "Create Memory Garden metadata fields"}
          </button>
          <span className="text-xs text-ink-soft">They are also created automatically on the first upload.</span>
        </div>
      )}
      {status.metadata.error && (
        <div className="mt-3">
          <Notice tone="error">{status.metadata.error}</Notice>
        </div>
      )}
      {status.setupError && (
        <div className="mt-3">
          <Notice tone="error">{status.setupError}</Notice>
        </div>
      )}
      {status.created.length > 0 && (
        <div className="mt-3">
          <Notice tone="ok">Created: {status.created.join(", ")}</Notice>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs font-bold uppercase tracking-wide text-ink-faint">{label}</dt>
      <dd className={good === false ? "font-semibold text-coral-deep" : good ? "font-semibold text-sage-deep" : ""}>{value}</dd>
    </div>
  );
}
