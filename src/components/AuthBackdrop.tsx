"use client";

import { useMemo } from "react";

/**
 * Decorative full-screen backdrop for /login (and /signup): two large slow
 * drifting glow blobs plus a field of small rising particles. Pure CSS
 * animation, no canvas — cheap and respects prefers-reduced-motion via the
 * global rule in globals.css.
 */
export default function AuthBackdrop() {
  const particles = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 2 + Math.random() * 3,
        delay: Math.random() * 10,
        duration: 10 + Math.random() * 10,
        hue: i % 2 === 0 ? "bg-aura-purple" : "bg-aura-blue",
      })),
    []
  );

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden bg-void">
      {/* Base atmosphere */}
      <div className="absolute inset-0 bg-atmosphere" />

      {/* Cyberpunk grid */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(166,91,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(61,220,255,0.5) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, black 40%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, black 40%, transparent 100%)",
        }}
      />

      {/* Large drifting glow blobs */}
      <div className="absolute -left-40 top-[-10%] h-[520px] w-[520px] animate-floatSlow rounded-full bg-aura-purple/25 blur-[120px]" />
      <div className="absolute -right-32 bottom-[-15%] h-[460px] w-[460px] animate-floatSlower rounded-full bg-aura-blue/20 blur-[120px]" />
      <div className="absolute left-1/2 top-1/2 h-[380px] w-[380px] -translate-x-1/2 -translate-y-1/2 animate-pulseGlow rounded-full bg-aura-crimson/10 blur-[140px]" />

      {/* Rising particles */}
      {particles.map((p) => (
        <span
          key={p.id}
          className={`absolute bottom-0 rounded-full ${p.hue} animate-drift`}
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            boxShadow: "0 0 8px currentColor",
          }}
        />
      ))}

      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(5,3,10,0.85)_100%)]" />
    </div>
  );
}