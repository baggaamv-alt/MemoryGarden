"use client";

import { useState } from "react";
import { api } from "@/lib/client/api";
import type { ChallengeOfferView } from "@/lib/game/types";
import { MimoSays } from "./Chrome";
import { usePlay } from "./PlayProvider";

/**
 * Mimo *asks* before anything becomes more challenging. Three equal, friendly choices — and
 * "Keep it familiar" / "Maybe later" are just as celebrated as "Yes".
 */
export function ChallengeOffer({ offer, onDone }: { offer: ChallengeOfferView; onDone?: () => void }) {
  const { t, sound } = usePlay();
  const [reply, setReply] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function respond(response: "accepted" | "keep_familiar" | "later") {
    setBusy(true);
    sound("tap");
    try {
      await api("/api/play/challenge", { body: { offerId: offer.id, response } });
      setReply(t(response === "accepted" ? "challenge.accepted" : response === "keep_familiar" ? "challenge.kept" : "challenge.snoozed"));
      if (response === "accepted") sound("chime");
      window.setTimeout(() => onDone?.(), 2600);
    } catch {
      setReply(t("challenge.snoozed"));
      window.setTimeout(() => onDone?.(), 2000);
    } finally {
      setBusy(false);
    }
  }

  if (reply) return <MimoSays text={reply} expression="happy" size={110} />;

  const up = offer.direction === "up";
  return (
    <div className="card p-5 sm:p-6">
      <MimoSays text={up ? t("challenge.question") : t("challenge.gentler")} expression="curious" size={110}>
        <p className="mt-2 text-base text-ink-soft">
          {offer.gameName}
        </p>
      </MimoSays>
      <div className="mt-2 grid gap-3 sm:grid-cols-3">
        {up ? (
          <>
            <button className="btn btn-lg btn-sage" disabled={busy} onClick={() => respond("accepted")}>
              {t("challenge.yes")}
            </button>
            <button className="btn btn-lg btn-sky" disabled={busy} onClick={() => respond("keep_familiar")}>
              {t("challenge.keep")}
            </button>
            <button className="btn btn-lg" disabled={busy} onClick={() => respond("later")}>
              {t("challenge.later")}
            </button>
          </>
        ) : (
          <>
            <button className="btn btn-lg btn-sage" disabled={busy} onClick={() => respond("accepted")}>
              {t("challenge.gentlerYes")}
            </button>
            <button className="btn btn-lg btn-sky" disabled={busy} onClick={() => respond("keep_familiar")}>
              {t("challenge.gentlerNo")}
            </button>
            <button className="btn btn-lg" disabled={busy} onClick={() => respond("later")}>
              {t("challenge.later")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
