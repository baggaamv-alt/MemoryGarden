"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, errorText } from "@/lib/client/api";
import { CATEGORY_INFO } from "@/lib/content/categories";
import { GAME_LIST } from "@/lib/game/games";
import type { Preferences } from "@/lib/db/schema";
import { CATEGORIES, GAME_TYPES, type GameType } from "@/lib/types";
import { Field, Notice, Section, Toggle } from "./ui";

type World = { id: string; name: string; icon: string; unlocked: boolean; levels: { id: string; title: string; gameName: string; icon: string; status: string; reason?: string }[] };

export function ActivitySettings({ patientId, name, initial, worlds }: { patientId: string; name: string; initial: Preferences; worlds: World[] }) {
  const router = useRouter();
  const [prefs, setPrefs] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const enabled = new Set(prefs.enabledGames.length ? prefs.enabledGames : GAME_TYPES);

  async function patch(body: Record<string, unknown>, note = "Saved.") {
    setSaving(true);
    setMessage(null);
    try {
      const res = await api<{ preferences: Preferences }>(`/api/caregiver/patients/${patientId}/preferences`, { method: "PATCH", body });
      setPrefs(res.preferences);
      setMessage({ tone: "ok", text: note });
      router.refresh();
    } catch (e) {
      setMessage({ tone: "error", text: errorText(e) });
    } finally {
      setSaving(false);
    }
  }

  function toggleGame(g: GameType, on: boolean) {
    const next = new Set(enabled);
    if (on) next.add(g);
    else next.delete(g);
    if (next.size === 0) return;
    void patch({ enabledGames: next.size === GAME_TYPES.length ? [] : [...next] });
  }

  return (
    <div className="flex flex-col gap-5">
      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      <Section title="Activities" description="Switch off any activity that doesn't suit. Starred activities are suggested more often in the daily adventure.">
        <ul className="grid gap-3 md:grid-cols-2">
          {GAME_LIST.map((g) => {
            const on = enabled.has(g.type);
            const star = prefs.preferredGames.includes(g.type);
            return (
              <li key={g.type} className={`flex gap-3 rounded-xl border p-3 ${on ? "border-[#e7e0d3] bg-white" : "border-dashed border-[#d9d1c3] bg-[#fcfaf6] opacity-75"}`}>
                <span className="text-3xl">{g.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold">
                    {g.name.en} <span className="font-normal text-ink-soft" lang="te">· {g.name.te}</span>
                  </p>
                  <p className="text-xs text-ink-soft">{g.caregiverFocus}</p>
                  <p className="mt-1 text-xs text-ink-faint">Needs: {g.needs}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <button className={`cg-btn !min-h-8 !px-2 text-xs ${on ? "cg-btn-primary" : ""}`} disabled={saving} onClick={() => toggleGame(g.type, !on)} aria-pressed={on}>
                    {on ? "On" : "Off"}
                  </button>
                  <button
                    className="cg-btn !min-h-8 !px-2 text-xs"
                    disabled={saving || !on}
                    aria-pressed={star}
                    onClick={() => patch({ preferredGames: star ? prefs.preferredGames.filter((x) => x !== g.type) : [...prefs.preferredGames, g.type] })}
                  >
                    {star ? "★ Favourite" : "☆"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </Section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Pace and comfort">
          <div className="flex flex-col gap-4">
            <Field label={`Preferred session length: ${prefs.sessionMinutes} minutes`} hint={`After this, Mimo asks if ${name} would like to finish for today.`} htmlFor="sess">
              <input id="sess" type="range" min={5} max={60} step={5} value={prefs.sessionMinutes} onChange={(e) => setPrefs({ ...prefs, sessionMinutes: Number(e.target.value) })} onPointerUp={() => patch({ sessionMinutes: prefs.sessionMinutes })} onKeyUp={() => patch({ sessionMinutes: prefs.sessionMinutes })} className="w-full accent-[#4f8a4b]" />
            </Field>
            <Field label={prefs.breakReminderMinutes ? `Gentle break reminder every ${prefs.breakReminderMinutes} minutes` : "Break reminders are off"} htmlFor="brk">
              <input id="brk" type="range" min={0} max={45} step={5} value={prefs.breakReminderMinutes} onChange={(e) => setPrefs({ ...prefs, breakReminderMinutes: Number(e.target.value) })} onPointerUp={() => patch({ breakReminderMinutes: prefs.breakReminderMinutes })} onKeyUp={() => patch({ breakReminderMinutes: prefs.breakReminderMinutes })} className="w-full accent-[#4f8a4b]" />
            </Field>
            <Field
              label={prefs.exposureSeconds ? `Remember the Scene: picture shown for ${prefs.exposureSeconds} seconds` : "Remember the Scene: self-paced viewing (recommended)"}
              hint="There is never a visible countdown. When a time is set, the picture fades gently and “Look again” is always available."
              htmlFor="exp"
            >
              <input id="exp" type="range" min={0} max={30} step={5} value={prefs.exposureSeconds} onChange={(e) => setPrefs({ ...prefs, exposureSeconds: Number(e.target.value) })} onPointerUp={() => patch({ exposureSeconds: prefs.exposureSeconds })} onKeyUp={() => patch({ exposureSeconds: prefs.exposureSeconds })} className="w-full accent-[#4f8a4b]" />
            </Field>
            <Toggle checked={prefs.dailyAdventures} onChange={(v) => patch({ dailyAdventures: v })} label="Today's Little Adventure" description="3–4 gentle suggestions each day. No streaks, nothing lost by missing a day." />
            <Toggle checked={prefs.starterPack} onChange={(v) => patch({ starterPack: v })} label="Illustrated everyday cards" description="Used by Daily Life Match alongside your own photo pairs." />
            <Toggle
              checked={prefs.allDestinationsOpen}
              onChange={(v) => patch({ allDestinationsOpen: v })}
              label="Open every place on the map"
              description="Normally places open as they take part. Turn on to let them wander anywhere."
            />
          </div>
        </Section>

        <Section title="Favourite kinds of memories" description="Used to shape the daily adventure.">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => {
              const on = prefs.preferredCategories.includes(c);
              return (
                <button
                  key={c}
                  className={`cg-btn !min-h-9 text-sm ${on ? "!border-sage-deep !bg-[#eef8ea]" : ""}`}
                  aria-pressed={on}
                  disabled={saving}
                  onClick={() => patch({ preferredCategories: on ? prefs.preferredCategories.filter((x) => x !== c) : [...prefs.preferredCategories, c] })}
                >
                  {CATEGORY_INFO[c].icon} {CATEGORY_INFO[c].label.en}
                </button>
              );
            })}
          </div>
        </Section>
      </div>

      <Section
        title="Challenge — always their choice"
        description={`Activities never become harder by themselves and ${name} never sees words like “easy” or “hard”. When things go comfortably, Mimo asks “Would you like to try a little more of a challenge?” and nothing changes unless ${name} says yes. You can set a ceiling or reset to the gentlest setting at any time.`}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Toggle
            checked={prefs.challenge.offersEnabled}
            onChange={(v) => patch({ challenge: { offersEnabled: v } })}
            label="Mimo may offer a bigger challenge"
            description="Turn off to keep everything exactly as familiar as it is now."
          />
          <Field label={`Highest setting Mimo may offer: ${prefs.challenge.maxLevel} of 5`} hint="Lowering this also brings any higher setting down." htmlFor="max">
            <input id="max" type="range" min={1} max={5} value={prefs.challenge.maxLevel} onChange={(e) => patch({ challenge: { maxLevel: Number(e.target.value) } }, "Ceiling updated.")} className="w-full accent-[#4f8a4b]" />
          </Field>
        </div>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {GAME_LIST.map((g) => {
            const level = prefs.challenge.levels[g.type] ?? 1;
            return (
              <li key={g.type} className="flex items-center gap-2 rounded-lg border border-[#e7e0d3] bg-white p-2 text-sm">
                <span>{g.icon}</span>
                <span className="flex-1">{g.name.en}</span>
                <span className="flex gap-0.5" aria-label={`Setting ${level} of 5`}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span key={n} className={`h-2.5 w-2.5 rounded-full ${n <= level ? "bg-sage-deep" : "bg-[#e7e0d3]"}`} />
                  ))}
                </span>
                {level > 1 && (
                  <button className="cg-btn !min-h-7 !px-2 text-xs" onClick={() => patch({ challenge: { resetGames: [g.type] } }, `${g.name.en} reset to the gentlest setting.`)}>
                    Reset
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title="What's ready on the map" description="Places marked 🌱 need a little more content. Hover a place to see what it needs.">
        <div className="flex flex-col gap-3">
          {worlds.map((w) => (
            <div key={w.id}>
              <p className="mb-1 text-sm font-bold">
                {w.icon} {w.name} {!w.unlocked && <span className="font-normal text-ink-faint">(opens as they take part)</span>}
              </p>
              <ul className="grid gap-1 sm:grid-cols-2 lg:grid-cols-5">
                {w.levels.map((l) => (
                  <li
                    key={l.id}
                    className={`rounded-lg border px-2 py-1 text-xs ${l.status === "growing" ? "border-dashed border-[#c9bfa9] bg-white" : "border-[#e7e0d3] bg-[#fcfaf6]"}`}
                    title={l.reason ?? ""}
                  >
                    <span className="font-bold">
                      {l.status === "growing" ? "🌱" : l.icon} {l.title}
                    </span>
                    <span className="block text-ink-faint">{l.status === "growing" ? l.reason : l.gameName}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
