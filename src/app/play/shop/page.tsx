import { ShopView } from "@/components/play/ShopView";
import { pagePatient } from "@/lib/auth/session";
import { shopState } from "@/lib/services/play";

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ category?: string; tab?: string }> }) {
  const p = await pagePatient();
  const sp = await searchParams;
  const state = await shopState({ patientId: p.patientId, code: p.profile.code, timezone: p.profile.timezone, addressAs: p.profile.addressAs });
  return <ShopView state={state} initialCategory={sp.tab === "collection" ? "collection" : (sp.category ?? "hat")} />;
}
