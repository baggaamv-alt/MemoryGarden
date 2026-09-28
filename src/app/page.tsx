import Link from "next/link";
import { MimoHero } from "@/components/landing/MimoHero";
import { getCaregiver, getPatientContext } from "@/lib/auth/session";

export default async function Landing() {
  const [caregiver, patient] = await Promise.all([getCaregiver(), getPatientContext()]);
  return (
    <main className="min-h-dvh bg-gradient-to-b from-sky/60 via-cream to-cream">
      <div className="mx-auto flex max-w-5xl flex-col gap-10 px-5 pb-16 pt-10 sm:pt-16">
        <section className="grid items-center gap-8 md:grid-cols-[1.1fr_1fr]">
          <div className="flex flex-col gap-5">
            <p className="pill w-fit bg-paper text-base">🌷 Memory Garden</p>
            <h1 className="text-5xl font-extrabold leading-[1.05] sm:text-6xl">
              Every photograph is a doorway to a familiar world.
            </h1>
            <p className="max-w-xl text-xl text-ink-soft">
              A warm, personal memory adventure for people living with dementia — built from their own photographs, voices and stories, and guided by
              Mimo, a gentle garden friend. Nobody is being tested here.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              {patient && (
                <Link href="/play" className="btn btn-lg btn-sage">
                  🌼 Continue to Memory Garden
                </Link>
              )}
              {caregiver ? (
                <Link href={caregiver.session.locked ? "/unlock" : "/caregiver"} className="btn btn-lg btn-peach">
                  Caregiver dashboard
                </Link>
              ) : (
                <>
                  <Link href="/login" className="btn btn-lg btn-peach">
                    Caregiver sign in
                  </Link>
                  <Link href="/signup" className="btn btn-lg">
                    Create a caregiver account
                  </Link>
                </>
              )}
            </div>
          </div>
          <MimoHero />
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {[
            ["🗺️", "An adventure map", "Five cozy worlds — the Garden, the Family Village, Festival Street, the Memory Meadow and the Golden Years — each with ten gentle places to visit."],
            ["📸", "Made from real memories", "Caregivers upload family photos, videos and voices. Cloudinary organises them, and each activity is created from those memories."],
            ["🎀", "Rewards for taking part", "Memory Coins for joining in (never for perfect answers), a growing garden, and treasures for Mimo."],
          ].map(([icon, title, body]) => (
            <div key={title} className="card flex flex-col gap-2 p-6">
              <span className="text-4xl" aria-hidden="true">
                {icon}
              </span>
              <h2 className="text-2xl font-extrabold">{title}</h2>
              <p className="text-lg text-ink-soft">{body}</p>
            </div>
          ))}
        </section>

        <section className="card grid gap-6 p-6 sm:grid-cols-2 sm:p-8">
          <div>
            <h2 className="mb-2 text-2xl font-extrabold">Kind by design</h2>
            <ul className="flex flex-col gap-2 text-lg text-ink-soft">
              <li>✿ No scores, no “wrong”, no easy/medium/hard labels.</li>
              <li>✿ More challenge only when the person says “Yes, let&apos;s try!”.</li>
              <li>✿ Skipping is always fine. Coins are never taken away.</li>
              <li>✿ Large text, calm mode, clearer colours, English and తెలుగు.</li>
            </ul>
          </div>
          <div>
            <h2 className="mb-2 text-2xl font-extrabold">Private by default</h2>
            <ul className="flex flex-col gap-2 text-lg text-ink-soft">
              <li>✿ Photos are stored as authenticated Cloudinary assets — every view is a server-signed URL.</li>
              <li>✿ Only caregivers linked to a person can see their memories and activity.</li>
              <li>✿ Caregivers approve every memory and every caption before it is used.</li>
              <li>✿ Insights describe game activity only — never a diagnosis.</li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
