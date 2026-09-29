"use client";

import { LocalTime } from "@/components/ui/LocalTime";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, errorText } from "@/lib/client/api";
import type { patientOverview } from "@/lib/services/caregiver";
import type { Preferences } from "@/lib/db/schema";
import { Field, Notice, Section, Toggle } from "./ui";

type Overview = Awaited<ReturnType<typeof patientOverview>>;

export function PatientSettings({
  patientId,
  overview,
  audit,
  isOwner,
}: {
  patientId: string;
  overview: Overview;
  audit: { action: string; actor: string; at: string; target: string | null }[];
  isOwner: boolean;
}) {
  const router = useRouter();
  const base = `/api/caregiver/patients/${patientId}`;
  const p = overview.patient;
  const [profile, setProfile] = useState({
    name: p.name,
    addressAs: p.addressAs,
    birthYear: p.birthYear ? String(p.birthYear) : "",
    hometown: p.hometown ?? "",
    about: p.about ?? "",
    timezone: p.timezone,
  });
  const [prefs, setPrefs] = useState<Preferences>(overview.prefs);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [invite, setInvite] = useState({ email: "", relationship: "" });
  const [del, setDel] = useState({ open: false, typed: "", media: true, busy: false });

  async function run(fn: () => Promise<void>, ok: string) {
    setMessage(null);
    try {
      await fn();
      setMessage({ tone: "ok", text: ok });
      router.refresh();
    } catch (e) {
      setMessage({ tone: "error", text: errorText(e) });
    }
  }

  const patchPrefs = (body: Record<string, unknown>) =>
    run(async () => {
      const res = await api<{ preferences: Preferences }>(`${base}/preferences`, { method: "PATCH", body });
      setPrefs(res.preferences);
    }, "Saved.");

  return (
    <div className="flex flex-col gap-5">
      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      <Section title="Profile">
        <form
          className="grid gap-3 sm:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            void run(
              () =>
                api(base, {
                  method: "PATCH",
                  body: {
                    name: profile.name,
                    addressAs: profile.addressAs,
                    birthYear: profile.birthYear ? Number(profile.birthYear) : null,
                    hometown: profile.hometown || null,
                    about: profile.about || null,
                    timezone: profile.timezone,
                  },
                }).then(() => undefined),
              "Profile saved.",
            );
          }}
        >
          <Field label="Full name" htmlFor="sn">
            <input id="sn" className="cg-input" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
          </Field>
          <Field label="Mimo calls them" htmlFor="sa">
            <input id="sa" className="cg-input" value={profile.addressAs} onChange={(e) => setProfile({ ...profile, addressAs: e.target.value })} />
          </Field>
          <Field label="Birth year" htmlFor="sb">
            <input id="sb" className="cg-input" inputMode="numeric" value={profile.birthYear} onChange={(e) => setProfile({ ...profile, birthYear: e.target.value.replace(/\D/g, "").slice(0, 4) })} />
          </Field>
          <Field label="Hometown" htmlFor="sh">
            <input id="sh" className="cg-input" value={profile.hometown} onChange={(e) => setProfile({ ...profile, hometown: e.target.value })} />
          </Field>
          <Field label="Time zone" htmlFor="st" hint="Used for daily adventures and greetings">
            <input id="st" className="cg-input" value={profile.timezone} onChange={(e) => setProfile({ ...profile, timezone: e.target.value })} />
          </Field>
          <div className="sm:col-span-3">
            <Field label="About them" htmlFor="sab">
              <textarea id="sab" className="cg-input min-h-20" value={profile.about} onChange={(e) => setProfile({ ...profile, about: e.target.value })} />
            </Field>
          </div>
          <div className="flex justify-end sm:col-span-3">
            <button className="cg-btn cg-btn-primary">Save profile</button>
          </div>
        </form>
      </Section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Language & voice" description="Mimo's voice uses the device's built-in speech. Telugu needs a Telugu voice installed on the device.">
          <div className="flex flex-col gap-3">
            <Field label="Language" htmlFor="slang">
              <select id="slang" className="cg-input" value={prefs.language} onChange={(e) => patchPrefs({ language: e.target.value })}>
                <option value="en">English</option>
                <option value="te">తెలుగు (Telugu)</option>
              </select>
            </Field>
            <Toggle checked={prefs.voice.enabled} onChange={(v) => patchPrefs({ voice: { enabled: v } })} label="Mimo reads aloud" />
            <Toggle checked={prefs.voice.autoRead} onChange={(v) => patchPrefs({ voice: { autoRead: v } })} label="Read new instructions automatically" disabled={!prefs.voice.enabled} />
            <Toggle checked={prefs.voice.commands} onChange={(v) => patchPrefs({ voice: { commands: v } })} label="Show the microphone for spoken answers" description="Where the browser supports it. Tapping always works too." />
            <Field label={`Speaking speed: ${prefs.voice.rate.toFixed(2)}×`} htmlFor="srate">
              <input id="srate" type="range" min={0.6} max={1.2} step={0.05} value={prefs.voice.rate} onChange={(e) => setPrefs({ ...prefs, voice: { ...prefs.voice, rate: Number(e.target.value) } })} onPointerUp={() => patchPrefs({ voice: { rate: prefs.voice.rate } })} className="w-full accent-[#4f8a4b]" />
            </Field>
          </div>
        </Section>

        <Section title="Accessibility" description="Defaults for their Memory Garden. They can also change these themselves under Comfort.">
          <div className="flex flex-col gap-3">
            <Field label="Text size" htmlFor="stext">
              <select id="stext" className="cg-input" value={prefs.accessibility.textSize} onChange={(e) => patchPrefs({ accessibility: { textSize: e.target.value } })}>
                <option value="normal">Normal</option>
                <option value="large">Large (recommended)</option>
                <option value="xlarge">Extra large</option>
              </select>
            </Field>
            <Toggle checked={prefs.accessibility.highContrast} onChange={(v) => patchPrefs({ accessibility: { highContrast: v } })} label="Clearer colours (high contrast)" />
            <Toggle checked={prefs.accessibility.calmMode} onChange={(v) => patchPrefs({ accessibility: { calmMode: v } })} label="Calm mode" description="Fewer movements, no falling petals, still pictures." />
            <Toggle checked={prefs.accessibility.sound} onChange={(v) => patchPrefs({ accessibility: { sound: v } })} label="Gentle sounds" />
            <Toggle checked={prefs.accessibility.lowBandwidth} onChange={(v) => patchPrefs({ accessibility: { lowBandwidth: v } })} label="Save mobile data" description="Smaller, lighter images (Cloudinary q_auto:eco)." />
          </div>
        </Section>
      </div>

      <Section title="Privacy & consent" description="What Memory Garden records. Photos stay private in Cloudinary as authenticated assets; only signed links from this server can show them.">
        <div className="grid gap-3 md:grid-cols-3">
          <Toggle checked={prefs.consent.activityInsights} onChange={(v) => patchPrefs({ consent: { activityInsights: v } })} label="Keep activity history for insights" />
          <Toggle checked={prefs.consent.trackResponseTimes} onChange={(v) => patchPrefs({ consent: { trackResponseTimes: v } })} label="Record answer times" description="Shown only to caregivers, never to the patient." />
          <Toggle
            checked={prefs.consent.aiSuggestions}
            onChange={(v) => patchPrefs({ consent: { aiSuggestions: v } })}
            label="Allow Cloudinary AI suggestions"
            description="Optional captions/objects via Cloudinary add-ons — always reviewed by you before use."
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <a className="cg-btn" href={`${base}/export`}>
            ⬇ Download all their data (JSON)
          </a>
        </div>
      </Section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Caregivers" description="Other family members can help after creating their own caregiver account.">
          <ul className="mb-3 flex flex-col gap-1 text-sm">
            {overview.caregivers.map((c) => (
              <li key={c.email ?? c.name}>
                <b>{c.name}</b> ({c.email}) — {c.relationship} {c.role === "owner" && <span className="text-ink-faint">· owner</span>}
              </li>
            ))}
          </ul>
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void run(() => api(`${base}/caregivers`, { body: invite }).then(() => setInvite({ email: "", relationship: "" })), "Caregiver added.");
            }}
          >
            <Field label="Their email" htmlFor="ie">
              <input id="ie" type="email" className="cg-input" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} required />
            </Field>
            <Field label="Relationship" htmlFor="ir">
              <input id="ir" className="cg-input" value={invite.relationship} onChange={(e) => setInvite({ ...invite, relationship: e.target.value })} placeholder="Son" />
            </Field>
            <button className="cg-btn">Add</button>
          </form>
        </Section>

        <Section title="Recent changes" description="Every caregiver action is recorded.">
          <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto text-xs">
            {audit.map((a, i) => (
              <li key={i} className="flex gap-2">
                <span className="w-36 shrink-0 text-ink-faint"><LocalTime iso={a.at} /></span>
                <span>
                  <b>{a.actor}</b> {a.action.replace(/\./g, " ")}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      {isOwner && (
        <Section title="Delete this Memory Garden" description="Removes the profile, activity history, coins and garden. This cannot be undone.">
          {!del.open ? (
            <button className="cg-btn cg-btn-danger" onClick={() => setDel({ ...del, open: true })}>
              Delete {p.name}&apos;s Memory Garden…
            </button>
          ) : (
            <div className="flex flex-col gap-3 rounded-xl border border-[#e3b1ab] bg-[#fdf1ef] p-4 text-sm">
              <Toggle checked={del.media} onChange={(v) => setDel({ ...del, media: v })} label="Also delete their photos, videos and sounds from Cloudinary" />
              <Field label={`Type “${p.code}” to confirm`} htmlFor="dconf">
                <input id="dconf" className="cg-input" value={del.typed} onChange={(e) => setDel({ ...del, typed: e.target.value })} />
              </Field>
              <div className="flex gap-2">
                <button className="cg-btn" onClick={() => setDel({ open: false, typed: "", media: true, busy: false })}>
                  Cancel
                </button>
                <button
                  className="cg-btn cg-btn-danger"
                  disabled={del.typed.trim() !== p.code || del.busy}
                  onClick={async () => {
                    setDel({ ...del, busy: true });
                    try {
                      await api(base, { method: "DELETE", body: { confirm: true, deleteMedia: del.media } });
                      router.replace("/caregiver");
                      router.refresh();
                    } catch (e) {
                      setMessage({ tone: "error", text: errorText(e) });
                      setDel({ ...del, busy: false });
                    }
                  }}
                >
                  {del.busy ? "Deleting…" : "Delete permanently"}
                </button>
              </div>
            </div>
          )}
        </Section>
      )}
    </div>
  );
}
