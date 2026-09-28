import { GardenView } from "@/components/play/GardenView";
import { pagePatient } from "@/lib/auth/session";
import { gardenView } from "@/lib/services/play";

export default async function GardenPage() {
  const p = await pagePatient();
  const state = await gardenView({ patientId: p.patientId, code: p.profile.code, timezone: p.profile.timezone, addressAs: p.profile.addressAs });
  return <GardenView state={state} />;
}
