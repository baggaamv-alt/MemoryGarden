"use client";

import { Mimo } from "@/components/mimo/Mimo";

export function MimoBadge({ size = 52 }: { size?: number }) {
  return <Mimo appearance={{ color: "peach", sprout: "leaf" }} size={size} animated={false} label="Memory Garden" />;
}
