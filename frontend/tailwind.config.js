/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Map common standard tailwind colors to our global CSS variables
        // so that existing components inherit the global Theme automatically.
        white: 'var(--cp-surface)',
        black: 'var(--cp-text)',
        slate: {
          50: 'var(--cp-bg)',
          100: 'var(--cp-surface2)',
          200: 'var(--cp-border)',
          300: 'var(--cp-border)',
          400: 'var(--cp-text-muted)',
          500: 'var(--cp-text-muted)',
          600: 'var(--cp-text-muted)',
          700: 'var(--cp-text)',
          800: 'var(--cp-text)',
          900: 'var(--cp-text)',
          950: 'var(--cp-text)',
        },
        gray: {
          50: 'var(--cp-bg)',
          100: 'var(--cp-surface2)',
          200: 'var(--cp-border)',
          300: 'var(--cp-border)',
          400: 'var(--cp-text-muted)',
          500: 'var(--cp-text-muted)',
          600: 'var(--cp-text-muted)',
          700: 'var(--cp-text)',
          800: 'var(--cp-text)',
          900: 'var(--cp-text)',
        },
        indigo: {
          50: 'var(--cp-primary-light)',
          100: 'var(--cp-primary-light)',
          500: 'var(--cp-primary)',
          600: 'var(--cp-primary)',
          700: 'var(--cp-primary)',
        }
      }
    },
  },
  plugins: [],
}
