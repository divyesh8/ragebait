"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import LegalDocument from "@/components/ui/LegalDocument";
import { TERMS_SECTIONS, TERMS_VERSION, TERMS_EFFECTIVE_DATE } from "@/lib/legal";

/**
 * Ragebait Terms & Conditions acceptance modal.
 *
 * Adapted from the shadcn TocDialog pattern (scroll-to-bottom gate before the
 * "I Agree" action unlocks) but re-skinned to Ragebait's black/red glass theme
 * and built without Radix/shadcn primitives, which this project does not use.
 *
 * Controlled by the parent (the signup form): the parent owns the acceptance
 * state so it can enforce the mandatory, never-pre-selected checkbox and block
 * account creation until the user agrees.
 */
export default function TermsDialog({
  open,
  onClose,
  onAgree,
}: {
  open: boolean;
  onClose: () => void;
  /** Called with the accepted policy version when the user clicks "I Agree". */
  onAgree: (version: string) => void;
}) {
  const [hasReadToBottom, setHasReadToBottom] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  function handleScroll() {
    const el = contentRef.current;
    if (!el) return;
    const pct = el.scrollTop / (el.scrollHeight - el.clientHeight);
    if (pct >= 0.99 && !hasReadToBottom) setHasReadToBottom(true);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-title"
    >
      {/* Overlay */}
      <button
        aria-label="Close terms"
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />

      {/* Card */}
      <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0a0a0a]/95 shadow-[0_20px_80px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-4">
          <div>
            <h2 id="terms-title" className="font-display text-lg font-bold text-white">
              Terms &amp; Conditions
            </h2>
            <p className="mt-0.5 text-xs text-white/40">
              Version {TERMS_VERSION} · Effective {TERMS_EFFECTIVE_DATE}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-white/50 transition hover:border-white/25 hover:text-white"
          >
            Close
          </button>
        </div>

        {/* Scrollable body */}
        <div ref={contentRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-6 py-5">
          <LegalDocument sections={TERMS_SECTIONS} />
          <p className="mt-8 border-t border-white/10 pt-4 text-xs text-white/35">
            The Community Guidelines (§6) and AI Moderation Policy (§7) are set out above. Our{" "}
            <Link href="/terms#privacy" className="text-aura-purple hover:underline" target="_blank">
              Privacy Policy
            </Link>{" "}
            is summarised in §12. You may also open the{" "}
            <Link href="/terms" className="text-aura-purple hover:underline" target="_blank">
              full document in a new tab
            </Link>
            .
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-white/10 px-6 py-4">
          {!hasReadToBottom ? (
            <span className="text-xs text-white/40">Scroll to the end to read all terms before accepting.</span>
          ) : (
            <span className="text-xs text-aura-green">You have read the full document.</span>
          )}
          <div className="flex shrink-0 gap-2">
            <button
              onClick={onClose}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-white/70 transition hover:border-white/25 hover:text-white"
            >
              Cancel
            </button>
            <button
              disabled={!hasReadToBottom}
              onClick={() => onAgree(TERMS_VERSION)}
              className="rounded-xl bg-aura-gradient px-5 py-2 text-sm font-bold text-void transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              I Agree
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
