/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#13b6ec',
        'primary-light': '#3A86FF',
        'background-light': '#f6f8f8',
        'background-dark': '#101d22',
        'surface-dark': '#192d33',
        'secondary-text-dark': '#92bbc9',
        'card-dark': '#1a2c33',
        'border-dark': '#325a67',
      },
      fontFamily: {
        display: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
        full: '9999px',
      },
      fontSize: {
        xs: ['12px', '16px'],
        sm: ['14px', '20px'],
        base: ['16px', '24px'],
        lg: ['18px', '28px'],
        xl: ['20px', '28px'],
        '2xl': ['24px', '32px'],
        '[22px]': ['22px', '28px'],
      },
    },
  },
  plugins: [],
};
