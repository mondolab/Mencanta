/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#FAF9F7',
        ink: '#242222',
        beige: '#E8DED3',
        sand: '#CBBBA9',
        blush: '#D9BFC1',
        steel: '#B8B8B8',
        line: '#E8E3DE',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Montserrat', 'Inter', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        pill: '9999px',
      },
      boxShadow: {
        soft: '0 8px 30px rgba(36, 34, 34, 0.06)',
        lift: '0 14px 40px rgba(36, 34, 34, 0.10)',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        fadeUp: 'fadeUp 0.4s ease both',
        fadeIn: 'fadeIn 0.3s ease both',
      },
    },
  },
  plugins: [],
}