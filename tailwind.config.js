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
        // ── CI Color Palette ─────────────────────────────
        // All values reference CSS custom properties defined
        // in index.css so a single change propagates everywhere.
        primary: {
          DEFAULT: 'rgb(var(--color-primary) / <alpha-value>)',
          hover:   'rgb(var(--color-primary-hover) / <alpha-value>)',
          light:   'rgb(var(--color-primary-light) / <alpha-value>)',
          lighter: 'rgb(var(--color-primary-lighter) / <alpha-value>)',
          dark:    'rgb(var(--color-primary-hover) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--color-accent) / <alpha-value>)',
          hover:   'rgb(var(--color-accent-hover) / <alpha-value>)',
          light:   'rgb(var(--color-accent-light) / <alpha-value>)',
        },
        cream: {
          DEFAULT: 'rgb(var(--color-cream) / <alpha-value>)',
          light:   'rgb(var(--color-cream-light) / <alpha-value>)',
        },
        // ── Semantic surface / border / text colours ─────
        // These automatically swap between light & dark mode
        // via the CSS variable overrides in .dark { … }.
        surface: {
          DEFAULT:  'rgb(var(--color-surface) / <alpha-value>)',
          elevated: 'rgb(var(--color-surface-elevated) / <alpha-value>)',
        },
        'theme-border': {
          DEFAULT: 'rgb(var(--color-border) / <alpha-value>)',
          input:   'rgb(var(--color-border-input) / <alpha-value>)',
        },
        'theme-text': {
          DEFAULT:   'rgb(var(--color-text-primary) / <alpha-value>)',
          secondary: 'rgb(var(--color-text-secondary) / <alpha-value>)',
          tertiary:  'rgb(var(--color-text-tertiary) / <alpha-value>)',
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
        'focus': 'rgb(var(--color-ring-focus) / <alpha-value>)',
        'focus-glow': 'rgb(var(--color-ring-focus) / 0.3)',
      },
    },
  },
  plugins: [],
}
