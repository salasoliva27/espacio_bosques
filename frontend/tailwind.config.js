/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#f0fefb',
          100: '#ccfaf3',
          200: '#99f5e7',
          300: '#5eebd6',
          400: '#33ecd1',
          500: '#00e5c4',
          600: '#00c9ab',
          700: '#009e87',
          800: '#007d6b',
          900: '#005f51',
        },
      },
    },
  },
  plugins: [],
}
