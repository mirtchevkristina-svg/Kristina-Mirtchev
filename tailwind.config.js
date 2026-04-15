/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Seriöse Justiz-Palette: Dunkelblau, Weiß, Goldakzent
        justiz: {
          50:  '#eef2f7',
          100: '#d7dfea',
          200: '#aebfd5',
          300: '#7d96b6',
          400: '#527298',
          500: '#2f5280',
          600: '#1f3d66',
          700: '#152d4e',
          800: '#0d1f38',
          900: '#071225'
        },
        gold: {
          400: '#e0b84b',
          500: '#c89a2b',
          600: '#a17920'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['"Source Serif Pro"', 'Georgia', 'serif']
      }
    }
  },
  plugins: []
}
