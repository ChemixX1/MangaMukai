import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/theme.css'
import './styles/home.css'
import './styles/navigation.css'
import './styles/auth.css'
import './styles/manga.css'
import './styles/collections.css'
import App from './App.tsx'

// Siempre iniciar desde el top al refrescar
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}
window.scrollTo(0, 0);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
