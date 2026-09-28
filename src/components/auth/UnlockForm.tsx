"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, errorText } from "@/lib/client/api";

export function UnlockForm({ hasPatientMode }: { hasPatientMode: boolean }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [close, setClose] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/unlock", { body: { password, closePatientMode: close } });
      router.replace("/caregiver");
      router.refresh();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <label htmlFor="pw" className="cg-label">
          Password
        </label>
        <input id="pw" type="password" className="cg-input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
      </div>
      {hasPatientMode && (
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" className="mt-1 h-4 w-4 accent-[#4f8a4b]" checked={close} onChange={(e) => setClose(e.target.checked)} />
          <span>Also close Memory Garden on this device (the person will need a caregiver to open it again).</span>
        </label>
      )}
      {error && (
        <p className="rounded-xl bg-[#fdf1ef] p-3 text-sm font-semibold text-coral-deep" role="alert">
          {error}
        </p>
      )}
      <button className="cg-btn cg-btn-primary !min-h-12" disabled={busy || !password}>
        {busy ? "Checking…" : "Unlock"}
      </button>
    </form>
  );
}
