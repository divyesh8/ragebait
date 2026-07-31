"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import AuraBadge from "@/components/ui/AuraBadge";
import BrandLogo from "@/components/layout/BrandLogo";

// Pages where the sidebar should never appear
const AUTH_PATHS = ["/login", "/signup"];

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  requiresAuth?: boolean;
}

const items: NavItem[] = [
  { href: "/",            label: "Home",        icon: HomeIcon,  requiresAuth: false },
  { href: "/battles",     label: "Battles",      icon: SwordIcon, requiresAuth: false },
  { href: "/battle-ai",   label: "Battle AI",    icon: BotIcon,   requiresAuth: true  },
  { href: "/leaderboard", label: "Leaderboard",  icon: ChartIcon, requiresAuth: false },
  { href: "/partners",    label: "Partners",     icon: UsersIcon, requiresAuth: true  },
  { href: "/invites",     label: "Challenges",   icon: ShieldIcon,requiresAuth: true  },
  { href: "/groups",      label: "Rage Groups",  icon: UsersIcon, requiresAuth: false },
  { href: "/profile",     label: "Profile",      icon: UserIcon,  requiresAuth: true  },
  { href: "/settings",    label: "Settings",     icon: GearIcon,  requiresAuth: true  },
];

const creatorItem: NavItem = {
  href: "/creator",
  label: "Creator Control",
  icon: CrownIcon,
  requiresAuth: true,
};

export default function Sidebar() {
  const pathname = usePathname() ?? "";
  const { user, loading } = useCurrentUser();

  // Hide sidebar entirely on auth pages
  if (AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return null;
  }

  const visibleItems = [...items, ...(user?.isCreator ? [creatorItem] : [])].filter((item) => !item.requiresAuth || user);

  const avatarUrl = user?.avatar_url ||
    (user ? `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(user.username)}` : "");

  return (
    <aside className="hidden lg:flex sticky top-0 h-screen w-[260px] shrink-0 flex-col px-3 py-4">
      <div className="glass-panel flex h-full flex-col rounded-3xl p-3 border-white/10">

        {/* Logo */}
        <BrandLogo size="md" className="mb-6 px-3 py-2" />

        {/* Nav items — filtered by auth state */}
        <nav className="flex-1 space-y-0.5">
          {loading ? (
            // Skeleton while auth state resolves (avoids flicker of wrong items)
            <div className="space-y-1 px-1">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded-xl bg-white/5" />
              ))}
            </div>
          ) : (
            visibleItems.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href) ?? false;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200",
                    active
                      ? "bg-aura-purple/12 text-white border border-aura-purple/25 shadow-[0_0_20px_rgba(255,30,30,0.15)]"
                      : "text-white/45 hover:bg-white/5 hover:text-white border border-transparent"
                  )}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-aura-purple shadow-[0_0_10px_rgba(255,30,30,0.9)]" />
                  )}
                  <Icon className={clsx(
                    "h-[18px] w-[18px] shrink-0 transition-colors",
                    active ? "text-aura-purple drop-shadow-[0_0_6px_rgba(255,30,30,0.8)]" : "text-white/35 group-hover:text-white/80"
                  )} />
                  <span>{item.label}</span>
                  {active && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-aura-purple shadow-[0_0_6px_rgba(255,30,30,0.9)]" />
                  )}
                </Link>
              );
            })
          )}
        </nav>

        {/* Create battle CTA — only shown when logged in */}
        {user && (
          <div className="my-3 px-1">
            <Link
              href="/battles"
              className="glossy-highlight flex w-full items-center justify-center gap-2 rounded-xl bg-aura-gradient px-4 py-3 text-sm font-bold text-white shadow-glow transition-all hover:shadow-[0_0_40px_rgba(255,30,30,0.65)] hover:-translate-y-0.5 active:scale-95"
            >
              <span className="text-base">⚔️</span>
              Create Rage Battle
            </Link>
          </div>
        )}

        {/* User card (logged in) */}
        {user ? (
          <Link
            href="/profile"
            className="mt-1 flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3 transition-all hover:border-aura-purple/35 hover:bg-white/[0.06] hover:shadow-[0_0_20px_rgba(255,30,30,0.12)] group"
          >
            <div className="relative shrink-0">
              <img src={avatarUrl} alt={user.username} className="h-10 w-10 rounded-xl border border-aura-purple/40 group-hover:ring-2 group-hover:ring-aura-purple/60 transition-all" />
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0a0a0a] bg-aura-purple shadow-[0_0_6px_rgba(255,30,30,0.8)]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">{user.username}</p>
              {user.isCreator && (
                <p title="Founder • Full Platform Access" className="text-[10px] font-black uppercase tracking-[0.2em] text-red-200">
                  Creator
                </p>
              )}
              <AuraBadge value={user.aura} size="xs" trend="neutral" />
            </div>
            <svg className="h-4 w-4 text-white/20 group-hover:text-white/50 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ) : !loading ? (
          /* Guest CTA — shown when not loading and not logged in */
          <div className="mt-1 space-y-2 px-1">
            <Link
              href="/login"
              className="flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-white/60 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="glossy-highlight flex w-full items-center justify-center rounded-xl bg-aura-gradient px-4 py-2.5 text-sm font-bold text-white shadow-glow-sm transition hover:shadow-glow active:scale-95"
            >
              Join the Rage
            </Link>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

/* ── Inline icon set ── */
function HomeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" />
    </svg>
  );
}
function SwordIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M14.5 17.5L3 6V3h3l11.5 11.5" /><path d="M13 19l6-6" /><path d="M16 16l4 4" /><path d="M19 21l2-2" />
    </svg>
  );
}
function ShieldIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" />
    </svg>
  );
}
function UsersIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6" />
      <circle cx="17.5" cy="9" r="2.5" /><path d="M14.5 20c.3-2.6 2.2-4.7 4.7-5" />
    </svg>
  );
}
function ChartIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 20V10" /><path d="M12 20V4" /><path d="M20 20v-7" />
    </svg>
  );
}
function UserIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </svg>
  );
}
function GearIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.9 2.9l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.6V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.6 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.9-2.9l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.6-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.6-1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.9-2.9l.1.1a1.7 1.7 0 001.9.3H9a1.7 1.7 0 001-1.6V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.6 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.9 2.9l-.1.1a1.7 1.7 0 00-.3 1.9V9a1.7 1.7 0 001.6 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.6 1z" />
    </svg>
  );
}
function CrownIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 8l5 4 4-7 4 7 5-4-2 11H5L3 8z" />
      <path d="M5 19h14" />
    </svg>
  );
}

function BotIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="5" y="7" width="14" height="12" rx="3" />
      <path d="M12 3v4" />
      <path d="M9 12h.01" />
      <path d="M15 12h.01" />
      <path d="M9.5 16h5" />
    </svg>
  );
}
