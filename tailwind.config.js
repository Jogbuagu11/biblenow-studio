/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        // Custom colors for BibleNOW Studio
        primary: {
          50: '#fef7ed',
          100: '#fdedd4',
          200: '#fbd7a9',
          300: '#f8bb71',
          400: '#f59538',
          500: '#f2751a',
          600: '#e35a0f',
          700: '#bc4210',
          800: '#963514',
          900: '#792e14',
        },
        // Dark chocolate brown theme colors
        chocolate: {
          50: '#fdf8f3',
          100: '#fbe8d7',
          200: '#f7d0b5',
          300: '#f2b088',
          400: '#ec8a5a',
          500: '#e66b3a',
          600: '#d7542e',
          700: '#b33f28',
          800: '#3a2a1a',
          900: '#2a1f13',
        },
        // Dark brown theme colors
        darkBrown: {
          50: '#f5f2ed',
          100: '#e8e0d5',
          200: '#d1c2a8',
          300: '#b39d75',
          400: '#95754a',
          500: '#7d5d2f',
          600: '#654a25',
          700: '#4f3a1e',
          800: '#3d2d18',
          900: '#2e2213',
        },
        // Almost white color for cards
        offWhite: {
          25: '#fefefe',
          50: '#fafafa',
          100: '#f5f5f5',
        }
      }
    },
  },
  plugins: [],
} 