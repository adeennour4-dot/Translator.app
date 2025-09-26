/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",  // adjust if you use a different structure
  ],
  theme: {
    extend: {
      colors: {
        background: "#ffffff",   // plain white
        foreground: "#000000",   // optional, add if you use text-foreground anywhere
      },
    },
  },
  plugins: [],
};
