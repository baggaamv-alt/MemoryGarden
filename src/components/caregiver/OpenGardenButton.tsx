"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { api, errorText } from "@/lib/client/api";
import { Notice } from "./ui";

/** Starts patient mode on this device. The caregiver area locks until the password is re-entered. */
export function OpenGardenButton({ patientId, name }: { patientId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/caregiver/patients/${patientId}/patient-mode`, { body: {} });
      window.location.href = "/play";
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  }

  return (
    <>
      <button className="cg-btn cg-btn-primary !min-h-11" onClick={() => setOpen(true)}>
        🌼 Open Memory Garden for {name}
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} tone="caregiver" title={`Open Memory Garden for ${name}?`}>
        <div className="flex flex-col gap-4 text-sm">
          <p>
            This device will show {name}&apos;s Memory Garden. To keep your dashboard private, the caregiver area will lock — you&apos;ll need your
            password to come back (tap “Caregiver” at the bottom of their home screen).
          </p>
          {error && <Notice tone="error">{error}</Notice>}
          <div className="flex justify-end gap-2">
            <button className="cg-btn" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button className="cg-btn cg-btn-primary" onClick={go} disabled={busy}>
              {busy ? "Opening…" : "Open Memory Garden"}
            </button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
