import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}', '../shared/src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          light: '#4CAF50',
          dark: '#0A3D0F',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        sidebar: {
          DEFAULT: '#0B1A33',
          foreground: '#FFFFFF',
          hover: '#1B2D52',
          active: '#2563EB',
          muted: '#64748b',
          border: '#1B2D52',
          'gradient-from': '#0B1A33',
          'gradient-to': '#1B2D52',
        },
        sidebar2: {
          DEFAULT: '#0C2338',
          foreground: '#FFFFFF',
          'primary-text': '#FFFFFF',
          'secondary-text': '#A7B4C8',
          active: '#1E88E5',
          hover: '#163D63',
          bg: '#071A2F',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        poppins: ['Poppins', 'sans-serif'],
      },
      // fade-in and slide-in keyframes removed — they conflict with
      // the tailwindcss-animate plugin which provides the same utility
      // classes with the same names.
      keyframes: {},
      animation: {},
    },
  },
  plugins: [animate],
};

export default config;
