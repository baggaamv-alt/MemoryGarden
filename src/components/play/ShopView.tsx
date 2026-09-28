"use client";

import { useMemo, useState } from "react";
import { GardenItemIcon } from "@/components/garden/art";
import { Mimo } from "@/components/mimo/Mimo";
import { Dialog } from "@/components/ui/Dialog";
import { Coin, LockIcon } from "@/components/ui/icons";
import { api, errorText } from "@/lib/client/api";
import { SHOP_CATEGORIES, type ShopCategory } from "@/lib/content/shop";
import type { shopState } from "@/lib/services/play";
import type { EquippedSlots } from "@/lib/types";
import { Petals, TopBar } from "./Chrome";
import { usePlay, type Effects } from "./PlayProvider";

type State = Awaited<ReturnType<typeof shopState>>;
type Item = State["items"][number];

const ANIM_ICON: Record<string, string> = { "anim-wave": "👋", "anim-sparkle": "✨", "anim-twirl": "🌀", "anim-dance": "💃" };

/** Cosmetic treasures bought with earned Memory Coins only — no real money, no chance-based boxes. */
export function ShopView({ state, initialCategory }: { state: State; initialCategory: string }) {
  const { t, lang, character, setCharacter, balance, setBalance, showEffects, sound, calm, toast } = usePlay();
  const [items, setItems] = useState(state.items);
  const [tab, setTab] = useState<ShopCategory | "collection">(
    initialCategory === "collection" || SHOP_CATEGORIES.some((c) => c.id === initialCategory) ? (initialCategory as ShopCategory) : "hat",
  );
  const [selected, setSelected] = useState<Item | null>(null);
  const [confirm, setConfirm] = useState<Item | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(0);
  const equipped: EquippedSlots = character?.equipped ?? {};

  const visible = useMemo(
    () => (tab === "collection" ? items.filter((i) => i.owned) : items.filter((i) => i.category === tab)),
    [items, tab],
  );

  async function buy(item: Item) {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ balance: number; effects: Effects }>("/api/play/shop", { body: { itemId: item.id } });
      setBalance(res.balance);
      showEffects(res.effects);
      setItems((list) => list.map((i) => (i.id === item.id ? { ...i, owned: true, placed: item.slot ? i.placed : true } : i)));
      sound("celebrate");
      toast("🎁", t("shop.bought"));
      setCelebrate((n) => n + 1);
      if (item.slot) await wear(item, true);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  async function wear(item: Item, on: boolean) {
    if (!item.slot || !character) return;
    setBusy(true);
    try {
      const res = await api<{ equipped: EquippedSlots; effects: Effects }>("/api/play/character", {
        method: "PATCH",
        body: { slot: item.slot, itemId: on ? item.id : null },
      });
      setCharacter({ ...character, equipped: res.equipped });
      setItems((list) => list.map((i) => (i.slot === item.slot ? { ...i, equipped: on && i.id === item.id } : i)));
      showEffects(res.effects);
      sound("tap");
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  async function place(item: Item, on: boolean) {
    setBusy(true);
    try {
      const res = await api<{ placed: string[]; effects: Effects }>("/api/play/garden", { body: { action: "place", itemId: item.id, placed: on } });
      setItems((list) => list.map((i) => (i.id === item.id ? { ...i, placed: res.placed.includes(i.id) } : i)));
      showEffects(res.effects);
      sound("tap");
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  const current = selected ? items.find((i) => i.id === selected.id) ?? selected : null;
  const isGarden = (i: Item) => i.category === "garden" || i.category === "seasonal";

  return (
    <div className="pb-16">
      {celebrate > 0 && <Petals key={celebrate} count={12} />}
      <TopBar title={t("shop.title", { mimo: character?.name ?? "Mimo" })} />
      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-5 px-3 pt-4 sm:px-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <div className="card flex flex-col items-center gap-3 p-5 text-center">
            {current && isGarden(current) ? (
              <div className="flex h-56 items-center justify-center">
                <GardenItemIcon id={current.id} size={200} />
              </div>
            ) : (
              <Mimo
                appearance={character?.appearance}
                equipped={equipped}
                preview={current && !current.equipped ? current.id : null}
                expression={current ? "happy" : "wave"}
                size={240}
                animated={!calm}
              />
            )}
            {current ? (
              <>
                <p className="text-sm font-bold uppercase tracking-wide text-ink-soft">{current.owned ? t("shop.owned") : t("shop.preview")}</p>
                <h2 className="text-2xl font-extrabold">{current.name}</h2>
                {current.seasonal && <p className="text-base text-ink-soft">🪔 {current.seasonal}</p>}
                <ItemActions
                  item={current}
                  balance={balance}
                  busy={busy}
                  onBuy={() => setConfirm(current)}
                  onWear={(on) => wear(current, on)}
                  onPlace={(on) => place(current, on)}
                />
              </>
            ) : (
              <p className="text-xl font-display font-bold">{t("shop.title", { mimo: character?.name ?? "Mimo" })}</p>
            )}
            {error && <p className="rounded-xl bg-coral/40 p-3 text-lg font-semibold">{error}</p>}
          </div>
        </aside>

        <section className="min-w-0">
          <nav className="no-scrollbar -mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-2" aria-label="Shop sections">
            {SHOP_CATEGORIES.map((c) => (
              <button
                key={c.id}
                className={`btn btn-sm shrink-0 ${tab === c.id ? "btn-peach" : ""}`}
                aria-pressed={tab === c.id}
                onClick={() => {
                  setTab(c.id);
                  setSelected(null);
                }}
              >
                <span aria-hidden="true">{c.icon}</span> {c.label[lang]}
              </button>
            ))}
            <button className={`btn btn-sm shrink-0 ${tab === "collection" ? "btn-lavender" : ""}`} aria-pressed={tab === "collection"} onClick={() => setTab("collection")}>
              💝 {t("shop.collection")}
            </button>
          </nav>

          {visible.length === 0 ? (
            <p className="card p-6 text-xl">{t("shop.emptyCollection")}</p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {visible.map((item) => (
                <li key={item.id}>
                  <button
                    className="option h-full !flex-col !justify-between !gap-2 !p-3"
                    data-state={current?.id === item.id ? "selected" : undefined}
                    onClick={() => {
                      sound("tap");
                      setSelected(item);
                    }}
                    aria-label={`${item.name}, ${item.owned ? t("shop.owned") : `${item.price} ${t("common.coinsShort")}`}`}
                  >
                    <span className="flex h-28 w-full items-center justify-center overflow-hidden rounded-2xl bg-cream">
                      {isGarden(item) ? (
                        <GardenItemIcon id={item.id} size={104} />
                      ) : item.category === "animation" ? (
                        <span className="text-6xl">{ANIM_ICON[item.id] ?? "✨"}</span>
                      ) : (
                        <Mimo appearance={character?.appearance} preview={item.id} size={124} animated={false} label={item.name} />
                      )}
                    </span>
                    <span className="text-center text-lg leading-tight">{item.name}</span>
                    <span className="flex items-center justify-center gap-1 text-base">
                      {item.owned ? (
                        <span className="pill !border-sage-deep !bg-[#eef8ea] !py-0.5 text-sm">
                          {item.equipped ? t("shop.wearing") : item.placed ? t("shop.placed") : t("shop.owned")}
                        </span>
                      ) : !item.unlocked ? (
                        <span className="flex items-center gap-1 text-ink-soft">
                          <LockIcon size={18} />
                        </span>
                      ) : (
                        <>
                          <Coin size={22} /> <span className="font-display font-extrabold">{item.price}</span>
                        </>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <Dialog open={!!confirm} onClose={() => setConfirm(null)} title={confirm ? t("shop.confirm", { item: confirm.name, n: confirm.price }) : ""}>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button className="btn btn-lg btn-sage flex-1" disabled={busy} onClick={() => confirm && buy(confirm)}>
            {t("shop.confirmYes")}
          </button>
          <button className="btn btn-lg flex-1" onClick={() => setConfirm(null)}>
            {t("common.notNow")}
          </button>
        </div>
      </Dialog>
    </div>
  );
}

function ItemActions({
  item,
  balance,
  busy,
  onBuy,
  onWear,
  onPlace,
}: {
  item: Item;
  balance: number;
  busy: boolean;
  onBuy: () => void;
  onWear: (on: boolean) => void;
  onPlace: (on: boolean) => void;
}) {
  const { t } = usePlay();
  if (!item.unlocked) {
    return (
      <p className="flex items-center gap-2 rounded-2xl bg-cream-deep px-4 py-3 text-lg font-display font-bold">
        <LockIcon size={22} /> {t("shop.opensAfter", { req: item.requirement ?? "" })}
      </p>
    );
  }
  if (!item.owned) {
    const short = item.price - balance;
    return (
      <div className="flex w-full flex-col gap-2">
        <button className="btn btn-lg btn-gold w-full" disabled={busy || short > 0} onClick={onBuy}>
          <Coin size={26} /> {t("shop.buy", { n: item.price })}
        </button>
        {short > 0 && <p className="text-lg text-ink-soft">{t("shop.needMore", { n: short })}</p>}
      </div>
    );
  }
  if (item.category === "garden" || item.category === "seasonal") {
    return (
      <button className={`btn btn-lg w-full ${item.placed ? "" : "btn-sage"}`} disabled={busy} onClick={() => onPlace(!item.placed)}>
        {item.placed ? t("shop.unplace") : t("shop.place")}
      </button>
    );
  }
  const isAnim = item.category === "animation";
  return (
    <button className={`btn btn-lg w-full ${item.equipped ? "" : "btn-sage"}`} disabled={busy} onClick={() => onWear(!item.equipped)}>
      {item.equipped ? (isAnim ? t("shop.stop") : t("shop.takeOff")) : isAnim ? t("shop.use") : t("shop.wear")}
    </button>
  );
}
