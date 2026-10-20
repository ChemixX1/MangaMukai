import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { seoHtml } from './scripts/seo-html.mjs'

const BACKEND_IP = 'https://50.31.188.151'
const BACKEND_HOST = 'mangamukai.com'

const backendProxy = {
  target: BACKEND_IP,
  changeOrigin: false,
  secure: false,
  headers: { host: BACKEND_HOST },
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), {
    name: 'mangamukai-seo',
    transformIndexHtml: (html: string) => seoHtml(html, { ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env }),
  }],
  server: {
    proxy: {
      '/wp-json': backendProxy,

      '/mm-social-session': {
        target: BACKEND_IP,
        changeOrigin: false,
        secure: false,
        headers: { host: BACKEND_HOST, origin: 'http://localhost:5173' },
        rewrite: () => '/?mm_social_session=1',
      },
    },
  },
}))
