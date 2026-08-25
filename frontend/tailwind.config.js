/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        workbench: {
          bg: '#0B0E14',
          surface: '#111622',
          subtle: '#182030',
          hover: '#1E283D',
          border: '#1E293B',
          'border-subtle': '#334155',
          'border-focus': '#3B82F6',
        },
        cobalt: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
        },
        status: {
          eligible: '#10B981',
          recused: '#EF4444',
          overlap: '#F97316',
          review: '#EAB308',
          unresolved: '#8B5CF6',
          draft: '#94A3B8',
          frozen: '#06B6D4',
          screening: '#3B82F6',
          ready: '#14B8A6',
          hold: '#F59E0B',
          active: '#10B981',
          closed: '#6B7280',
          cancelled: '#EF4444',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      borderRadius: {
        'sm': '4px',
        'DEFAULT': '6px',
        'md': '8px',
        'lg': '10px',
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
        'panel': '0 4px 12px 0 rgba(0, 0, 0, 0.4)',
        'modal': '0 10px 30px 0 rgba(0, 0, 0, 0.6)',
      }
    },
  },
  plugins: [],
};
