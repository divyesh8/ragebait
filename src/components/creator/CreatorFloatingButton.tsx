"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

export default function CreatorFloatingButton() {
  const pathname = usePathname() ?? "";
  const { user, loading } = useCurrentUser();

  if (loading || !user?.isCreator || pathname.startsWith("/creator")) {
    return null;
  }

  return (
    <Link
      href="/creator"
      title="Founder • Full Platform Access"
      className="fixed bottom-5 right-5 z-50 hidden rounded-full border border-red-400/50 bg-[#120303]/80 px-5 py-3 text-xs font-black uppercase tracking-[0.28em] text-red-100 shadow-[0_0_32px_rgba(255,43,43,0.45)] backdrop-blur-xl transition hover:-translate-y-1 hover:border-red-300 hover:bg-red-500/15 hover:shadow-[0_0_48px_rgba(255,43,43,0.7)] sm:flex"
    >
      Creator Control
    </Link>
  );
}
