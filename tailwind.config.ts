import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Tournament dark-navy + gold palette
        navy: {
          950: "#0a0f1f",
          900: "#0d1426",
          800: "#121b33",
          700: "#1a2745",
          600: "#243358",
          500: "#324470",
        },
        gold: {
          400: "#f5d061",
          500: "#e9b949",
          600: "#caa12f",
        },
        ok: "#22c55e",
        warn: "#f59e0b",
        danger: "#ef4444",
      },
      fontFamily: {
        // Cairo for Arabic UI; falls back to system Arabic fonts.
        sans: ["var(--font-cairo)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 4px 24px rgba(0,0,0,0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
