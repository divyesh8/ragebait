"use client";

import clsx from "clsx";
import { GENDER_OPTIONS, type Gender } from "@/lib/gender";

interface GenderSelectorProps {
  value: Gender | "";
  onChange: (value: Gender) => void;
  name?: string;
  legend?: string;
  error?: string | null;
  disabled?: boolean;
}

export default function GenderSelector({
  value,
  onChange,
  name = "gender",
  legend = "Gender",
  error,
  disabled,
}: GenderSelectorProps) {
  return (
    <fieldset className="space-y-2" aria-invalid={Boolean(error)}>
      <legend className="block text-sm font-medium text-white/70">{legend}</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {GENDER_OPTIONS.map((option) => {
          const selected = value === option.value;

          return (
            <label
              key={option.value}
              className={clsx(
                "glossy-highlight group relative flex min-h-[70px] cursor-pointer items-center justify-between overflow-hidden rounded-2xl border px-4 py-3 text-sm font-bold transition-all duration-300",
                "bg-white/[0.04] backdrop-blur-xl hover:-translate-y-0.5 hover:border-aura-purple/50 hover:bg-white/[0.07] hover:text-white hover:shadow-[0_0_24px_rgba(255,30,30,0.22)]",
                "focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-aura-purple",
                disabled && "cursor-not-allowed opacity-50",
                selected
                  ? "border-aura-purple bg-aura-purple/20 text-white shadow-[0_0_34px_rgba(255,30,30,0.42),inset_0_1px_0_rgba(255,255,255,0.14)]"
                  : "border-white/10 text-white/55"
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={selected}
                disabled={disabled}
                required
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              <span>{option.label}</span>
              <span
                className={clsx(
                  "flex h-5 w-5 items-center justify-center rounded-full border transition-all duration-300",
                  selected
                    ? "border-white bg-white text-aura-purple shadow-[0_0_18px_rgba(255,255,255,0.45)]"
                    : "border-white/20 bg-black/30 group-hover:border-aura-purple/60"
                )}
                aria-hidden="true"
              >
                <span
                  className={clsx(
                    "h-2 w-2 rounded-full bg-aura-purple transition-all duration-300",
                    selected ? "scale-100 opacity-100" : "scale-0 opacity-0"
                  )}
                />
              </span>
            </label>
          );
        })}
      </div>
      {error && <p className="text-xs font-medium text-aura-purple">{error}</p>}
    </fieldset>
  );
}
