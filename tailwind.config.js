/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./pages/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#0A84FF", dark: "#005BBB" },
      },
      borderRadius: {
        xl: "1.25rem",
      },
    },
  },
  plugins: [],
};
