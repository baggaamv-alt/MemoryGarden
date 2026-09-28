import { notFound } from "next/navigation";
import { GameRunner } from "@/components/games/GameRunner";
import { pagePatient } from "@/lib/auth/session";
import { getSessionView } from "@/lib/game/engine";

export default async function SessionPage({ params }: { params: Promise<{ sid: string }> }) {
  const { sid } = await params;
  const p = await pagePatient();
  const session = await getSessionView(p.patientId, sid).catch(() => null);
  if (!session) notFound();
  return <GameRunner initial={session} />;
}
