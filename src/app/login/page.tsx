import Link from "next/link";
import { Suspense } from "react";
import LoginForm from "@/components/auth/LoginForm";
import AuthBackdrop from "@/components/auth/AuthBackdrop";
import { SignInShell } from "@/components/ui/sign-in";
import BrandLogo from "@/components/layout/BrandLogo";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <AuthBackdrop />

      <div className="relative z-10">
        <SignInShell>
          {/* The original card — unchanged */}
          <div className="w-full max-w-md animate-cardIn">
            {/* Logo */}
            <div className="mb-8 flex justify-center">
              <BrandLogo href="/login" size="lg" />
            </div>

            {/* Glass card */}
            <div className="group relative rounded-3xl p-[1px] transition-all duration-500">
              {/* Animated gradient border glow */}
              <div className="absolute -inset-px rounded-3xl bg-gradient-to-br from-aura-purple/70 via-aura-crimson/40 to-aura-purple/60 opacity-60 blur-[2px] transition-opacity duration-500 group-hover:opacity-90" />

              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/50 px-8 py-10 backdrop-blur-2xl shadow-[0_8px_60px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.06)] sm:px-10">
                {/* Top sheen */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

                <div className="text-center">
                  <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
                    Welcome back to <span className="text-gradient-rage">Ragebait</span>
                  </h1>
                  <p className="mt-2 text-sm text-white/50">
                    Enter the arena. Claim your Aura.
                  </p>
                </div>

                <div className="mt-8">
                  <Suspense fallback={null}>
                    <LoginForm />
                  </Suspense>
                </div>

                <p className="mt-8 text-center text-sm text-white/40">
                  New to Ragebait?{" "}
                  <Link href="/signup" className="font-medium text-aura-purple transition hover:text-white hover:underline">
                    Create an account
                  </Link>
                </p>
              </div>
            </div>

            <p className="mt-8 text-center text-xs text-white/25">
              By entering, you agree to keep the roasts competitive, not cruel.
            </p>
          </div>
        </SignInShell>
      </div>
    </div>
  );
}
