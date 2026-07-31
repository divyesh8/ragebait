"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useCurrentUser, invalidateUserCache } from "@/lib/hooks/useCurrentUser";
import AuraBadge from "@/components/ui/AuraBadge";
import UnifiedSearchBox from "@/components/layout/UnifiedSearchBox";
import BrandLogo from "@/components/layout/BrandLogo";
import clsx from "clsx";

const navLinks = [
  { href: "/battles",     label: "Battles" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/partners",    label: "Partners" },
  { href: "/groups",      label: "Rage Groups" },
  { href: "/invites",     label: "Challenges" },
];

const creatorLink = { href: "/creator", label: "Creator Control Panel" };

export default function Navbar() {
  const { user, loading } = useCurrentUser();
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const [scrolled, setScrolled]       = useState(false);
  const [mobileOpen, setMobileOpen]   = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // Close mobile nav on route change
  useEffect(() => { setMobileOpen(false); setDropdownOpen(false); }, [pathname]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    invalidateUserCache();
    setDropdownOpen(false);
    router.push("/");
    router.refresh();
  }

  const avatarUrl = user?.avatar_url ||
    (user ? `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(user.username)}` : "");

  return (
    <>
      <div className="sticky top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4">
      <header className={clsx(
        "glass-nav mx-auto max-w-[1600px] rounded-[28px] transition-all duration-300",
        scrolled ? "shadow-[0_8px_40px_rgba(255,30,30,0.18)] border-white/15" : "shadow-[0_8px_30px_rgba(0,0,0,0.5)]"
      )}>
        <div className="flex items-center gap-4 px-5 py-2.5 lg:px-6">

          {/* ── Logo ── */}
          <BrandLogo size="sm" />

          {/* ── Search (logged-in users only) ── */}
          {user && (
          <div className="hidden flex-1 max-w-md md:flex">
            <UnifiedSearchBox />
          </div>
          )}

          {/* ── Desktop nav ── */}
          <nav className="hidden items-center gap-1 md:flex">
            {[...navLinks, ...(user?.isCreator ? [creatorLink] : [])].map((link) => {
              const active = pathname.startsWith(link.href);
              return (
                <Link key={link.href} href={link.href} className={clsx(
                  "relative rounded-full px-4 py-2 text-sm font-semibold transition-all duration-150",
                  active ? "bg-aura-purple/15 text-white shadow-glow-sm" : "text-white/55 hover:bg-white/5 hover:text-white"
                )}>
                  {link.label}
                  {link.href === "/creator" && <span className="ml-1 text-red-200">👑</span>}
                  {active && <span className="absolute -bottom-0.5 left-1/2 h-[2px] w-5 -translate-x-1/2 rounded-full bg-aura-purple shadow-[0_0_8px_rgba(255,30,30,0.9)]" />}
                </Link>
              );
            })}
          </nav>

          {/* ── Right side ── */}
          <div className="ml-auto flex items-center gap-2">

            {/* Loading skeleton — prevents flicker */}
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="h-6 w-16 animate-pulse rounded-full bg-white/10" />
                <div className="h-8 w-24 animate-pulse rounded-xl bg-white/10" />
              </div>

            ) : user ? (
              /* ── Logged in state ── */
              <>
                {/* Aura badge */}
                <Link href="/profile" className="hidden sm:flex">
                  <AuraBadge value={user.aura} size="sm" trend="neutral" />
                </Link>

                {user.isCreator && (
                  <Link
                    href="/creator"
                    title="Founder • Full Platform Access"
                    className="hidden rounded-full border border-red-400/40 bg-red-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-red-100 shadow-[0_0_20px_rgba(255,43,43,0.25)] transition hover:border-red-300 hover:bg-red-500/20 sm:inline-flex"
                  >
                    Creator
                  </Link>
                )}

                {/* Notifications bell */}
                <button className="relative hidden h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/50 transition hover:border-aura-purple/50 hover:text-white hover:shadow-glow-sm sm:flex">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-aura-purple shadow-[0_0_6px_rgba(255,30,30,0.9)]" />
                </button>

                {/* Avatar + dropdown */}
                <div ref={dropdownRef} className="relative">
                  <button
                    onClick={() => setDropdownOpen((v) => !v)}
                    className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm font-medium text-white/80 backdrop-blur-md transition-all hover:border-aura-purple/50 hover:bg-white/10"
                  >
                    <span className="relative flex h-6 w-6 items-center justify-center rounded-full ring-2 ring-aura-purple/70 shadow-[0_0_10px_rgba(255,30,30,0.6)]">
                      <img src={avatarUrl} alt={user.username} className="h-5 w-5 rounded-full" />
                    </span>
                    <span className="hidden sm:inline max-w-[90px] truncate">{user.username}</span>
                    <svg className={clsx("h-3 w-3 text-white/30 transition-transform duration-200", dropdownOpen && "rotate-180")} viewBox="0 0 12 12" fill="currentColor">
                      <path d="M6 8L1 3h10z" />
                    </svg>
                  </button>

                  {/* Dropdown menu */}
                  {dropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl border border-white/10 bg-[#0a0a0a]/95 backdrop-blur-xl py-1.5 shadow-[0_8px_40px_rgba(0,0,0,0.8)] animate-fadeIn">
                      {/* User info header */}
                      <div className="flex items-center gap-3 border-b border-white/8 px-4 py-3">
                        <img src={avatarUrl} alt={user.username} className="h-9 w-9 rounded-full ring-2 ring-aura-purple/60" />
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{user.username}</p>
                          {user.isCreator && (
                            <p title="Founder • Full Platform Access" className="text-[10px] font-black uppercase tracking-[0.2em] text-red-200">
                              Creator
                            </p>
                          )}
                          <AuraBadge value={user.aura} size="xs" trend="neutral" />
                        </div>
                      </div>
                      <Link href="/profile"  onClick={() => setDropdownOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/60 hover:bg-white/5 hover:text-white transition-colors">
                        <span>👤</span> Profile
                      </Link>
                      <Link href="/settings" onClick={() => setDropdownOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/60 hover:bg-white/5 hover:text-white transition-colors">
                        <span>⚙️</span> Settings
                      </Link>
                      <Link href="/battles"  onClick={() => setDropdownOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/60 hover:bg-white/5 hover:text-white transition-colors">
                        <span>⚔️</span> My Battles
                      </Link>
                      {user.isCreator && (
                        <Link href="/creator" onClick={() => setDropdownOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-100 hover:bg-red-500/10 hover:text-white transition-colors">
                          <span>👑</span> Creator Control Panel
                        </Link>
                      )}
                      <div className="my-1 border-t border-white/8" />
                      <button onClick={handleLogout} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-aura-purple/80 hover:bg-aura-purple/10 hover:text-aura-purple transition-colors">
                        <span>🚪</span> Log out
                      </button>
                    </div>
                  )}
                </div>
              </>

            ) : (
              /* ── Logged out state ── */
              <>
                <Link href="/login" className="hidden text-sm font-medium text-white/60 transition hover:text-white sm:block">
                  Log in
                </Link>
                <Link href="/signup" className="glossy-highlight rounded-full bg-aura-gradient px-5 py-2 text-sm font-bold text-white shadow-glow-sm transition hover:shadow-glow active:scale-95">
                  Join the Rage
                </Link>
              </>
            )}

            {/* Mobile toggle */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="ml-1 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/50 hover:text-white hover:border-aura-purple/50 md:hidden"
              aria-label="Menu"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {mobileOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                }
              </svg>
            </button>
          </div>
        </div>
      </header>
      </div>

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-[#050505]/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-72 border-l border-white/8 bg-[#0a0a0a] shadow-[0_0_60px_rgba(0,0,0,0.9)]">
            <div className="flex h-full flex-col p-6">
              <div className="mb-6 flex items-center justify-between">
                <BrandLogo size="sm" />
                <button onClick={() => setMobileOpen(false)} className="text-white/40 hover:text-white">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {user && (
                <div className="mb-6 flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.04] p-4">
                  <img src={avatarUrl} alt={user.username} className="h-10 w-10 rounded-full" />
                  <div>
                    <p className="font-semibold text-sm">{user.username}</p>
                    <AuraBadge value={user.aura} size="xs" trend="neutral" />
                  </div>
                </div>
              )}

              <nav className="flex-1 space-y-1">
                {[...navLinks, ...(user?.isCreator ? [creatorLink] : [])].map((link) => (
                  <Link key={link.href} href={link.href} className={clsx(
                    "flex items-center rounded-xl px-4 py-3 text-sm font-medium transition-all",
                    pathname.startsWith(link.href) ? "bg-aura-purple/12 text-white border border-aura-purple/25" : "text-white/60 hover:bg-white/5 hover:text-white"
                  )}>
                    {link.label}{link.href === "/creator" ? " 👑" : ""}
                  </Link>
                ))}
                {user && (
                  <>
                    <Link href="/profile"  className={clsx("flex items-center rounded-xl px-4 py-3 text-sm font-medium transition-all", pathname === "/profile"  ? "bg-aura-purple/12 text-white border border-aura-purple/25" : "text-white/60 hover:bg-white/5 hover:text-white")}>Profile</Link>
                    <Link href="/settings" className={clsx("flex items-center rounded-xl px-4 py-3 text-sm font-medium transition-all", pathname === "/settings" ? "bg-aura-purple/12 text-white border border-aura-purple/25" : "text-white/60 hover:bg-white/5 hover:text-white")}>Settings</Link>
                  </>
                )}
              </nav>

              <div className="mt-auto border-t border-white/8 pt-6">
                {user ? (
                  <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-aura-purple/80 hover:bg-aura-purple/10 hover:text-aura-purple">
                    <span>🚪</span> Log out
                  </button>
                ) : (
                  <div className="flex flex-col gap-3">
                    <Link href="/login"><button className="w-full rounded-full border border-white/8 bg-white/[0.04] px-6 py-3 text-sm font-semibold text-white">Log in</button></Link>
                    <Link href="/signup"><button className="w-full rounded-full bg-aura-gradient px-6 py-3 text-sm font-bold text-white shadow-glow-sm">Join the Rage</button></Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
