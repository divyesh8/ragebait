"use client";

import { useMemo } from "react";

function seededParticleValue(index: number, salt: number) {
  const value = Math.sin(index * 91.13 + salt * 37.71) * 10000;
  return value - Math.floor(value);
}

export default function AuthBackdrop() {
  const particles = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        id: i,
        left: seededParticleValue(i, 1) * 100,
        size: 1.5 + seededParticleValue(i, 2) * 2.5,
        delay: seededParticleValue(i, 3) * 12,
        duration: 10 + seededParticleValue(i, 4) * 12,
      })),
    []
  );

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden bg-[#000000]">
      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,30,30,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,30,30,0.6) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage: "radial-gradient(ellipse 80% 70% at 50% 40%, black 30%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 70% at 50% 40%, black 30%, transparent 100%)",
        }}
      />

      {/* Red ambient glows */}
      <div className="absolute -left-56 top-[-12%] h-[560px] w-[560px] animate-floatSlow rounded-full bg-aura-purple/20 blur-[130px]" />
      <div className="absolute -right-40 bottom-[-18%] h-[480px] w-[480px] animate-floatSlower rounded-full bg-aura-purple/15 blur-[130px]" />
      <div className="absolute left-1/2 top-[38%] h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 animate-pulseGlow rounded-full bg-aura-purple/12 blur-[100px]" />

      {/* Rising embers */}
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute bottom-0 rounded-full bg-aura-purple animate-drift"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            boxShadow: "0 0 6px rgba(255,30,30,0.9)",
          }}
        />
      ))}

      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_25%,rgba(0,0,0,0.88)_100%)]" />
    </div>
  );
}
