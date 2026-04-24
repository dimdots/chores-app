import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
      colors: {
        brand: {
          50: "#f4f7ff",
          100: "#e6ecff",
          200: "#c5d2ff",
          300: "#9aaeff",
          400: "#6f84fb",
          500: "#4c5ff0",
          600: "#3845d4",
          700: "#2d37a8",
          800: "#242d84",
          900: "#1e2668",
        },
        success: {
          50: "#eefaf2",
          500: "#2fb26a",
          700: "#1f7d48",
        },
        danger: {
          50: "#fdecec",
          500: "#d94a4a",
          700: "#9b2a2a",
        },
        warning: {
          50: "#fff7e6",
          500: "#e79a2b",
          700: "#a4661a",
        },
      },
      borderRadius: {
        xl: "0.9rem",
        "2xl": "1.25rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,0.06), 0 1px 3px rgba(16,24,40,0.04)",
        float: "0 10px 30px rgba(16,24,40,0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
