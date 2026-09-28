"use client";

import { useState } from "react";
import { hasVoiceFor, recognitionSupported, useVoices } from "@/lib/client/speech";
import { LANG_LABELS, LANGS, type TextSize } from "@/lib/types";
import { TopBar } from "./Chrome";
import { usePlay } from "./PlayProvider";

/** Settings the patient can change themselves — big, simple, and saved straight away. */
export function ComfortView() {
  const { t, accessibility, voice, lang, updatePrefs, say, sound, mimoName, patientName } = usePlay();
  const voices = useVoices();
  const [saved, setSaved] = useState(false);

  async function save(patch: Parameters<typeof updatePrefs>[0]) {
    sound("tap");
    await updatePrefs(patch);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  }

  const toggle = (label: string, value: boolean, onChange: (v: boolean) => void, icon: string) => (
    <div className="flex items-center justify-between gap-3 rounded-2xl border-2 border-line bg-white p-4">
      <span className="flex items-center gap-3 text-xl font-display font-bold">
        <span aria-hidden="true" className="text-3xl">
          {icon}
        </span>
        {label}
      </span>
      <div className="flex gap-2" role="group" aria-label={label}>
        <button className={`btn btn-sm !min-h-[3.25rem] ${value ? "btn-sage" : ""}`} aria-pressed={value} onClick={() => onChange(true)}>
          {t("settings.on")}
        </button>
        <button className={`btn btn-sm !min-h-[3.25rem] ${!value ? "btn-sky" : ""}`} aria-pressed={!value} onClick={() => onChange(false)}>
          {t("settings.off")}
        </button>
      </div>
    </div>
  );

  const teluguVoice = hasVoiceFor(voices, "te");

  return (
    <div className="pb-16">
      <TopBar title={t("settings.title")} />
      <main className="mx-auto flex max-w-3xl flex-col gap-4 px-3 pt-4 sm:px-5">
        {saved && (
          <p className="pill self-center bg-sage animate-pop" role="status">
            ✓ {t("settings.saved")}
          </p>
        )}

        <section className="card flex flex-col gap-3 p-5">
          <h2 className="text-2xl font-extrabold">🔤 {t("settings.textSize")}</h2>
          <div className="grid grid-cols-3 gap-3">
            {(["normal", "large", "xlarge"] as TextSize[]).map((size, i) => (
              <button
                key={size}
                className={`btn ${accessibility.textSize === size ? "btn-sky" : ""}`}
                aria-pressed={accessibility.textSize === size}
                onClick={() => save({ accessibility: { textSize: size } })}
                style={{ fontSize: `${1 + i * 0.2}rem` }}
              >
                Aa · {t(`settings.text.${size}`)}
              </button>
            ))}
          </div>
        </section>

        <section className="card flex flex-col gap-3 p-5">
          <h2 className="text-2xl font-extrabold">🌐 {t("settings.language")}</h2>
          <div className="grid grid-cols-2 gap-3">
            {LANGS.map((l) => (
              <button key={l} className={`btn btn-lg ${lang === l ? "btn-sky" : ""}`} aria-pressed={lang === l} onClick={() => save({ language: l })} lang={l}>
                {LANG_LABELS[l]}
              </button>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          {toggle(t("settings.contrast"), accessibility.highContrast, (v) => save({ accessibility: { highContrast: v } }), "🌓")}
          {toggle(t("settings.calm"), accessibility.calmMode, (v) => save({ accessibility: { calmMode: v } }), "🍃")}
          {toggle(t("settings.sound"), accessibility.sound, (v) => save({ accessibility: { sound: v } }), "🔔")}
          {toggle(t("settings.voice", { mimo: mimoName }), voice.enabled, (v) => save({ voice: { enabled: v } }), "🗣️")}
          {voice.enabled && toggle(t("settings.autoRead"), voice.autoRead, (v) => save({ voice: { autoRead: v } }), "📖")}
          {recognitionSupported() && toggle(t("settings.commands"), voice.commands, (v) => save({ voice: { commands: v } }), "🎙️")}
          {toggle(t("settings.lowData"), accessibility.lowBandwidth, (v) => save({ accessibility: { lowBandwidth: v } }), "📶")}
        </section>

        {voice.enabled && lang === "te" && !teluguVoice && (
          <p className="rounded-2xl bg-gold/60 p-4 text-lg">{t("settings.noVoice")}</p>
        )}
        {voice.enabled && (
          <button className="btn btn-lg btn-sky" onClick={() => say(t("greet.explore", { name: patientName }), { force: true })}>
            🔊 {t("common.listen")}
          </button>
        )}
      </main>
    </div>
  );
}
