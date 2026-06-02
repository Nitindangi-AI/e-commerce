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
        primary: '#0A0A0A',
        accent: '#C9A84C',
        background: '#FAFAF8',
        surface: {
          DEFAULT: '#FFFFFF',
          secondary: '#FAFAF8',
          card: '#FFFFFF',
          dark: '#0A0A0A',
          'dark-card': '#111111',
        },
        gold: {
          DEFAULT: '#C9A84C',
          light: '#E2CD8A',
          dark: '#9F833A',
        },
        border: {
          DEFAULT: '#E8E8E8',
          hover: '#CCCCCC',
          dark: '#262626',
        },
        'premium-blue': {
          DEFAULT: '#5B7FFF',
          hover: '#4A6FEE',
          light: '#EEF2FF',
        },
        'text-primary': '#111111',
        'text-secondary': '#6B6B6B',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        sans: ['"Inter"', 'sans-serif'],
      },
      boxShadow: {
        luxury: '0 4px 24px rgba(0,0,0,0.08)',
        card: '0 2px 12px rgba(0,0,0,0.06)',
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