/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        void: "#05030A",
        surface: "#0E0B17",
        surface2: "#161226",
        aura: {
          purple: "#A65BFF",
          blue: "#3DDCFF",
          crimson: "#FF2E55",
        },
        line: "#2A2440",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      backgroundImage: {
        "aura-gradient": "linear-gradient(135deg, #A65BFF 0%, #3DDCFF 100%)",
        "crimson-gradient": "linear-gradient(135deg, #FF2E55 0%, #A65BFF 100%)",
        "grid-glow":
          "radial-gradient(circle at 50% 0%, rgba(166,91,255,0.18), transparent 60%)",
      },
      boxShadow: {
        glow: "0 0 40px rgba(166, 91, 255, 0.35)",
        "glow-blue": "0 0 40px rgba(61, 220, 255, 0.3)",
        "glow-crimson": "0 0 40px rgba(255, 46, 85, 0.35)",
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
      },
      animation: {
        pulseGlow: "pulseGlow 2.5s ease-in-out infinite",
        rise: "rise 0.6s ease-out forwards",
      },
    },
  },
  plugins: [],
};
