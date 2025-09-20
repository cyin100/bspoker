/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        soft: "0 10px 30px rgba(0,0,0,0.35)",
      },
      keyframes: {
        // Sky pulse (used for "current turn")
        glow: {
          "0%,100%": { boxShadow: "0 0 0 0 rgba(56,189,248,0.6)" },   // sky-400
          "50%":     { boxShadow: "0 0 0 6px rgba(56,189,248,0.15)" },
        },
        // Amber pulse (used for reveal highlights)
        glowAmber: {
          "0%,100%": { boxShadow: "0 0 0 0 rgba(251,191,36,0.6)" },   // amber-400
          "50%":     { boxShadow: "0 0 0 6px rgba(251,191,36,0.18)" },
        },
      },
      animation: {
        glow: "glow 1.6s ease-in-out infinite",
        "glow-amber": "glowAmber 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
}
