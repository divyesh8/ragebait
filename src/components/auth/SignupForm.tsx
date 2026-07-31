"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import GenderSelector from "@/components/ui/GenderSelector";
import TermsDialog from "@/components/ui/terms-conditions";
import type { Gender } from "@/lib/gender";
import { TERMS_VERSION } from "@/lib/legal";
import { refreshUserCache } from "@/lib/hooks/useCurrentUser";

type SignupStep = "details" | "verify";

export default function SignupForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    dob: "",
    gender: "" as Gender | "",
  });
  const [step, setStep] = useState<SignupStep>("details");
  const [pendingEmail, setPendingEmail] = useState("");
  const [code, setCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  // Mandatory Terms acceptance — MUST start unchecked (never pre-selected).
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const checks = [
    { label: "8+ characters", pass: form.password.length >= 8 },
    { label: "Uppercase letter", pass: /[A-Z]/.test(form.password) },
    { label: "Number", pass: /[0-9]/.test(form.password) },
  ];
  const strength = checks.filter((c) => c.pass).length;
  const strengthColor =
    strength === 3
      ? "bg-aura-green"
      : strength === 2
        ? "bg-aura-blue"
        : strength === 1
          ? "bg-aura-gold"
          : "bg-white/10";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitted(true);

    if (!form.gender) {
      setError("Please select your gender.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!agreedTerms) {
      setError("Please read and accept the Terms & Conditions to continue.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, acceptTerms: agreedTerms, policyVersion: TERMS_VERSION }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      setPendingEmail(data.email ?? form.email);
      setStep("verify");
      setMessage(data.message ?? "We sent you a verification code.");
      setLoading(false);
    } catch {
      setError("Could not reach the server. Please try again.");
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingEmail, code }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "That code did not work. Please try again.");
        setLoading(false);
        return;
      }

      await refreshUserCache();
      router.push("/profile");
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
      setLoading(false);
    }
  }

  async function handleResend() {
    setError(null);
    setMessage(null);
    setResending(true);

    try {
      const res = await fetch("/api/auth/signup/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingEmail }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Could not send a new code. Please try again.");
        setResending(false);
        return;
      }

      setMessage(data.message ?? "A new code was sent.");
      setResending(false);
    } catch {
      setError("Could not reach the server. Please try again.");
      setResending(false);
    }
  }

  if (step === "verify") {
    return (
      <form className="space-y-5" onSubmit={handleVerify} noValidate>
        {error && (
          <div className="rounded-xl border border-aura-purple/40 bg-aura-purple/10 px-4 py-3 text-sm text-aura-purple">
            {error}
          </div>
        )}

        {message && (
          <div className="rounded-xl border border-aura-green/30 bg-aura-green/10 px-4 py-3 text-sm text-aura-green">
            {message}
          </div>
        )}

        <div className="space-y-1">
          <h2 className="font-display text-xl font-bold text-white">Check your email</h2>
          <p className="text-sm text-white/50">
            Enter the 6-digit code sent to <span className="text-white/80">{pendingEmail}</span>.
          </p>
        </div>

        <div>
          <label htmlFor="signup-code" className="block text-sm font-medium text-white/70">
            Verification code
          </label>
          <input
            id="signup-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center font-display text-2xl tracking-[0.35em] text-white placeholder:text-white/20 focus:border-aura-purple focus:outline-none"
            placeholder="000000"
          />
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={loading || code.length !== 6}>
          {loading ? "Verifying..." : "Verify and enter"}
        </Button>

        <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="text-aura-purple hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            {resending ? "Sending..." : "Send a new code"}
          </button>
          <span className="text-white/20">|</span>
          <button
            type="button"
            onClick={() => {
              setStep("details");
              setCode("");
              setError(null);
              setMessage(null);
            }}
            className="text-white/50 hover:text-white hover:underline"
          >
            Edit signup details
          </button>
        </div>
      </form>
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
      {error && (
        <div className="rounded-xl border border-aura-purple/40 bg-aura-purple/10 px-4 py-3 text-sm text-aura-purple">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-xl border border-aura-green/30 bg-aura-green/10 px-4 py-3 text-sm text-aura-green">
          {message}
        </div>
      )}

      <div>
        <label htmlFor="username" className="block text-sm font-medium text-white/70">
          Username
        </label>
        <div className="relative mt-1.5">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-white/30">@</span>
          <input
            id="username"
            type="text"
            autoComplete="username"
            required
            value={form.username}
            onChange={(e) => update("username", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-8 pr-4 text-sm text-white placeholder:text-white/30 transition-colors focus:border-aura-purple focus:outline-none"
            placeholder="your_username"
          />
        </div>
        <p className="mt-1 text-xs text-white/30">3-20 chars: letters, numbers, underscores only.</p>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-white/70">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/30 transition-colors focus:border-aura-purple focus:outline-none"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-white/70">
          Password
        </label>
        <div className="relative mt-1.5">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 pr-12 text-sm text-white placeholder:text-white/30 transition-colors focus:border-aura-purple focus:outline-none"
            placeholder="Password"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/30 hover:text-white/60"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        {form.password && (
          <div className="mt-2 space-y-1.5">
            <div className="flex gap-1">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                    i <= strength ? strengthColor : "bg-white/10"
                  }`}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              {checks.map((c) => (
                <span
                  key={c.label}
                  className={`flex items-center gap-1 text-[11px] ${c.pass ? "text-aura-green" : "text-white/30"}`}
                >
                  {c.pass ? "OK" : "--"} {c.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-white/70">
            Confirm
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            value={form.confirmPassword}
            onChange={(e) => update("confirmPassword", e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/30 transition-colors focus:border-aura-purple focus:outline-none"
            placeholder="Password"
          />
        </div>
        <div>
          <label htmlFor="dob" className="block text-sm font-medium text-white/70">
            Date of birth
          </label>
          <input
            id="dob"
            type="date"
            required
            value={form.dob}
            onChange={(e) => update("dob", e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white transition-colors focus:border-aura-purple focus:outline-none"
          />
        </div>
      </div>

      <GenderSelector
        value={form.gender}
        onChange={(value) => update("gender", value)}
        error={submitted && !form.gender ? "Please select your gender." : null}
        disabled={loading}
      />

      {/* Mandatory Terms acceptance — checkbox is never pre-selected, and
          "Create account" stays disabled until it is checked. */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
        <label htmlFor="acceptTerms" className="flex cursor-pointer items-start gap-3">
          <input
            id="acceptTerms"
            type="checkbox"
            checked={agreedTerms}
            onChange={(e) => setAgreedTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-aura-purple"
          />
          <span className="text-xs leading-relaxed text-white/60">
            I have read and agree to the{" "}
            <button type="button" onClick={() => setTermsOpen(true)} className="font-medium text-aura-purple hover:underline">
              Terms &amp; Conditions
            </button>
            ,{" "}
            <a href="/terms#privacy" target="_blank" rel="noopener noreferrer" className="font-medium text-aura-purple hover:underline">
              Privacy Policy
            </a>
            ,{" "}
            <a href="/terms#community-guidelines" target="_blank" rel="noopener noreferrer" className="font-medium text-aura-purple hover:underline">
              Community Guidelines
            </a>
            , and{" "}
            <a href="/terms#ai-moderation" target="_blank" rel="noopener noreferrer" className="font-medium text-aura-purple hover:underline">
              AI Moderation Policy
            </a>
            .
          </span>
        </label>
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={loading || !agreedTerms}>
        {loading ? "Sending code..." : "Create account"}
      </Button>

      <p className="text-center text-xs text-white/30">
        We will email a 6-digit code before your account becomes active.
      </p>

      <TermsDialog
        open={termsOpen}
        onClose={() => setTermsOpen(false)}
        onAgree={() => {
          setAgreedTerms(true);
          setTermsOpen(false);
        }}
      />
    </form>
  );
}
