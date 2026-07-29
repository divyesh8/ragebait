/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        void: "#050505",
        surface: "#0A0A0A",
        surface2: "#121212",
        // Semantic tokens kept for compatibility — remapped to the
        // black / white / red rage system.
        aura: {
          purple: "#FF1E1E",   // primary rage red
          blue: "#FFFFFF",     // white energy (secondary side)
          crimson: "#E50914",  // deep rage red (live / danger)
        },
        line: "rgba(255,255,255,0.08)",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      backgroundImage: {
        "aura-gradient": "linear-gradient(135deg, #FF1E1E 0%, #E50914 100%)",
        "crimson-gradient": "linear-gradient(135deg, #E50914 0%, #FF1E1E 100%)",
        "white-gradient": "linear-gradient(135deg, #FFFFFF 0%, #B8B8B8 100%)",
        "grid-glow":
          "radial-gradient(circle at 50% 0%, rgba(255,30,30,0.22), transparent 60%)",
        "noise":
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E\")",
      },
      boxShadow: {
        glow: "0 0 40px rgba(255, 30, 30, 0.45)",
        "glow-sm": "0 0 18px rgba(255, 30, 30, 0.4)",
        "glow-blue": "0 0 40px rgba(255, 255, 255, 0.22)",
        "glow-crimson": "0 0 40px rgba(229, 9, 20, 0.5)",
        "glow-lg": "0 0 80px rgba(255, 30, 30, 0.35)",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        rise: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(-4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        cardIn: {
          "0%": { opacity: "0", transform: "translateY(28px) scale(0.97)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        floatSlow: {
          "0%, 100%": { transform: "translate(0, 0)" },
          "50%": { transform: "translate(14px, -22px)" },
        },
        floatSlower: {
          "0%, 100%": { transform: "translate(0, 0)" },
          "50%": { transform: "translate(-18px, 16px)" },
        },
        drift: {
          "0%": { transform: "translateY(0) translateX(0)", opacity: "0" },
          "10%": { opacity: "0.8" },
          "90%": { opacity: "0.6" },
          "100%": { transform: "translateY(-120vh) translateX(20px)", opacity: "0" },
        },
        rageGlow: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(255,30,30,0.35), 0 0 0 1px rgba(255,30,30,0.3)" },
          "50%": { boxShadow: "0 0 50px rgba(255,30,30,0.65), 0 0 0 1px rgba(255,30,30,0.55)" },
        },
        flicker: {
          "0%, 19%, 21%, 23%, 25%, 54%, 56%, 100%": { opacity: "1" },
          "20%, 22%, 24%, 55%": { opacity: "0.55" },
        },
        zap: {
          "0%": { transform: "scaleX(0.2)", opacity: "0.2" },
          "50%": { transform: "scaleX(1)", opacity: "1" },
          "100%": { transform: "scaleX(0.2)", opacity: "0.2" },
        },
        sweep: {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "200% 50%" },
        },
      },
      animation: {
        pulseGlow: "pulseGlow 2.5s ease-in-out infinite",
        rise: "rise 0.6s ease-out forwards",
        fadeIn: "fadeIn 0.18s ease-out forwards",
        cardIn: "cardIn 0.7s cubic-bezier(0.16,1,0.3,1) forwards",
        floatSlow: "floatSlow 9s ease-in-out infinite",
        floatSlower: "floatSlower 13s ease-in-out infinite",
        drift: "drift linear infinite",
        rageGlow: "rageGlow 2.2s ease-in-out infinite",
        flicker: "flicker 4s linear infinite",
        zap: "zap 1.6s ease-in-out infinite",
        sweep: "sweep 3s linear infinite",
      },
    },
  },
  plugins: [],
};
