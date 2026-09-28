import Link from "next/link";
import { OverviewMimo } from "@/components/caregiver/OverviewMimo";
import { pageCaregiverFor } from "@/lib/auth/session";
import { patientOverview } from "@/lib/services/caregiver";
import { patientInsights } from "@/lib/services/insights";

export default async function PatientOverviewPage({ params }: { params: Promise<{ pid: string }> }) {
  const { pid } = await params;
  await pageCaregiverFor(pid);
  const o = await patientOverview(pid);
  const ins = await patientInsights({ id: pid, name: o.patient.addressAs, timezone: o.patient.timezone }, { days: 14 });
  const base = `/caregiver/patients/${pid}`;
  const steps = [
    { done: o.library.total > 0, label: "Upload a few photographs", href: `${base}/memories` },
    { done: o.library.people >= 2, label: "Name the people in them (faces are detected for you)", href: `${base}/memories` },
    { done: o.library.approved >= 3, label: "Approve memories for activities", href: `${base}/memories?status=pending` },
    { done: !!o.character, label: `Open Memory Garden for ${o.patient.addressAs} and meet Mimo`, href: null },
  ];
  const playable = o.worlds.flatMap((w) => w.levels).filter((l) => l.status !== "growing" && l.status !== "locked").length;
  const growing = o.worlds.flatMap((w) => w.levels.map((l) => ({ ...l, world: w.name, unlocked: w.unlocked }))).filter((l) => l.status === "growing");
  const reasons = [...new Set(growing.map((g) => g.reason).filter(Boolean))] as string[];

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="flex flex-col gap-5 lg:col-span-2">
        {steps.some((s) => !s.done) && (
          <section className="cg-card p-5">
            <h2 className="mb-3 text-lg font-extrabold">Getting started</h2>
            <ol className="flex flex-col gap-2">
              {steps.map((s, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${s.done ? "bg-sage-deep text-white" : "bg-cg-bg text-ink-soft"}`}>
                    {s.done ? "✓" : i + 1}
                  </span>
                  {s.href && !s.done ? (
                    <Link href={s.href} className="font-semibold underline decoration-dotted underline-offset-4">
                      {s.label}
                    </Link>
                  ) : (
                    <span className={s.done ? "text-ink-soft line-through" : "font-semibold"}>{s.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </section>
        )}

        <section className="grid gap-3 sm:grid-cols-4">
          {[
            ["This week", `${ins.summary.activitiesThisWeek}`, "activities"],
            ["Time together", `${ins.summary.minutesThisWeek}`, "minutes this week"],
            ["In activities", `${o.library.approved}`, "approved memories"],
            ["Needs review", `${o.library.pending}`, "new memories"],
          ].map(([label, value, sub]) => (
            <div key={label} className="cg-card p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-ink-faint">{label}</p>
              <p className="text-3xl font-extrabold tabular-nums">{value}</p>
              <p className="text-xs text-ink-soft">{sub}</p>
            </div>
          ))}
        </section>

        <section className="cg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-extrabold">Recent activity</h2>
            <Link href={`${base}/insights`} className="text-sm font-bold text-sage-deep underline">
              All insights
            </Link>
          </div>
          {ins.history.length === 0 ? (
            <p className="text-sm text-ink-soft">No activities yet.</p>
          ) : (
            <ul className="divide-y divide-[#efe8dc]">
              {ins.history.slice(0, 6).map((h) => (
                <li key={h.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2 text-sm">
                  <span className="w-40 shrink-0 text-ink-soft">{new Date(h.at).toLocaleString()}</span>
                  <span className="flex-1 font-semibold">
                    {h.gameName} · {h.title}
                  </span>
                  <span className="text-ink-soft">
                    {h.status === "completed" ? "Finished" : h.status === "ended_early" ? "Stopped early" : "Skipped"} · {h.minutes} min · +{h.coins} coins
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="cg-card p-5">
          <h2 className="text-lg font-extrabold">Places on the map</h2>
          <p className="mb-3 text-sm text-ink-soft">
            {playable} places are ready to visit. Places marked 🌱 are still growing — add the content below and they open up.
          </p>
          {reasons.length > 0 && (
            <ul className="mb-4 list-disc space-y-1 pl-5 text-sm text-ink-soft">
              {reasons.slice(0, 6).map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          )}
          <div className="flex flex-col gap-3">
            {o.worlds.map((w) => (
              <div key={w.id} className="flex flex-wrap items-center gap-2">
                <span className="w-48 shrink-0 text-sm font-bold">
                  {w.icon} {w.name}
                </span>
                {w.levels.map((l) => (
                  <span
                    key={l.id}
                    title={`${l.title} — ${l.gameName}${l.reason ? `: ${l.reason}` : ""}`}
                    className={`flex h-8 w-8 items-center justify-center rounded-full border text-sm ${
                      l.status === "completed" || l.status === "revisit"
                        ? "border-sage-deep bg-sage"
                        : l.status === "available"
                          ? "border-gold-deep bg-gold"
                          : l.status === "growing"
                            ? "border-dashed border-[#c9bfa9] bg-white"
                            : "border-[#e7e0d3] bg-cg-bg opacity-60"
                    }`}
                  >
                    {l.status === "growing" ? "🌱" : l.status === "locked" ? "·" : l.icon}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="flex flex-col gap-5">
        <OverviewMimo character={o.character} name={o.patient.addressAs} balance={o.wallet.balance} badges={o.badges} />
        <section className="cg-card p-5 text-sm">
          <h2 className="mb-2 text-lg font-extrabold">Library</h2>
          <ul className="grid grid-cols-2 gap-2">
            <li>📷 {o.library.photos} photos</li>
            <li>🎬 {o.library.videos} videos</li>
            <li>🎵 {o.library.audio} sounds</li>
            <li>🧑‍🤝‍🧑 {o.library.people} people</li>
          </ul>
        </section>
        <section className="cg-card p-5 text-sm">
          <h2 className="mb-2 text-lg font-extrabold">Caregivers</h2>
          <ul className="flex flex-col gap-1">
            {o.caregivers.map((c) => (
              <li key={c.email ?? c.name}>
                <b>{c.name}</b> — {c.relationship}
                {c.role === "owner" ? " (owner)" : ""}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
