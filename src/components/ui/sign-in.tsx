"use client";

import React from "react";

/**
 * SignInShell — two-column auth layout adapted from the shadcn-style
 * SignInPage component, re-skinned to Ragebait's design language (black
 * glass, aura red/purple accents) instead of the original violet/shadcn
 * tokens. The left column renders the EXISTING login card unchanged
 * (passed as children); the right column adds the arena hero panel with
 * community testimonials and staggered entrance animations.
 *
 * No external deps: eye icons and visuals are inline; avatars use the
 * same dicebear source the rest of the app already uses.
 */

export interface Testimonial {
  avatarSrc: string;
  name: string;
  handle: string;
  text: string;
}

export const RAGEBAIT_TESTIMONIALS: Testimonial[] = [
  {
    avatarSrc: "https://api.dicebear.com/9.x/bottts/svg?seed=VoidRoaster",
    name: "VoidRoaster",
    handle: "#1 on the leaderboard",
    text: "Cooked three challengers before breakfast. The AI judge actually gets callbacks.",
  },
  {
    avatarSrc: "https://api.dicebear.com/9.x/bottts/svg?seed=PitchProphet",
    name: "PitchProphet",
    handle: "Tournament finalist",
    text: "Lost a battle, read the verdict, learned more than a semester of debate club.",
  },
  {
    avatarSrc: "https://api.dicebear.com/9.x/bottts/svg?seed=ShonenSlander",
    name: "ShonenSlander",
    handle: "Meme division",
    text: "Bro nuvvu serious aa? The judge understood my Telugu roast better than my friends.",
  },
];

const TestimonialCard = ({ testimonial, delay }: { testimonial: Testimonial; delay: string }) => (
  <div
    className={`animate-testimonial ${delay} flex w-64 items-start gap-3 rounded-3xl border border-white/10 bg-black/40 p-5 backdrop-blur-xl`}
  >
    <img src={testimonial.avatarSrc} className="h-10 w-10 rounded-2xl border border-white/10 object-cover" alt="avatar" />
    <div className="text-sm leading-snug">
      <p className="font-semibold text-white">{testimonial.name}</p>
      <p className="text-xs text-white/40">{testimonial.handle}</p>
      <p className="mt-1 text-white/70">{testimonial.text}</p>
    </div>
  </div>
);

export function SignInShell({
  children,
  testimonials = RAGEBAIT_TESTIMONIALS,
}: {
  /** The existing auth card — rendered untouched in the left column. */
  children: React.ReactNode;
  testimonials?: Testimonial[];
}) {
  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row">
      {/* Left column: the existing Ragebait card, visually unchanged */}
      <section className="flex flex-1 items-center justify-center px-4 py-12">
        {children}
      </section>

      {/* Right column: arena hero panel — desktop only, pure Ragebait styling */}
      <section className="relative hidden flex-1 p-4 lg:block">
        <div className="animate-slide-right animate-delay-300 absolute inset-4 overflow-hidden rounded-3xl border border-white/10">
          {/* On-brand backdrop: the same black + red glow language as the app */}
          <div className="absolute inset-0 bg-[#050505]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,43,43,0.25),transparent_45%),radial-gradient(circle_at_75%_70%,rgba(166,91,255,0.18),transparent_40%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:44px_44px]" />

          <div className="relative flex h-full flex-col justify-between p-10">
            <div>
              <p className="animate-element animate-delay-500 text-[10px] font-black uppercase tracking-[0.4em] text-red-200/80">
                Live battle arena
              </p>
              <h2 className="animate-element animate-delay-600 mt-3 font-display text-4xl font-black leading-tight text-white">
                Roast. Debate.
                <br />
                <span className="text-gradient-rage">Claim your Aura.</span>
              </h2>
              <p className="animate-element animate-delay-700 mt-4 max-w-sm text-sm text-white/50">
                An AI judge that reads the whole conversation — comebacks, callbacks,
                multilingual banter — and explains every verdict.
              </p>
            </div>

            {testimonials.length > 0 && (
              <div className="flex justify-center gap-4">
                <TestimonialCard testimonial={testimonials[0]} delay="animate-delay-1000" />
                {testimonials[1] && (
                  <div className="hidden xl:flex">
                    <TestimonialCard testimonial={testimonials[1]} delay="animate-delay-1200" />
                  </div>
                )}
                {testimonials[2] && (
                  <div className="hidden 2xl:flex">
                    <TestimonialCard testimonial={testimonials[2]} delay="animate-delay-1400" />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

/** Inline eye icons (no lucide-react dependency). */
export const EyeIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const EyeOffIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3.5 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
    <line x1="2" x2="22" y1="2" y2="22" />
    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
  </svg>
);
