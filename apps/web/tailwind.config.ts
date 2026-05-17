import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        lg: '2rem',
      },
    },
    extend: {
      colors: {
        'base-blue': {
          DEFAULT: '#0052FF',
          dark: '#003DB8',
          light: '#4D80FF',
          50: '#E8EFFF',
        },
        'base-cerulean': '#00E1FF',
        'base-green': '#00D395',
        'base-yellow': '#FFD12F',
        'base-red': '#FF453A',
        'base-near-black': '#0A0B0D',
        'base-gray': {
          50: '#FAFAFB',
          100: '#F7F8FA',
          200: '#EAECEF',
          300: '#D4D8DC',
          500: '#5B616D',
          800: '#1F2125',
          900: '#16181C',
        },
        background: 'hsl(var(--background) / <alpha-value>)',
        foreground: 'hsl(var(--foreground) / <alpha-value>)',
        card: {
          DEFAULT: 'hsl(var(--card) / <alpha-value>)',
          foreground: 'hsl(var(--card-foreground) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted) / <alpha-value>)',
          foreground: 'hsl(var(--muted-foreground) / <alpha-value>)',
        },
        border: 'hsl(var(--border) / <alpha-value>)',
        input: 'hsl(var(--input) / <alpha-value>)',
        ring: 'hsl(var(--ring) / <alpha-value>)',
        primary: {
          DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
          foreground: 'hsl(var(--primary-foreground) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent) / <alpha-value>)',
          foreground: 'hsl(var(--accent-foreground) / <alpha-value>)',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive) / <alpha-value>)',
          foreground: 'hsl(var(--destructive-foreground) / <alpha-value>)',
        },
        sherpa: {
          blue: '#0052FF',
          bg: '#0B0D10',
          surface: '#14171C',
          surface2: '#1B1F26',
          fg: '#F5F7FA',
          muted: '#8A94A6',
          danger: '#FF5A5F',
          success: '#3CCB7F',
          warning: '#F5A623',
        },
      },
      backgroundImage: {
        'base-gradient': 'linear-gradient(135deg, #0052FF 0%, #003DB8 100%)',
        'cerulean-glow':
          'radial-gradient(circle, rgba(0, 225, 255, 0.4) 0%, transparent 70%)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: '10px',
        xl: '12px',
        '2xl': '14px',
        '3xl': '20px',
      },
      boxShadow: {
        'glow-blue': '0 4px 16px rgba(0, 82, 255, 0.25)',
        'card-soft': '0 4px 12px rgba(0, 82, 255, 0.04)',
        'card-soft-dark': '0 4px 12px rgba(0, 0, 0, 0.4)',
        'glow-cerulean': '0 0 16px rgba(0, 225, 255, 0.4)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
