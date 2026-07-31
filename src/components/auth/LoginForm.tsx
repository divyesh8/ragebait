"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { refreshUserCache } from "@/lib/hooks/useCurrentUser";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      // Fetch fresh user data before navigating so Navbar updates immediately
      await refreshUserCache();

      // Send the user back to wherever middleware bounced them from, if anywhere.
      const next = searchParams?.get("next");
      router.push(next && next.startsWith("/") ? next : "/");
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
      setLoading(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
      {error && (
        <div className="animate-fadeIn rounded-xl border border-aura-purple/40 bg-aura-purple/10 px-4 py-3 text-sm text-aura-purple">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="identifier" className="block text-xs font-medium uppercase tracking-wide text-white/50">
          Username or email
        </label>
        <input
          id="identifier"
          name="identifier"
          type="text"
          autoComplete="username"
          required
          autoFocus
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/25 backdrop-blur-md transition-all duration-200 focus:border-aura-purple/60 focus:bg-white/[0.08] focus:shadow-[0_0_0_3px_rgba(166,91,255,0.15)] focus:outline-none"
          placeholder="VoidRoaster or you@example.com"
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="block text-xs font-medium uppercase tracking-wide text-white/50">
            Password
          </label>
          <a href="#" className="text-xs font-medium text-white/60 transition hover:text-white hover:underline">
            Forgot password?
          </a>
        </div>
        <div className="relative mt-2">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-12 text-sm text-white placeholder:text-white/25 backdrop-blur-md transition-all duration-200 focus:border-aura-purple/60 focus:bg-white/[0.08] focus:shadow-[0_0_0_3px_rgba(166,91,255,0.15)] focus:outline-none"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-white/30 hover:text-white/70"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="group relative w-full overflow-hidden rounded-xl bg-aura-gradient px-6 py-3.5 text-sm font-bold text-void shadow-glow transition-all duration-200 hover:shadow-[0_0_55px_rgba(166,91,255,0.55)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="relative z-10">{loading ? "Entering the arena…" : "Log in"}</span>
        <span className="absolute inset-0 -translate-x-full bg-white/25 transition-transform duration-700 group-hover:translate-x-full" />
      </button>

      <div className="flex items-center gap-3 py-1">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-[11px] uppercase tracking-widest text-white/30">or</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <button
        type="button"
        disabled
        title="Coming soon"
        className="flex w-full cursor-not-allowed items-center justify-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-white/40 backdrop-blur-md transition hover:border-white/20"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24">
          <path fill="currentColor" d="M21.8 12.23c0-.7-.06-1.38-.18-2.04H12v3.86h5.5a4.7 4.7 0 01-2.04 3.09v2.55h3.3c1.93-1.78 3.04-4.4 3.04-7.46z" opacity=".5" />
          <path fill="currentColor" d="M12 22c2.76 0 5.08-.91 6.77-2.46l-3.3-2.55c-.92.62-2.1.98-3.47.98-2.67 0-4.93-1.8-5.74-4.23H2.86v2.63A10 10 0 0012 22z" opacity=".5" />
          <path fill="currentColor" d="M6.26 13.74A5.99 5.99 0 016 12c0-.6.1-1.2.26-1.74V7.63H2.86A10 10 0 002 12c0 1.61.39 3.14 2.86 4.37l3.4-2.63z" opacity=".5" />
          <path fill="currentColor" d="M12 6.18c1.5 0 2.84.52 3.9 1.53l2.92-2.92C16.94 3.14 14.7 2 12 2 7.97 2 4.48 4.27 2.86 7.63l3.4 2.63C7.07 7.98 9.33 6.18 12 6.18z" opacity=".5" />
        </svg>
        Continue with Google
        <span className="ml-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/40">Soon</span>
      </button>
    </form>
  );
}
