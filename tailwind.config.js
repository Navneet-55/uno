/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        uno: {
          red: '#E53E3E',
          yellow: '#D69E2E',
          green: '#38A169',
          blue: '#3182CE',
          black: '#1A202C',
        }
      },
      animation: {
        'card-deal': 'cardDeal 0.5s ease-out',
        'card-play': 'cardPlay 0.3s ease-out',
        'shake': 'shake 0.5s ease-in-out',
      },
      keyframes: {
        cardDeal: {
          '0%': { transform: 'translateY(-100px) rotate(180deg)', opacity: '0' },
          '100%': { transform: 'translateY(0) rotate(0deg)', opacity: '1' },
        },
        cardPlay: {
          '0%': { transform: 'scale(1) translateY(0)' },
          '50%': { transform: 'scale(1.1) translateY(-10px)' },
          '100%': { transform: 'scale(1) translateY(0)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-2px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(2px)' },
        }
      }
    },
  },
  plugins: [],
}