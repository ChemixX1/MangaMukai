import plugin from 'tailwindcss/plugin';

/**
 * Sistema de diseño de MangaMukai, compartido por la versión móvil y la de
 * escritorio. Los colores de superficie cambian con el tema (clase `dark` en
 * <html>, o `theme-dark` para forzar el oscuro en una sección); sus valores
 * viven en `src/index.css`.
 *
 * @type {import('tailwindcss').Config}
 */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        // Titulares de sección ("Tendencia Ahora", "Lo Más Reciente").
        dela: ['"Dela Gothic One"', 'Montserrat', 'sans-serif'],
        // Texto de interfaz: títulos de manga, botones, etiquetas de tipo.
        montserrat: ['Montserrat', 'sans-serif'],
        // Sinopsis.
        inter: ['Inter', 'sans-serif'],
        // Datos: capítulo, fecha, géneros, contadores.
        anta: ['Anta', 'sans-serif'],
        // Datos técnicos: vistas, "GRATIS" / "PAGO".
        audiowide: ['Audiowide', 'sans-serif'],
        orbitron: ['Orbitron', 'sans-serif'],
        poppins: ['Poppins', 'sans-serif'],
        goldman: ['Goldman', 'Montserrat', 'sans-serif'],
        google: ['"Google Sans Flex"', 'Montserrat', 'sans-serif'],
        russo: ['"Russo One"', 'Montserrat', 'sans-serif'],
        koho: ['KoHo', 'Montserrat', 'sans-serif'],
        raleway: ['Raleway', 'sans-serif'],
      },
      colors: {
        // Superficies y tinta del tema.
        surface: 'rgb(var(--mm-surface) / <alpha-value>)',
        ink: 'rgb(var(--mm-ink) / <alpha-value>)',
        panel: 'rgb(var(--mm-panel) / <alpha-value>)',
        media: 'rgb(var(--mm-media) / <alpha-value>)',
        muted: 'rgb(var(--mm-ink) / var(--mm-muted-alpha))',
        line: 'rgb(115 115 115 / var(--mm-line-alpha))',
        // Acentos de marca.
        mukai: {
          pink: '#db2777', // sección femenina
          cyan: '#22d3ee', // sección juvenil
          magenta: '#ff008c', // ficha de manga
          purple: '#b000ad',
          gold: '#ffcd0f',
          orange: '#fb923c',
          free: '#22e05a', // punto de "GRATIS"
        },
      },
      keyframes: {
        // Punto verde de "GRATIS": parpadeo suave, sin brillo.
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.2' },
        },
        // Punto del tipo de obra: encendido/apagado seco.
        'dot-blink': {
          '0%, 55%': { opacity: '1' },
          '56%, 100%': { opacity: '0.15' },
        },
        // Llama de "NUEVO": se aviva desde la base con un leve vaivén.
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
        // Llama de "Inicia un Nuevo Chat": balanceo lento + lengüeteo rápido.
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
        // Aro de las reacciones: se dibuja dando una vuelta.
        'ring-trace': {
          from: { strokeDasharray: '0 239' },
          to: { strokeDasharray: '239 0' },
        },
        // Reacción de comentario: se pinta de abajo arriba.
        paint: {
          from: { clipPath: 'inset(100% 0 0 0)' },
          to: { clipPath: 'inset(0 0 0 0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
      animation: {
        blink: 'blink 1.3s ease-in-out infinite',
        'dot-blink': 'dot-blink 1.6s steps(1, end) infinite',
        flame: 'flame 1.15s ease-in-out infinite',
        'flame-sway': 'flame-sway 3.1s ease-in-out infinite',
        'flame-lick': 'flame-lick 1.3s ease-in-out infinite',
        'ring-trace': 'ring-trace 0.65s cubic-bezier(0.33, 1, 0.68, 1)',
        paint: 'paint 0.5s cubic-bezier(0.33, 1, 0.68, 1) forwards',
        'fade-in': 'fade-in 200ms ease-out both',
      },
    },
  },
  plugins: [
    plugin(({ addUtilities }) => {
      addUtilities({
        // Desplazamiento sin barra visible (carruseles y filtros horizontales).
        '.no-scrollbar': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        },
        '.tap-transparent': { '-webkit-tap-highlight-color': 'transparent' },
        // Anillo de foco visible con el color del texto para todo lo pulsable de una sección.
        '.focus-scope': {
          '& :is(button, a, input):focus-visible': { outline: '2px solid currentColor', 'outline-offset': '3px' },
        },
      });
    }),
  ],
};
