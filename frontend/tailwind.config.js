/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        axly: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#b9dffe',
          300: '#7cc5fd',
          400: '#36a8fa',
          500: '#0c8ce9',
          600: '#006ec7',
          700: '#0157a0',
          800: '#064b84',
          900: '#0b3f6e',
          950: '#072849',
        },
        dark: {
          bg: '#0B0F19',
          surface: '#111827',
          card: '#182234',
          border: '#243048',
          text: '#F3F4F6',
          muted: '#9CA3AF'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
