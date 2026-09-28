import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { PlayProvider } from "@/components/play/PlayProvider";
import { pagePatient } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { characters } from "@/lib/db/schema";
import { getWallet } from "@/lib/game/rewards";
import { getPreferences } from "@/lib/services/preferences";

export const metadata: Metadata = { title: { absolute: "Memory Garden" } };

export default async function PlayLayout({ children }: { children: React.ReactNode }) {
  const p = await pagePatient();
  const db = await getDb();
  const prefs = await getPreferences(db, p.patientId);
  const [character] = await db.select().from(characters).where(eq(characters.patientId, p.patientId)).limit(1);
  const wallet = await getWallet(db, p.patientId);
  return (
    <PlayProvider
      init={{
        lang: prefs.language === "te" ? "te" : "en",
        accessibility: prefs.accessibility,
        voice: prefs.voice,
        character: character ? { name: character.name, appearance: character.appearance, equipped: character.equipped } : null,
        balance: wallet.balance,
        patientName: p.profile.addressAs,
        breakReminderMinutes: prefs.breakReminderMinutes,
        sessionMinutes: prefs.sessionMinutes,
      }}
    >
      {children}
    </PlayProvider>
  );
}
