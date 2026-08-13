/** @type {import('tailwindcss').Config} */

// Использует CSS-переменные с RGB-триплетами для поддержки alpha-модификаторов:
// `bg-lime-primary/50` → rgb(var(--lime-primary) / 0.5)
const rgbVar = (name) => `rgb(var(${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        lime: {
          primary: rgbVar('--lime-primary'),
          dark: rgbVar('--lime-dark'),
          muted: rgbVar('--lime-muted'),
        },
        ink: {
          deep: rgbVar('--ink-deep'),
          card: rgbVar('--ink-card'),
          elevated: rgbVar('--ink-elevated'),
          surface: rgbVar('--ink-surface'),
          border: rgbVar('--ink-border'),
        },
        text: {
          primary: rgbVar('--text-primary'),
          secondary: rgbVar('--text-secondary'),
          muted: rgbVar('--text-muted'),
        },
        danger: rgbVar('--danger'),
        success: rgbVar('--success'),
      },
      fontFamily: {
        sans: ['"TikTok Sans"', 'system-ui', 'sans-serif'],
      },
      // rem вместо жёстких px (text-[10px]/text-[11px]) — мелкие подписи
      // масштабируются вместе с настройкой размера текста в браузере
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1.3' }], // ~11px
        '3xs': ['0.625rem', { lineHeight: '1.3' }], // ~10px
      },
      borderRadius: {
        DEFAULT: '4px',
      },
      transitionDuration: {
        DEFAULT: '200ms',
      },
    },
  },
  plugins: [],
};
