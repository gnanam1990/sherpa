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
        // Glass Aurora additive palette (existing base-cerulean kept as-is)
        'base-cerulean-ice': '#CFF6FF',
        'base-cerulean-light': '#A6F2FF',
        'base-magenta': '#FF4DB8',
        'base-purple': '#9D4EFF',
        'aurora-deep': '#04061A',
        'aurora-mid': '#0B0F38',
        'aurora-violet': '#1B0C44',
        'aurora-warm': '#2B0640',
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
        // Glass Aurora additive background images (existing keys above kept as-is)
        'aurora-base':
          'linear-gradient(180deg, #04061A 0%, #0B0F38 45%, #1B0C44 75%, #2B0640 100%)',
        'blue-orb': 'radial-gradient(circle, #0052FF 0%, transparent 65%)',
        'cerulean-orb': 'radial-gradient(circle, #00E1FF 0%, transparent 60%)',
        'magenta-orb': 'radial-gradient(circle, #FF4DB8 0%, transparent 65%)',
        'purple-orb': 'radial-gradient(circle, #9D4EFF 0%, transparent 65%)',
        'gradient-cerulean':
          'linear-gradient(135deg, #CFF6FF 0%, #00E1FF 55%, #4D80FF 100%)',
        'gradient-text-ice': 'linear-gradient(180deg, #FFFFFF 0%, #CFF6FF 100%)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
        // Glass Aurora: signature display face (additive; no prior serif key)
        serif: ['"Instrument Serif"', 'ui-serif', 'Georgia', 'serif'],
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
        // Glass Aurora additive shadows (existing glow-blue/glow-cerulean kept as-is)
        'glow-cerulean-sm': '0 0 8px rgba(0, 225, 255, 0.35)',
        'glow-magenta': '0 14px 40px rgba(255, 77, 184, 0.35)',
        glass:
          'inset 0 0 0 1px rgba(255, 255, 255, 0.10), 0 18px 40px rgba(0, 0, 0, 0.35)',
        'glass-deep': '0 30px 80px rgba(0, 0, 0, 0.45)',
        panel: '0 12px 32px rgba(0, 0, 0, 0.30)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        // Glass Aurora additive keyframes
        'aurora-drift': {
          '0%, 100%': { transform: 'translate3d(0, 0, 0) scale(1)' },
          '50%': { transform: 'translate3d(2%, -2%, 0) scale(1.05)' },
        },
        'caret-blink': {
          '50%': { opacity: '0' },
        },
        'ping-slow': {
          '0%': { opacity: '0.9', transform: 'scale(1)' },
          '70%': { opacity: '0', transform: 'scale(2.2)' },
          '100%': { opacity: '0', transform: 'scale(2.2)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        // Glass Aurora additive animations
        'aurora-drift': 'aurora-drift 18s ease-in-out infinite',
        'caret-blink': 'caret-blink 1s steps(1) infinite',
        'ping-slow': 'ping-slow 1.6s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
      backdropBlur: {
        thin: '16px',
        glass: '24px',
        deep: '28px',
      },
    },
  },
  plugins: [],
};

export default config;
