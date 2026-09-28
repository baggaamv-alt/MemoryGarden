import { JourneyView } from "@/components/play/JourneyView";
import { pagePatient } from "@/lib/auth/session";
import { journeyState } from "@/lib/services/play";

export default async function JourneyPage() {
  const p = await pagePatient();
  const state = await journeyState({ patientId: p.patientId, code: p.profile.code, timezone: p.profile.timezone, addressAs: p.profile.addressAs });
  return <JourneyView state={state} />;
}
