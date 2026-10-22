/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./*.html",
    "./dashboard/*.html",
    "./assets/js/*.js",
  ],
  theme: {
    screens: {
      xxs: "320px",
      xs: "375px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
    extend: {
      colors: {
        brand: {
          50: "#eefdfb",
          100: "#d3f8f3",
          200: "#aaf0e8",
          300: "#72e3d9",
          400: "#37cdc4",
          500: "#1cb1ab",
          600: "#148d8b",
          700: "#147170",
          800: "#155a5a",
          900: "#164b4b",
          950: "#062d2e",
        },
        accent: {
          50: "#fff8eb",
          100: "#ffeec6",
          200: "#ffd988",
          300: "#ffbf4a",
          400: "#ffa620",
          500: "#f98307",
          600: "#dd5d02",
          700: "#b74106",
          800: "#94320c",
          900: "#7a2a0d",
          950: "#461302",
        },
        ink: {
          50: "#F8F9FA",
          100: "#F1F3F5",
          200: "#E5E7EB",
          300: "#D1D5DB",
          400: "#9CA3AF",
          500: "#6B7280",
          600: "#4B5563",
          700: "#374151",
          800: "#1F2937",
          900: "#111827",
          950: "#0B0F19",
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        display: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
      },
      boxShadow: {
        xs: "0 1px 2px rgba(16, 24, 40, 0.05)",
        soft: "0 10px 30px -12px rgba(6, 45, 46, 0.25)",
        card: "0 1px 2px rgba(16, 24, 40, 0.04), 0 12px 24px -12px rgba(16, 24, 40, 0.18)",
      },
      spacing: {
        4.5: "1.125rem",
        18: "4.5rem",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      animation: {
        "fade-up": "fade-up .6s ease-out both",
        float: "float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [require("@tailwindcss/forms"), require("@tailwindcss/typography")],
};
