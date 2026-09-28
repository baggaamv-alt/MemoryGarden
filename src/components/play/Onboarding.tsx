"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Mimo } from "@/components/mimo/Mimo";
import { MIMO_COLORS, type MimoColor } from "@/components/mimo/palette";
import { api, errorText } from "@/lib/client/api";
import type { CharacterAppearance } from "@/lib/types";
import { MimoSays, Petals } from "./Chrome";
import { usePlay } from "./PlayProvider";

const NAMES = { en: ["Mimo", "Sunny", "Pip", "Bloom"], te: ["మిమో", "చిన్ని", "బుజ్జి", "పువ్వు"] };

/** Meeting the garden friend: name, colour and what grows on its head. */
export function Onboarding() {
  const router = useRouter();
  const { t, lang, setCharacter, sound, calm } = usePlay();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(NAMES[lang][0]);
  const [appearance, setAppearance] = useState<CharacterAppearance>({ color: "peach", sprout: "leaf", cheeks: true });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function finish() {
    setBusy(true);
    setError(null);
    try {
      await api("/api/play/character", { body: { name: name.trim() || "Mimo", appearance } });
      setCharacter({ name: name.trim() || "Mimo", appearance, equipped: {} });
      sound("celebrate");
      setStep(4);
      window.setTimeout(() => {
        router.replace("/play");
        router.refresh();
      }, 2200);
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  }

  const next = () => {
    sound("tap");
    setStep((s) => s + 1);
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-6 px-4 py-8">
      {step === 4 && <Petals />}
      <div className="flex justify-center">
        <Mimo appearance={appearance} expression={step === 4 ? "celebrate" : step === 0 ? "wave" : "happy"} size={240} animated={!calm} label={name} />
      </div>

      {step === 0 && (
        <>
          <MimoSays text={t("onboard.hello")} expression="wave" size={0} />
          <button className="btn btn-lg btn-sage" onClick={next}>
            {t("common.continue")}
          </button>
        </>
      )}

      {step === 1 && (
        <section className="card flex flex-col gap-4 p-6">
          <label htmlFor="mimo-name" className="text-2xl font-display font-extrabold">
            {t("onboard.name")}
          </label>
          <input
            id="mimo-name"
            value={name}
            maxLength={24}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-2xl border-[3px] border-line bg-white px-5 py-4 text-2xl font-display font-bold focus:border-sky-deep"
            autoComplete="off"
          />
          <div className="flex flex-wrap gap-3">
            {[...new Set([...NAMES[lang], ...NAMES.en])].slice(0, 6).map((n) => (
              <button key={n} className={`btn ${name === n ? "btn-sky" : ""}`} onClick={() => setName(n)}>
                {n}
              </button>
            ))}
          </div>
          <button className="btn btn-lg btn-sage" disabled={!name.trim()} onClick={next}>
            {t("common.continue")}
          </button>
        </section>
      )}

      {step === 2 && (
        <section className="card flex flex-col gap-4 p-6">
          <h1 className="text-2xl font-extrabold">{t("onboard.color")}</h1>
          <div className="grid grid-cols-3 gap-3">
            {(Object.keys(MIMO_COLORS) as MimoColor[]).map((c) => (
              <button
                key={c}
                className={`option !flex-col !justify-center !gap-2 ${appearance.color === c ? "!border-sky-deep" : ""}`}
                aria-pressed={appearance.color === c}
                onClick={() => setAppearance((a) => ({ ...a, color: c }))}
              >
                <span className="h-14 w-14 rounded-full border-4 border-white shadow" style={{ background: MIMO_COLORS[c].body }} />
                <span className="text-base">{MIMO_COLORS[c].label[lang]}</span>
              </button>
            ))}
          </div>
          <button className="btn btn-lg btn-sage" onClick={next}>
            {t("common.continue")}
          </button>
        </section>
      )}

      {step === 3 && (
        <section className="card flex flex-col gap-4 p-6">
          <h1 className="text-2xl font-extrabold">{t("onboard.sprout")}</h1>
          <div className="grid gap-3 sm:grid-cols-3">
            {(["leaf", "bud", "clover"] as const).map((s) => (
              <button
                key={s}
                className={`option justify-center ${appearance.sprout === s ? "!border-sky-deep" : ""}`}
                aria-pressed={appearance.sprout === s}
                onClick={() => setAppearance((a) => ({ ...a, sprout: s }))}
              >
                {s === "leaf" ? "🌱" : s === "bud" ? "🌷" : "☘️"} {t(`onboard.sprout.${s}`)}
              </button>
            ))}
          </div>
          {error && <p className="text-lg font-bold text-coral-deep">{error}</p>}
          <button className="btn btn-lg btn-sage" disabled={busy} onClick={finish}>
            {t("onboard.begin")}
          </button>
        </section>
      )}

      {step === 4 && <MimoSays text={`${t("onboard.nice")} ${t("greet.firstTime", { mimo: name })}`} expression="celebrate" size={0} />}
    </main>
  );
}
