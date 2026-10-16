/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./*.html",
    "./dashboard/*.html",
    "./assets/js/*.js",
  ],
  theme: {
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
          50: "#f5f7fa",
          100: "#eaeef4",
          200: "#d3dbe7",
          300: "#aebdd2",
          400: "#8299b8",
          500: "#627b9f",
          600: "#4d6285",
          700: "#3f506c",
          800: "#37455b",
          900: "#323d4e",
          950: "#212834",
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
