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
        disney: {
          navy: '#002244',
          darkNavy: '#001736',
          blue: '#0072ce',
          sky: '#0284c7',
          lightSky: '#e0f2fe',
          cloud: '#f0f9ff',
          gold: '#f59e0b',
          magicPurple: '#7c3aed',
          border: '#e2e8f0',
        },
        park: {
          skyBlue: '#0284c7',
          skyLight: '#f0f9ff',
          skyBorder: '#bae6fd',
          disneyNavy: '#002244',
          gold: '#f59e0b',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'system-ui', 'sans-serif'],
        disney: ['Georgia', 'Cambria', 'serif'],
        mono: ['Fira Code', 'Courier New', 'monospace']
      },
      animation: {
        'sparkle': 'sparkle 2.5s ease-in-out infinite',
        'float-slow': 'float 5s ease-in-out infinite',
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shake': 'shake 0.4s cubic-bezier(.36,.07,.19,.97) both',
      },
      keyframes: {
        sparkle: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(0.9) rotate(0deg)' },
          '50%': { opacity: '1', transform: 'scale(1.15) rotate(180deg)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        shake: {
          '10%, 90%': { transform: 'translate3d(-2px, 0, 0)' },
          '20%, 80%': { transform: 'translate3d(4px, 0, 0)' },
          '30%, 50%, 70%': { transform: 'translate3d(-6px, 0, 0)' },
          '40%, 60%': { transform: 'translate3d(6px, 0, 0)' },
        }
      }
    },
  },
  plugins: [],
}
