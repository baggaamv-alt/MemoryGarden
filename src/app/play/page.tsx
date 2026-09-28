import { redirect } from "next/navigation";
import { HomeView } from "@/components/play/HomeView";
import { pagePatient } from "@/lib/auth/session";
import { homeState } from "@/lib/services/play";

export default async function PlayHome() {
  const p = await pagePatient();
  const state = await homeState({
    patientId: p.patientId,
    code: p.profile.code,
    timezone: p.profile.timezone,
    addressAs: p.profile.addressAs,
  });
  if (!state.character) redirect("/play/welcome");
  return <HomeView state={state} />;
}
