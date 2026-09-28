"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, errorText } from "@/lib/client/api";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api(mode === "login" ? "/api/auth/login" : "/api/auth/signup", {
        body: mode === "login" ? { email, password } : { name, email, password },
      });
      router.replace("/caregiver");
      router.refresh();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      {mode === "signup" && (
        <div>
          <label htmlFor="name" className="cg-label">
            Your name
          </label>
          <input id="name" className="cg-input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
        </div>
      )}
      <div>
        <label htmlFor="email" className="cg-label">
          Email
        </label>
        <input id="email" type="email" className="cg-input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
      </div>
      <div>
        <label htmlFor="password" className="cg-label">
          Password {mode === "signup" && <span className="font-normal">(at least 8 characters)</span>}
        </label>
        <input
          id="password"
          type="password"
          className="cg-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
          minLength={mode === "signup" ? 8 : undefined}
        />
      </div>
      {error && (
        <p className="rounded-xl bg-[#fdf1ef] p-3 text-sm font-semibold text-coral-deep" role="alert">
          {error}
        </p>
      )}
      <button className="cg-btn cg-btn-primary !min-h-12 text-base" disabled={busy}>
        {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
      </button>
      <p className="text-center text-sm text-ink-soft">
        {mode === "login" ? (
          <>
            New here?{" "}
            <Link href="/signup" className="font-bold text-sage-deep underline">
              Create a caregiver account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-bold text-sage-deep underline">
              Sign in
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
