import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        asphalt: {
          50: "#f4f6f8",
          100: "#e3e8ed",
          800: "#2a3441",
          900: "#1a222c",
          950: "#0f1419",
        },
        signal: {
          amber: "#e8a317",
          teal: "#1f8a7a",
        },
      },
      fontFamily: {
        display: ["var(--font-orbitron)", "sans-serif"],
        sans: ["var(--font-orbitron)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
