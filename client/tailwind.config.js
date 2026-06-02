/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: '#C6A86B',
          light: '#D4BC8E',
          dark: '#A68B4B',
        },
        surface: {
          DEFAULT: '#FAFAF8',
          secondary: '#F5F3EE',
          card: '#FFFFFF',
          dark: '#1A1A18',
          'dark-card': '#242422',
        },
        border: {
          DEFAULT: '#E7E2D8',
          hover: '#D4CFC3',
          dark: '#3D3D38',
        },
        'premium-blue': {
          DEFAULT: '#5B7FFF',
          hover: '#4A6FEE',
          light: '#EEF2FF',
        },
        'text-primary': '#2B2B28',
        'text-secondary': '#66635D',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        sans: ['"Inter"', '"DM Sans"', 'sans-serif'],
      },
      animation: {
        'marquee': 'marquee 25s linear infinite',
        'fade-in': 'fadeIn 0.9s ease forwards',
        'slide-up': 'slideUp 0.5s ease forwards',
        'slide-in': 'slideIn 0.6s ease forwards',
        'float': 'float 6s ease-in-out infinite',
        'float-delayed': 'float 8s ease-in-out infinite 2s',
        'pop-in': 'popIn 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards',
      },
      keyframes: {
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
        fadeIn: {
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          from: { opacity: '0', transform: 'translateX(30px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        popIn: {
          from: { transform: 'scale(0.5)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}