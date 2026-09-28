import { MapView } from "@/components/play/MapView";
import { pagePatient } from "@/lib/auth/session";
import { mapState } from "@/lib/services/play";

export default async function MapPage({ searchParams }: { searchParams: Promise<{ world?: string; level?: string }> }) {
  const p = await pagePatient();
  const sp = await searchParams;
  const state = await mapState({ patientId: p.patientId, code: p.profile.code, timezone: p.profile.timezone, addressAs: p.profile.addressAs });
  return <MapView worlds={state.worlds} focusWorld={sp.world ?? null} focusLevel={sp.level ?? null} />;
}
