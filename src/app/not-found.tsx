import Link from "next/link";

/**
 * Branded 404. Before this existed, unknown or guessed URLs (and the creator
 * panel's deliberate notFound() responses) fell back to Next.js's default 404,
 * which is off-brand and a dead end. This gives a clear route back into the app.
 */
export default function NotFound() {
  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center bg-[#050505] px-6 text-center">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(166,91,255,0.12),transparent_45%)]" />
      <div className="relative max-w-md">
        <p className="font-display text-7xl font-black text-white">4<span className="text-gradient-rage">0</span>4</p>
        <h1 className="mt-4 font-display text-2xl font-bold text-white">This battle doesn&apos;t exist.</h1>
        <p className="mt-3 text-sm text-white/50">
          The page you&apos;re looking for was moved, deleted, or never existed.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/"
            className="rounded-xl bg-aura-gradient px-6 py-3 text-sm font-bold text-void transition hover:opacity-90"
          >
            Back to home
          </Link>
          <Link
            href="/battles"
            className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-white/80 transition hover:border-white/25 hover:text-white"
          >
            Browse battles
          </Link>
        </div>
      </div>
    </div>
  );
}
