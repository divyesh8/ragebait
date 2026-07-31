/**
 * Root loading UI — shows during navigation and server data fetching for every
 * route (App Router wraps the layout's children in a Suspense boundary using
 * this file). Before this existed, route transitions showed a blank screen,
 * which made the app feel slow and unfinished. On-brand glass + pulse.
 */
export default function Loading() {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-[#050505]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(166,91,255,0.12),transparent_45%)]" />
      <div className="relative flex flex-col items-center gap-5">
        <div className="relative h-14 w-14">
          <div className="absolute inset-0 animate-ping rounded-2xl bg-aura-purple/30" />
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl">
            <span className="font-display text-lg font-black text-white">R</span>
          </div>
        </div>
        <p className="animate-pulse text-xs font-semibold uppercase tracking-[0.35em] text-white/40">
          Loading the arena
        </p>
      </div>
    </div>
  );
}
