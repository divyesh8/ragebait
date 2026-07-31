import Link from "next/link";
import type { Metadata } from "next";
import LegalDocument from "@/components/ui/LegalDocument";
import { TERMS_SECTIONS, TERMS_VERSION, TERMS_EFFECTIVE_DATE } from "@/lib/legal";
import BrandLogo from "@/components/layout/BrandLogo";

export const metadata: Metadata = {
  title: "Terms & Conditions — Ragebait",
  description: "The Terms & Conditions, Community Guidelines, and AI Moderation Policy governing use of Ragebait.",
};

export default function TermsPage() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#050505] px-4 py-12 sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(166,91,255,0.12),transparent_38%),radial-gradient(circle_at_80%_20%,rgba(255,43,43,0.1),transparent_34%)]" />

      <article className="relative mx-auto max-w-3xl">
        <header className="mb-10 text-center">
          <BrandLogo size="lg" className="justify-center" />
          <h1 className="mt-6 font-display text-3xl font-black text-white sm:text-4xl">Terms &amp; Conditions</h1>
          <p className="mt-3 text-sm text-white/40">
            Version {TERMS_VERSION} · Effective {TERMS_EFFECTIVE_DATE}
          </p>
          <p className="mx-auto mt-4 max-w-xl text-sm text-white/50">
            These Terms incorporate the Community Guidelines and AI Moderation Policy below, and
            the separately published Privacy Policy. Please read them in full.
          </p>
        </header>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-2xl sm:p-8">
          <LegalDocument sections={TERMS_SECTIONS} />
        </div>

        <footer className="mt-8 text-center text-xs text-white/30">
          <Link href="/signup" className="text-aura-purple hover:underline">
            Return to registration
          </Link>
        </footer>
      </article>
    </div>
  );
}
