/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        terracotta: {
          DEFAULT: '#C4622D',
          light: '#D4846E',
          dark: '#A04E20',
        },
        olive: {
          DEFAULT: '#6B7C3A',
          light: '#8A9E50',
          dark: '#4E5C28',
        },
        cream: {
          DEFAULT: '#F5F0E8',
          dark: '#E8DDD0',
        },
        brown: {
          DEFAULT: '#3D2B1F',
          light: '#6B4C3B',
        },
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', '"Times New Roman"', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        tuscany: '0 4px 24px rgba(61, 43, 31, 0.12)',
        'tuscany-lg': '0 8px 48px rgba(61, 43, 31, 0.18)',
      },
    },
  },
  plugins: [],
};
