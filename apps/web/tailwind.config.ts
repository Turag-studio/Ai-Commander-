import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        void: {
          950: "#050608",
          900: "#0a0d12",
          800: "#10141b",
          700: "#161b25",
        },
        neon: {
          cyan: "#00f6ff",
          purple: "#a855f7",
          magenta: "#ff2fd0",
          green: "#39ff88",
          amber: "#ffb020",
          red: "#ff3b5c",
        },
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        glow: "0 0 20px rgba(0, 246, 255, 0.35)",
        "glow-purple": "0 0 20px rgba(168, 85, 247, 0.35)",
        "glow-green": "0 0 20px rgba(57, 255, 136, 0.35)",
        "glow-red": "0 0 20px rgba(255, 59, 92, 0.35)",
      },
      backgroundImage: {
        "grid-pattern":
          "linear-gradient(rgba(0,246,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,246,255,0.06) 1px, transparent 1px)",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
      },
      animation: {
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        scan: "scan 3s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
