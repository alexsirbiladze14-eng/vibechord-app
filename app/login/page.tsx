"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
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
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        setInfo("Check your email to confirm your account, then log in.");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        router.push("/chat");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-rosewood px-4">
      <div className="absolute left-6 top-6">
        <Link
          href="/chat"
          className="flex items-center gap-2 text-sm text-ash transition-colors hover:text-parchment"
        >
          <ArrowLeft size={16} />
          Back to Vibechord
        </Link>
      </div>

      <div className="w-full max-w-sm rounded-xl border border-slate bg-rosewood/50 p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <h1 className="font-display text-2xl font-semibold text-parchment">
            {mode === "signup" ? "Create your account" : "Welcome Back"}
          </h1>
          <p className="mt-2 text-sm text-ash">
            {mode === "signup"
              ? "Sign up to save your sessions and unlock more credits."
              : "Log in to sync your sessions and gear presets."}
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <label className="text-xs font-medium text-ash uppercase tracking-wider">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-slate bg-slate/20 p-3 text-parchment placeholder:text-slate focus:border-brass/70 focus:outline-none focus:ring-1 focus:ring-brass/30 transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-ash uppercase tracking-wider">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-slate bg-slate/20 p-3 text-parchment placeholder:text-slate focus:border-brass/70 focus:outline-none focus:ring-1 focus:ring-brass/30 transition-all"
            />
          </div>

          {error && <p className="text-xs text-rust">{error}</p>}
          {info && <p className="text-xs text-moss">{info}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-6 w-full rounded-lg bg-brass py-3 text-sm font-medium text-rosewood transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? "…" : mode === "signup" ? "Sign Up" : "Sign In"}
          </button>
        </form>

        <div className="mt-6 text-center">
          {mode === "signin" ? (
            <p className="text-sm text-ash">
              Don&apos;t have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError(null);
                  setInfo(null);
                }}
                className="text-brass hover:underline"
              >
                Sign up
              </button>
            </p>
          ) : (
            <p className="text-sm text-ash">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setError(null);
                  setInfo(null);
                }}
                className="text-brass hover:underline"
              >
                Log in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
