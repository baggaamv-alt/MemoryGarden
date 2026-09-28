"use client";

import { Mimo } from "@/components/mimo/Mimo";

export function MimoHero() {
  return (
    <div className="relative mx-auto flex w-full max-w-sm items-center justify-center">
      <div className="absolute inset-6 rounded-full bg-gradient-to-br from-peach/80 via-gold/60 to-lavender/70 blur-2xl" aria-hidden="true" />
      <div className="relative">
        <Mimo
          appearance={{ color: "peach", sprout: "bud", cheeks: true }}
          equipped={{ hat: "hat-flowercrown", scarf: "scarf-silk", companion: "comp-butterfly", accessory: "acc-wateringcan" }}
          expression="wave"
          size={340}
          label="Mimo, the Memory Guardian"
        />
      </div>
    </div>
  );
}
