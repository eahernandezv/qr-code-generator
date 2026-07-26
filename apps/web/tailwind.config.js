/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        studio: {
          50: '#f0f4ff',
          100: '#e0eaff',
          200: '#c7d8ff',
          300: '#a5bdff',
          400: '#7d96ff',
          500: '#5b6ef5',
          600: '#3f4fd8',
          700: '#323eaf',
          800: '#2c368d',
          900: '#2a336e',
          950: '#181b3a',
        },
      },
    },
  },
  plugins: [],
}
