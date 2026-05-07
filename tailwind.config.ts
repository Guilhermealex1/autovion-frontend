import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg:      "#04050a",
        surface: "#0c0f1c",
        card:    "#111428",
        border:  "#1a1f38",
        muted:   "#64748b",
        accent:  "#7c3aed",
        "accent-light": "#a78bfa",
        cyan:    "#22d3ee",
      },
      fontFamily: {
        sans: ["Outfit", "sans-serif"],
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(14px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%":     { transform: "translateY(-6px)" },
        },
        glow: {
          "0%,100%": { boxShadow: "0 0 20px rgba(139,92,246,.3)" },
          "50%":     { boxShadow: "0 0 40px rgba(139,92,246,.6)" },
        },
      },
      animation: {
        fadeUp: "fadeUp .4s ease both",
        float:  "float 4s ease-in-out infinite",
        glow:   "glow 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
