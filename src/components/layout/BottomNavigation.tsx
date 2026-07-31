"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

const AUTH_PATHS = ["/login", "/signup"];

export default function BottomNavigation() {
  const pathname = usePathname() ?? "";
  const { user } = useCurrentUser();

  if (AUTH_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return null;
  }

  const items = [
    { href: "/", label: "Home", icon: HomeIcon },
    { href: "/battles", label: "Battles", icon: SwordIcon },
    { href: user ? "/battle-ai" : "/login", label: "AI", icon: BotIcon, match: "/battle-ai" },
    { href: "/leaderboard", label: "Leaderboard", icon: ChartIcon },
    { href: user ? "/profile" : "/login", label: "Profile", icon: UserIcon, match: "/profile" },
  ];

  return (
    <nav className="fixed bottom-3 left-3 right-3 z-50 rounded-3xl border border-white/10 bg-black/75 px-2 py-2 shadow-[0_14px_60px_rgba(0,0,0,0.75)] backdrop-blur-2xl lg:hidden">
      <div className="grid grid-cols-5 gap-1">
        {items.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.match ?? item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={clsx(
                "flex min-w-0 flex-col items-center gap-1 rounded-2xl px-1.5 py-2 text-[10px] font-bold transition",
                active ? "bg-aura-purple/15 text-white" : "text-white/38 hover:bg-white/[0.05] hover:text-white"
              )}
            >
              <Icon className={clsx("h-5 w-5", active ? "text-aura-purple" : "text-white/45")} />
              <span className="w-full truncate text-center">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function HomeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 11l9-8 9 8" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}

function SwordIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
      <path d="M13 19l6-6" />
      <path d="M16 16l4 4" />
    </svg>
  );
}

function ChartIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 20V10" />
      <path d="M12 20V4" />
      <path d="M20 20v-7" />
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

function UserIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </svg>
  );
}
