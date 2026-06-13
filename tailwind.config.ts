import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  // Only apply `hover:` utilities on devices that truly support hover, so hover
  // styles don't "stick" after a tap on touchscreens (phones/tablets).
  future: { hoverOnlyWhenSupported: true },
  theme: {
    extend: {
      colors: {
        // Deep broadcast navy — near-black with a cool undertone.
        navy: {
          950: "#070b15",
          900: "#0b1120",
          800: "#0f1830",
          700: "#16223f",
          600: "#1f2f54",
          500: "#2c3f6e",
        },
        // Primary broadcast accent: electric blue.
        accent: {
          400: "#4d8dff",
          500: "#2b7bff",
          600: "#175fe0",
        },
        // Energy accent: lime (used sparingly for live/highlights).
        lime: {
          400: "#caff3f",
          500: "#aef000",
          600: "#8fc800",
        },
        // Premium accent: gold.
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
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 30px rgba(0,0,0,0.45)",
        glow: "0 0 0 1px rgba(43,123,255,0.4), 0 8px 30px rgba(43,123,255,0.25)",
      },
      letterSpacing: {
        widest2: "0.2em",
      },
    },
  },
  plugins: [],
};

export default config;
