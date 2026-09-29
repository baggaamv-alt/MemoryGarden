"use client";

import { LocalTime } from "@/components/ui/LocalTime";
import Link from "next/link";
import { useState } from "react";
import type { patientInsights } from "@/lib/services/insights";
import { Empty, Notice, Section } from "./ui";

type Data = Awaited<ReturnType<typeof patientInsights>>;

// Validated with the dataviz palette checker (light surface). Gold is below 3:1 contrast,
// so these charts always ship with a legend, hover values and the table view below.
const SERIES = [
  { key: "completed", label: "Finished", color: "#4f8a4b" },
  { key: "endedEarly", label: "Stopped early", color: "#3f86b8" },
  { key: "skipped", label: "Skipped", color: "#c9962e" },
] as const;

export function InsightsView({ data, patientId, name }: { data: Data; patientId: string; name: string }) {
  const s = data.summary;
  const base = `/caregiver/patients/${patientId}/insights`;
  return (
    <div className="flex flex-col gap-5">
      <Notice tone="info">
        <b>About these insights.</b> {data.disclaimer}
      </Notice>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-bold">Period:</span>
        {[14, 30, 90].map((d) => (
          <Link key={d} href={`${base}?days=${d}`} className={`cg-btn !min-h-8 ${data.days === d ? "!border-sage-deep !bg-[#eef8ea]" : ""}`}>
            {d} days
          </Link>
        ))}
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Activities this week" value={s.activitiesThisWeek} sub={`${s.activitiesLastWeek} the week before`} />
        <Tile label="Minutes this week" value={s.minutesThisWeek} sub={`${s.minutesLastWeek} the week before`} />
        <Tile label="Active days (last 14)" value={s.activeDays} sub={`${s.togetherSessions} played together`} />
        <Tile label="Breaks" value={s.breaksTaken} sub={`taken of ${s.breakReminders} reminders`} />
      </section>

      {data.statements.length > 0 && (
        <Section title="In plain words">
          <ul className="flex flex-col gap-2 text-sm">
            {data.statements.map((x) => (
              <li key={x} className="flex gap-2">
                <span aria-hidden="true">✿</span>
                {x}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Activities per day" description={`Each bar is one day (${name}'s time zone).`}>
        {data.daily.every((d) => d.completed + d.endedEarly + d.skipped === 0) ? (
          <Empty icon="📅" title="No activities in this period yet" />
        ) : (
          <DailyBars daily={data.daily} />
        )}
      </Section>

      <Section
        title="By activity"
        description="First-try share compares sessions of the same activity at the same setting only. It describes game play, not memory."
      >
        {data.perGame.length === 0 ? (
          <Empty icon="🧩" title="No activities yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-ink-faint">
                <tr>
                  <th className="py-2 pr-3">Activity</th>
                  <th className="py-2 pr-3 text-right">Sessions</th>
                  <th className="py-2 pr-3 text-right">Finished / stopped / skipped</th>
                  <th className="py-2 pr-3 text-right">First-try share</th>
                  <th className="py-2 pr-3 text-right">Hints per round</th>
                  <th className="py-2 pr-3 text-right">Typical answer time</th>
                  <th className="py-2 pr-3">Recent sessions (current setting)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#efe8dc]">
                {data.perGame.map((g) => (
                  <tr key={g.game}>
                    <td className="py-2 pr-3 font-bold">
                      {g.icon} {g.name}
                      {g.currentSetting && <span className="ml-1 text-xs font-normal text-ink-faint">setting {g.currentSetting}</span>}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">{g.sessions}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {g.completed} / {g.endedEarly} / {g.skipped}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">{g.firstTryRate === null ? "—" : `${Math.round(g.firstTryRate * 100)}%`}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{g.hintsPerRound === null ? "—" : g.hintsPerRound.toFixed(1)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{g.medianResponseMs ? `${(g.medianResponseMs / 1000).toFixed(1)} s` : "—"}</td>
                    <td className="py-2 pr-3">
                      <Spark series={g.series} label={g.name} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Memories that came up most">
          {data.categories.length === 0 ? (
            <p className="text-sm text-ink-soft">Nothing yet.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {data.categories.map((c) => (
                <li key={c.category} className="flex items-center gap-3">
                  <span className="w-32">
                    {c.icon} {c.label}
                  </span>
                  <span className="h-2 rounded-full bg-sage-deep" style={{ width: `${(c.sessions / data.categories[0].sessions) * 60}%` }} />
                  <span className="tabular-nums text-ink-soft">{c.sessions}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
        <Section title="Challenge questions" description={`Every change was ${name}'s own answer to Mimo.`}>
          {data.challengeLog.length === 0 ? (
            <p className="text-sm text-ink-soft">Mimo hasn&apos;t asked yet — offers appear only after several comfortable sessions.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {data.challengeLog.map((c) => (
                <li key={c.id}>
                  <span className="text-ink-soft"><LocalTime iso={c.at} date /></span> · {c.game}: {c.direction === "up" ? "a little more challenge" : "a gentler setting"} ({c.from}→
                  {c.to}) — <b>{c.status === "accepted" ? "yes, let's try" : c.status === "keep_familiar" ? "keep it familiar" : c.status === "later" ? "maybe later" : "not answered yet"}</b>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <Section title="Activity history">
        {data.history.length === 0 ? (
          <Empty icon="📜" title="No activities yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-ink-faint">
                <tr>
                  <th className="py-2 pr-3">When</th>
                  <th className="py-2 pr-3">Activity</th>
                  <th className="py-2 pr-3">Outcome</th>
                  <th className="py-2 pr-3 text-right">Minutes</th>
                  <th className="py-2 pr-3 text-right">Rounds</th>
                  <th className="py-2 pr-3 text-right">First try</th>
                  <th className="py-2 pr-3 text-right">Tries</th>
                  <th className="py-2 pr-3 text-right">Hints</th>
                  <th className="py-2 pr-3 text-right">Skips</th>
                  <th className="py-2 pr-3 text-right">Coins</th>
                  <th className="py-2 pr-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#efe8dc]">
                {data.history.map((h) => (
                  <tr key={h.id}>
                    <td className="py-2 pr-3 whitespace-nowrap text-ink-soft"><LocalTime iso={h.at} /></td>
                    <td className="py-2 pr-3">
                      <b>{h.gameName}</b> · {h.title}
                    </td>
                    <td className="py-2 pr-3">{h.status === "completed" ? "Finished" : h.status === "ended_early" ? "Stopped early" : "Skipped"}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{h.minutes}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {h.roundsCompleted}/{h.rounds}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">{h.firstTry}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{h.attempts}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{h.hints}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{h.skips}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{h.coins}</td>
                    <td className="py-2 pr-3 text-xs text-ink-soft">
                      setting {h.setting}
                      {h.together ? " · together" : ""}
                      {h.source ? ` · ${h.source === "cloudinary-search" ? "via Search API" : h.source}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}

function Tile({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className="cg-card p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-ink-faint">{label}</p>
      <p className="text-3xl font-extrabold tabular-nums">{value}</p>
      <p className="text-xs text-ink-soft">{sub}</p>
    </div>
  );
}

/** Stacked daily bars with a hover/focus tooltip and a legend (identity never by colour alone). */
function DailyBars({ daily }: { daily: Data["daily"] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...daily.map((d) => d.completed + d.endedEarly + d.skipped));
  const W = 720;
  const H = 200;
  const pad = { l: 28, r: 8, t: 10, b: 24 };
  const bw = (W - pad.l - pad.r) / daily.length;
  const y = (v: number) => ((H - pad.t - pad.b) * v) / max;
  const ticks = [...new Set([0, Math.ceil(max / 2), max])];
  const h = hover !== null ? daily[hover] : null;
  return (
    <div className="relative">
      <div className="mb-2 flex flex-wrap gap-4 text-xs">
        {SERIES.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Activities per day, stacked by outcome" onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={H - pad.b - y(t)} y2={H - pad.b - y(t)} stroke="#efe8dc" />
            <text x={pad.l - 6} y={H - pad.b - y(t) + 4} textAnchor="end" fontSize="10" fill="#8a82a0">
              {t}
            </text>
          </g>
        ))}
        {daily.map((d, i) => {
          let acc = 0;
          const x = pad.l + i * bw + bw * 0.18;
          const w = Math.max(2, bw * 0.64);
          return (
            <g key={d.day}>
              {SERIES.map((s) => {
                const v = d[s.key];
                if (!v) return null;
                const top = H - pad.b - y(acc + v);
                const hgt = Math.max(1, y(v) - 2);
                acc += v;
                return <rect key={s.key} x={x} y={top} width={w} height={hgt} rx={3} fill={s.color} opacity={hover === null || hover === i ? 1 : 0.45} />;
              })}
              {(i % Math.ceil(daily.length / 8) === 0 || i === daily.length - 1) && (
                <text x={x + w / 2} y={H - 8} textAnchor="middle" fontSize="10" fill="#8a82a0">
                  {d.day.slice(5)}
                </text>
              )}
              <rect
                x={pad.l + i * bw}
                y={pad.t}
                width={bw}
                height={H - pad.t - pad.b}
                fill="transparent"
                tabIndex={0}
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                aria-label={`${d.day}: ${d.completed} finished, ${d.endedEarly} stopped early, ${d.skipped} skipped, ${d.minutes} minutes`}
              />
            </g>
          );
        })}
      </svg>
      {h && hover !== null && (
        <div
          className="pointer-events-none absolute top-8 z-10 rounded-lg border border-[#e7e0d3] bg-white px-3 py-2 text-xs shadow-soft"
          style={{ left: `${Math.min(80, ((pad.l + hover * bw) / W) * 100)}%` }}
        >
          <p className="font-bold">{h.day}</p>
          {SERIES.map((s) => (
            <p key={s.key} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm" style={{ background: s.color }} />
              {s.label}: <b>{h[s.key]}</b>
            </p>
          ))}
          <p className="text-ink-soft">{h.minutes} minutes</p>
        </div>
      )}
    </div>
  );
}

/** Single-series first-try share per session (0–100%), with per-dot tooltips via <title>. */
function Spark({ series, label }: { series: { at: string; rate: number | null; hints: number }[]; label: string }) {
  const pts = series.filter((p) => p.rate !== null) as { at: string; rate: number; hints: number }[];
  if (pts.length < 2) return <span className="text-xs text-ink-faint">needs 2+ sessions</span>;
  const W = 150;
  const H = 36;
  const x = (i: number) => 5 + (i * (W - 10)) / (pts.length - 1);
  const yv = (r: number) => H - 5 - r * (H - 10);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={`${label}: first-try share in recent sessions`}>
      <line x1="0" x2={W} y1={yv(0.5)} y2={yv(0.5)} stroke="#efe8dc" strokeDasharray="2 3" />
      <polyline points={pts.map((p, i) => `${x(i)},${yv(p.rate)}`).join(" ")} fill="none" stroke="#4f8a4b" strokeWidth="2" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle key={p.at} cx={x(i)} cy={yv(p.rate)} r="4" fill="#4f8a4b" stroke="#fff" strokeWidth="2">
          <title>{`${p.at.slice(0, 10)}: ${Math.round(p.rate * 100)}% first try, ${p.hints} hints`}</title>
        </circle>
      ))}
    </svg>
  );
}
