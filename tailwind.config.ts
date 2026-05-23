import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#5C1523",
          dark: "#4A0F1B",
          light: "#7A1E30",
        },
        gold: {
          DEFAULT: "#C9A96E",
          light: "#DFC48E",
          dark: "#A8853A",
        },
        cream: "#FCF9F2",
      },
      fontFamily: {
        arabic: ["Cairo", "Tajawal", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
