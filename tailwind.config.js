/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f5ff',
          100: '#e0ecff',
          200: '#c7dcfe',
          300: '#a3c5fd',
          400: '#75a4fa',
          500: '#437ff5',
          600: '#1d5bd8', // Royal blue
          700: '#1446b8',
          800: '#103794', // Navy
          900: '#0b2464',
          950: '#07153d',
        },
        surface: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
