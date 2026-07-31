"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type UnifiedSearchResult = {
  id: string;
  type: "battle" | "player" | "topic";
  title: string;
  subtitle: string;
  href: string;
  avatarUrl?: string | null;
};

const typeLabels = {
  battle: "Battle",
  player: "Player",
  topic: "Topic",
};

export default function UnifiedSearchBox() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UnifiedSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, { credentials: "include" });
        const data = await res.json();
        setResults(data.results ?? []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => window.clearTimeout(timer);
  }, [query]);

  function go(result: UnifiedSearchResult) {
    setQuery("");
    setOpen(false);
    router.push(result.href);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (results[0]) go(results[0]);
  }

  return (
    <div ref={wrapRef} className="relative w-full">
      <form
        onSubmit={submit}
        className="flex w-full items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/40 transition focus-within:border-aura-purple/60 focus-within:bg-white/[0.08] focus-within:shadow-glow-sm"
      >
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="11" cy="11" r="7" />
          <path strokeLinecap="round" d="M21 21l-4.3-4.3" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search battles, players, topics..."
          className="w-full bg-transparent text-white placeholder:text-white/30 focus:outline-none"
        />
        {loading && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-aura-purple" />}
      </form>

      {open && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[420px] overflow-y-auto rounded-3xl border border-white/10 bg-[#070707]/95 p-2 shadow-[0_18px_70px_rgba(0,0,0,0.85)] backdrop-blur-2xl">
          {results.length === 0 && !loading ? (
            <p className="px-4 py-4 text-sm text-white/35">No matches found.</p>
          ) : (
            results.map((result) => (
              <button
                key={`${result.type}-${result.id}`}
                type="button"
                onClick={() => go(result)}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-white/[0.06]"
              >
                <ResultIcon result={result} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-white">{result.title}</span>
                  <span className="block truncate text-xs text-white/38">{result.subtitle}</span>
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-black uppercase tracking-wider text-white/40">
                  {typeLabels[result.type]}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function ResultIcon({ result }: { result: UnifiedSearchResult }) {
  if (result.type === "player") {
    return (
      <img
        src={result.avatarUrl || `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(result.title)}`}
        alt={result.title}
        className="h-9 w-9 rounded-xl border border-aura-purple/30"
      />
    );
  }

  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/65">
      {result.type === "battle" ? (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
          <path d="M13 19l6-6" />
          <path d="M16 16l4 4" />
        </svg>
      ) : (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path d="M4 12h16" />
          <path d="M12 4v16" />
        </svg>
      )}
    </span>
  );
}
