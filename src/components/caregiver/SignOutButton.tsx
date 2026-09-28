"use client";

import { useRouter } from "next/navigation";
import { api } from "@/lib/client/api";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      className="cg-btn"
      onClick={async () => {
        await api("/api/auth/logout", { body: {} }).catch(() => undefined);
        router.replace("/");
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
