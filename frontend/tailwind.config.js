/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        cs2: {
          dark: "#0b0e14",
          surface: "#121721",
          card: "#182030",
          border: "#232e42",
          orange: "#de6e16",
          orangeHover: "#f37e24",
          blue: "#2b7fff",
          green: "#00d26a",
          red: "#f83a3a",
          text: "#e1e7f0",
          muted: "#8493a8",
        },
      },
    },
  },
  plugins: [],
};
