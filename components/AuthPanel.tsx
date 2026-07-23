"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  user: { id: string; email: string } | null;
  credits: number | null;
};

export default function AuthPanel({ user, credits }: Props) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setIsSubmitting(true);

    try {
      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
        setInfo("Check your email to confirm your account, then log in.");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  if (user) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-slate bg-rosewood/60 px-4 py-3">
        <div className="font-mono text-xs text-ash">
          Signed in as <span className="text-parchment">{user.email}</span>
          {credits !== null && (
            <span className="ml-2 text-brass">· {credits} credits</span>
          )}
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="font-mono text-xs text-ash underline decoration-ash/40 underline-offset-4 hover:text-parchment"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-slate bg-rosewood/60 p-4"
    >
      <div className="mb-3 flex gap-4 font-mono text-xs">
        <button
          type="button"
          onClick={() => setMode("signin")}
          className={mode === "signin" ? "text-brass" : "text-ash"}
        >
          Log in
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={mode === "signup" ? "text-brass" : "text-ash"}
        >
          Sign up
        </button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="flex-1 rounded-md border border-slate bg-rosewood px-3 py-2 text-sm text-parchment placeholder:text-ash/60 focus:border-brass"
        />
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password"
          className="flex-1 rounded-md border border-slate bg-rosewood px-3 py-2 text-sm text-parchment placeholder:text-ash/60 focus:border-brass"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="shrink-0 rounded-md bg-brass px-4 py-2 text-sm font-medium text-rosewood transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? "…" : mode === "signup" ? "Sign up" : "Log in"}
        </button>
      </div>

      {error && <p className="mt-2 text-xs text-rust">{error}</p>}
      {info && <p className="mt-2 text-xs text-moss">{info}</p>}
      <p className="mt-2 text-xs text-ash">
        Signing in isn't required to use Vibechord — it's only needed to
        save songs across visits and to buy credits.
      </p>
    </form>
  );
}
