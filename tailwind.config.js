import plugin from 'tailwindcss/plugin';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {

        dela: ['"Dela Gothic One"', 'Montserrat', 'sans-serif'],

        montserrat: ['Montserrat', 'sans-serif'],

        inter: ['Inter', 'sans-serif'],

        anta: ['Anta', 'sans-serif'],

        audiowide: ['Audiowide', 'sans-serif'],
        orbitron: ['Orbitron', 'sans-serif'],
        poppins: ['Poppins', 'sans-serif'],
        goldman: ['Goldman', 'Montserrat', 'sans-serif'],
        google: ['"Google Sans Flex"', 'Montserrat', 'sans-serif'],
        russo: ['"Russo One"', 'Montserrat', 'sans-serif'],
        koho: ['KoHo', 'Montserrat', 'sans-serif'],
        raleway: ['Raleway', 'sans-serif'],

        rammetto: ['"Rammetto One"', 'Montserrat', 'sans-serif'],

        segoe: ['"Segoe UI"', 'Montserrat', 'sans-serif'],
      },
      colors: {

        surface: 'rgb(var(--mm-surface) / <alpha-value>)',
        ink: 'rgb(var(--mm-ink) / <alpha-value>)',
        panel: 'rgb(var(--mm-panel) / <alpha-value>)',
        media: 'rgb(var(--mm-media) / <alpha-value>)',
        muted: 'rgb(var(--mm-ink) / var(--mm-muted-alpha))',
        line: 'rgb(115 115 115 / var(--mm-line-alpha))',

        mukai: {
          pink: '#db2777',
          cyan: '#22d3ee',
          magenta: '#ff008c',
          purple: '#b000ad',
          gold: '#ffcd0f',
          orange: '#fb923c',
          free: 'var(--mm-free)',

          rose: '#ff4d88',
          sky: '#38d9f5',
          lemon: '#ffe45c',
          ink: '#090909',
        },
      },
      keyframes: {

        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.2' },
        },

        'dot-blink': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.45' },
        },

        flame: {
          '0%': { transform: 'scale(1, 1) rotate(0deg)' },
          '12%': { transform: 'scale(1.06, 1.16) rotate(-4deg)' },
          '26%': { transform: 'scale(0.96, 0.9) rotate(3deg)' },
          '40%': { transform: 'scale(1.1, 1.22) rotate(-2deg)' },
          '54%': { transform: 'scale(0.92, 0.78) rotate(4deg)' },
          '68%': { transform: 'scale(1.04, 1.1) rotate(-3deg)' },
          '82%': { transform: 'scale(0.97, 0.88) rotate(2deg)' },
          '100%': { transform: 'scale(1, 1) rotate(0deg)' },
        },

        'flame-sway': {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '30%': { transform: 'rotate(-5deg)' },
          '55%': { transform: 'rotate(2deg)' },
          '80%': { transform: 'rotate(5deg)' },
        },
        'flame-lick': {
          '0%, 100%': { transform: 'scale(1, 1) skewX(0deg) translateY(0)' },
          '18%': { transform: 'scale(0.95, 1.09) skewX(-4deg) translateY(-1px)' },
          '36%': { transform: 'scale(1.04, 0.94) skewX(3deg) translateY(0)' },
          '57%': { transform: 'scale(0.97, 1.07) skewX(4deg) translateY(-1px)' },
          '78%': { transform: 'scale(1.03, 0.96) skewX(-3deg) translateY(0)' },
        },

        'ring-trace': {
          from: { strokeDasharray: '0 239' },
          to: { strokeDasharray: '239 0' },
        },

        paint: {
          from: { clipPath: 'inset(100% 0 0 0)' },
          to: { clipPath: 'inset(0 0 0 0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },

        'marquee-x': {
          from: { transform: 'translate3d(0, 0, 0)' },
          to: { transform: 'translate3d(-50%, 0, 0)' },
        },
        'marquee-y': {
          from: { transform: 'translate3d(0, 0, 0)' },
          to: { transform: 'translate3d(0, -50%, 0)' },
        },

        scan: {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(100%)' },
        },
      },
      animation: {
        blink: 'blink 1.3s ease-in-out infinite',
        'dot-blink': 'dot-blink 2.8s ease-in-out infinite',
        flame: 'flame 1.15s ease-in-out infinite',
        'flame-sway': 'flame-sway 3.1s ease-in-out infinite',
        'flame-lick': 'flame-lick 1.3s ease-in-out infinite',
        'ring-trace': 'ring-trace 0.65s cubic-bezier(0.33, 1, 0.68, 1)',
        paint: 'paint 0.5s cubic-bezier(0.33, 1, 0.68, 1) forwards',
        'fade-in': 'fade-in 200ms ease-out both',
        'marquee-x': 'marquee-x 52s linear infinite',
        'marquee-y': 'marquee-y 112s linear infinite',
        scan: 'scan 2.7s cubic-bezier(0.4, 0, 0.2, 1) infinite',
      },
    },
  },
  plugins: [
    plugin(({ addUtilities }) => {
      addUtilities({

        '.no-scrollbar': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        },
        '.tap-transparent': { '-webkit-tap-highlight-color': 'transparent' },

        '.focus-scope': {
          ':where(&) :where(button, a, input):focus-visible': {
            outline: '2px solid var(--focus-color, currentColor)',
            'outline-offset': 'var(--focus-offset, 3px)',
          },
        },
      });
    }),
  ],
};
