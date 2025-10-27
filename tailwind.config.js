/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./client/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        'serif': ['Georgia', 'serif'],
      },
      colors: {
        // CI Color Palette
        primary: {
          DEFAULT: '#185757',
          hover: '#0f3a3b',
          light: '#A2D2B9',
          lighter: '#E7EFE4',
          dark: '#0f3a3b'
        },
        accent: {
          DEFAULT: '#A2D2B9',
          hover: '#8BC4A3',
          light: '#E7EFE4'
        },
        cream: {
          DEFAULT: '#E7EFE4',
          light: '#f5f9f4'
        },
        // Surface colors
        surface: {
          light: '#ffffff',
          DEFAULT: '#ffffff',
          dark: '#1f2937', // gray-800
        },
        // Surface variants
        'surface-elevated': {
          light: '#f9fafb', // gray-50
          dark: '#374151', // gray-700
        },
        // Border colors
        border: {
          light: '#e5e7eb', // gray-200
          DEFAULT: '#e5e7eb',
          dark: '#374151', // gray-700
        },
        'border-input': {
          light: '#d1d5db', // gray-300
          dark: '#4b5563', // gray-600
        },
        // Text colors
        'text-primary': {
          light: '#111827', // gray-900
          dark: '#f9fafb', // gray-50
        },
        'text-secondary': {
          light: '#374151', // gray-700
          dark: '#d1d5db', // gray-300
        },
        'text-tertiary': {
          light: '#6b7280', // gray-500
          dark: '#9ca3af', // gray-400
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      // Focus ring utilities
      ringWidth: {
        'focus': '2px',
        'focus-offset': '4px',
      },
      ringColor: {
        'focus': '#A2D2B9',
        'focus-glow': 'rgba(162, 210, 185, 0.3)',
      },
    },
  },
  plugins: [],
}
