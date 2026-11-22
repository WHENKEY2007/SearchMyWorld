/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        porcelain: {
          50: '#FFFFFF',
          100: '#FBFBFA',
          200: '#F5F4F0',
          300: '#EAE8E3',
          400: '#D5D3CC',
        },
        onyx: {
          DEFAULT: '#0E0E10',
          50: '#2A2A2E',
          100: '#1F1F23',
          200: '#18181B',
          300: '#121215',
          400: '#0E0E10',
        },
        charcoal: '#141416',
        alabaster: '#E8E6E1',
        pastel: {
          lilac: '#F0EAFF',
          lilacBorder: '#D8C7FF',
          peach: '#FFF0E5',
          peachBorder: '#FFD3B8',
          mint: '#F3F9D2',
          mintBorder: '#DDF08B',
          sky: '#EBF4FF',
          skyBorder: '#BCD9FF',
        },
        glow: {
          aura: 'rgba(155, 169, 255, 0.25)',
        }
      },
      boxShadow: {
        'soft': '0 8px 30px rgba(0, 0, 0, 0.04)',
        'soft-lg': '0 12px 40px rgba(0, 0, 0, 0.06)',
        'glow': '0 0 50px rgba(155, 169, 255, 0.35)',
      }
    },
  },
  plugins: [],
}
