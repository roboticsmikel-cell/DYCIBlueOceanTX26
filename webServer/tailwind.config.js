/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        jarvis: {
          cyan: "#00eaff",
          cyanSoft: "rgba(0,234,255,0.35)",
          cyanDim: "rgba(0,234,255,0.15)",
          bg: "#050b12",
        },
      },
      boxShadow: {
        jarvis: "0 0 25px rgba(0,234,255,0.35)",
      },
      animation: {
        spinSlow: "spin 20s linear infinite",
        spinReverse: "spinReverse 28s linear infinite",
        pulseSoft: "pulseSoft 2.5s ease-in-out infinite",
      },
      keyframes: {
        spinReverse: {
          from: { transform: "rotate(360deg)" },
          to: { transform: "rotate(0deg)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};