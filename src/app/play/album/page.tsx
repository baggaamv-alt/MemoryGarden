import { headers } from "next/headers";
import { AlbumView } from "@/components/play/AlbumView";
import { pagePatient } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { albumState } from "@/lib/services/play";
import { getPreferences } from "@/lib/services/preferences";

export default async function AlbumPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const p = await pagePatient();
  const sp = await searchParams;
  const h = await headers();
  const prefs = await getPreferences(await getDb(), p.patientId);
  const saveData = h.get("save-data") === "on" || prefs.accessibility.lowBandwidth;
  const state = await albumState({ patientId: p.patientId, code: p.profile.code, timezone: p.profile.timezone, addressAs: p.profile.addressAs }, { saveData });
  const tab = sp.tab === "badges" || sp.tab === "favorites" || sp.tab === "explore" ? sp.tab : "stamps";
  return <AlbumView state={state} initialTab={tab} />;
}
