import clsx from "clsx";

interface AuraBadgeProps {
  value: number;
  size?: "xs" | "sm" | "md" | "lg";
  trend?: "up" | "down" | "neutral";
}

export default function AuraBadge({ value, size = "md", trend = "neutral" }: AuraBadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] backdrop-blur-sm font-mono font-medium",
        {
          "px-2 py-0.5 text-[11px]": size === "xs",
          "px-2.5 py-1 text-xs": size === "sm",
          "px-3.5 py-1.5 text-sm": size === "md",
          "px-5 py-2 text-lg": size === "lg",
        }
      )}
    >
      <span
        className={clsx("h-2 w-2 rounded-full", {
          "bg-white shadow-[0_0_8px_rgba(255,255,255,0.7)]": trend === "up",
          "bg-aura-purple shadow-[0_0_8px_rgba(229,9,20,0.8)]": trend === "down",
          "bg-aura-purple shadow-[0_0_8px_rgba(255,30,30,0.8)] animate-pulseGlow": trend === "neutral",
        })}
      />
      <span className="text-gradient-rage font-display font-bold">{value.toLocaleString()}</span>
      <span className="text-white/40">Aura</span>
    </span>
  );
}
