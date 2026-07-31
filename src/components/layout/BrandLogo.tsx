import Link from "next/link";
import clsx from "clsx";

interface BrandLogoProps {
  href?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  textClassName?: string;
  showText?: boolean;
}

const sizes = {
  sm: { shell: "gap-2", image: "h-8 w-8", text: "text-lg" },
  md: { shell: "gap-2.5", image: "h-10 w-10", text: "text-xl" },
  lg: { shell: "gap-3", image: "h-14 w-14", text: "text-2xl" },
};

export default function BrandLogo({
  href = "/",
  size = "md",
  className,
  textClassName,
  showText = true,
}: BrandLogoProps) {
  const config = sizes[size];

  return (
    <Link
      href={href}
      className={clsx(
        "inline-flex shrink-0 items-center font-display font-black tracking-tight text-white",
        config.shell,
        className
      )}
    >
      <span
        className={clsx(
          "flex shrink-0 items-center justify-center drop-shadow-[0_0_14px_rgba(255,90,0,0.42)]",
          config.image
        )}
      >
        <img src="/ragebait-logo.png" alt="Ragebait" className="h-full w-full object-contain" />
      </span>
      {showText && (
        <span className={clsx(config.text, textClassName)}>
          RAGE<span className="text-gradient-rage">BAIT</span>
        </span>
      )}
    </Link>
  );
}
