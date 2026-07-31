"use client";

/**
 * Root error boundary. Before this existed, an unhandled render/runtime error
 * anywhere in the app showed Next.js's raw error screen (or a white page in
 * production), which is jarring and off-brand. This catches it, logs it, and
 * gives the user a branded recovery path with a working Retry (`reset()`).
 */
import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Unhandled app error:", error);
  }, [error]);

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center bg-[#050505] px-6 text-center">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(255,43,43,0.14),transparent_45%)]" />
      <div className="relative max-w-md">
        <p className="font-display text-6xl font-black text-white">
          RAGE<span className="text-gradient-rage">QUIT</span>
        </p>
        <h1 className="mt-4 font-display text-2xl font-bold text-white">Something broke mid-battle.</h1>
        <p className="mt-3 text-sm text-white/50">
          An unexpected error interrupted this page. It has been logged. You can retry, or head back to the arena.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-xl bg-aura-gradient px-6 py-3 text-sm font-bold text-void transition hover:opacity-90"
          >
            Retry
          </button>
          <Link
            href="/"
            className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-white/80 transition hover:border-white/25 hover:text-white"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
