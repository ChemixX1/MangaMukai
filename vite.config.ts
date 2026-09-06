import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// El equipo de desarrollo no resuelve mangamukai.com por DNS, y llamar al backend
// directamente desde localhost daria NetworkError/CORS. En desarrollo, Vite reenvia
// las rutas de datos (/wp-json) al backend por su IP directa, enviando el Host
// correcto, de modo que el navegador trabaja siempre contra su mismo origen.
const BACKEND_IP = 'https://50.31.188.151'
const BACKEND_HOST = 'mangamukai.com'

const backendProxy = {
  target: BACKEND_IP,
  changeOrigin: false,
  secure: false,
  headers: { host: BACKEND_HOST },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/wp-json': backendProxy,
      // Canje de sesion social OAuth (flujo cookieless con social_code) por el
      // mismo origen. El backend exige el header Origin de localhost para aceptar
      // el code, por eso lo forzamos aqui.
      '/mm-social-session': {
        target: BACKEND_IP,
        changeOrigin: false,
        secure: false,
        headers: { host: BACKEND_HOST, origin: 'http://localhost:5173' },
        rewrite: () => '/?mm_social_session=1',
      },
    },
  },
})
