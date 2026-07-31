import { ButtonHTMLAttributes } from "react";
import clsx from "clsx";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "vote";
  size?: "xs" | "sm" | "md" | "lg";
}

export default function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        "glossy-highlight relative inline-flex items-center justify-center rounded-full font-display font-bold tracking-wide transition-all duration-200 active:scale-95 focus-visible:ring-2 focus-visible:ring-aura-purple disabled:cursor-not-allowed disabled:opacity-40",
        {
          "bg-aura-gradient text-white shadow-glow hover:shadow-[0_0_55px_rgba(255,30,30,0.7)] hover:-translate-y-0.5":
            variant === "primary",
          "border border-white/15 bg-white/[0.04] backdrop-blur-md text-white hover:border-aura-purple/60 hover:bg-white/[0.08] hover:shadow-glow-sm":
            variant === "secondary",
          "text-white/60 hover:text-white hover:bg-white/5": variant === "ghost",
          "bg-aura-purple text-white shadow-glow-crimson hover:brightness-110":
            variant === "danger",
          "border border-white/25 bg-black/40 text-white hover:bg-white hover:text-black hover:shadow-[0_0_30px_rgba(255,255,255,0.35)]":
            variant === "vote",
        },
        {
          "px-3 py-1.5 text-xs": size === "xs",
          "px-4 py-2 text-sm": size === "sm",
          "px-6 py-3 text-sm": size === "md",
          "px-8 py-4 text-base": size === "lg",
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
