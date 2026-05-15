import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
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
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
