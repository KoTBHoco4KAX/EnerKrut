export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          base: "#0a0a0f",
          card: "#14141c",
          elevated: "#1c1c26",
        },
        border: {
          base: "#26263a",
        },
        text: {
          primary: "#f2f2f7",
          muted: "#8b8b9e",
        },
        accent: {
          neon: "#00e5ff",
          warn: "#ff3d5a",
          ok: "#00ff9d",
        },
        rarity: {
          common: "#8b8b9e",
          uncommon: "#4ade80",
          rare: "#38bdf8",
          epic: "#a855f7",
          legendary: "#fbbf24",
          fictional_mythic: "#ff2b7a",
        },
      },
      fontFamily: {
        sans: [
          "system-ui",
          "-apple-system",
          "SF Pro Display",
          "SF Pro Text",
          "sans-serif",
        ],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        "glow-rare": "0 0 20px rgba(56, 189, 248, 0.4)",
        "glow-epic": "0 0 20px rgba(168, 85, 247, 0.4)",
        "glow-legendary": "0 0 20px rgba(251, 191, 36, 0.4)",
        "glow-fictional_mythic": "0 0 20px rgba(255, 43, 122, 0.4)",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-500px 0" },
          "100%": { backgroundPosition: "500px 0" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%": { transform: "translateX(-8px)" },
          "40%": { transform: "translateX(8px)" },
          "60%": { transform: "translateX(-6px)" },
          "80%": { transform: "translateX(6px)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(255, 61, 90, 0.55)" },
          "50%": { boxShadow: "0 0 0 12px rgba(255, 61, 90, 0)" },
        },
      },
      animation: {
        shimmer: "shimmer 1.4s linear infinite",
        shake: "shake 0.45s ease-in-out",
        "pulse-glow": "pulse-glow 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
