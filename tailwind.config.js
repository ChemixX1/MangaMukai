/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Importante para tu hook de tema
  theme: {
    extend: {
      colors: {
        // Tu amarillo mostaza específico
        'brand-yellow': '#eab308', 
        
        // Tus colores oscuros personalizados
        'dark-bg': '#0a0a0a',     
        'dark-surface': '#171717',
      }
    },
  },
  plugins: [
    require("tailwindcss-animate"), // Asegúrate de tenerlo: npm i tailwindcss-animate
  ],
}
