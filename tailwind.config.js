/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#E551BA",
          foreground: "#FFFFFF",
          50: '#fdf2f9',
          100: '#fce7f5',
          200: '#fad0ec',
          500: '#e551ba',
          600: '#cb329c',
          700: '#ab227e',
        },
        brand: {
          dark: '#0B0D13',
          card: '#151821',
          subtle: '#1C202C',
          border: '#2A3042',
          hover: '#222735'
        }
      }
    },
  },
  plugins: [],
}
