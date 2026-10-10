# MangaMukai

Frontend React + TypeScript + Vite + Tailwind, conectado a WordPress.

## Estructura

- `src/pages/`: pantallas y composición de cada ruta.
- `src/components/`: componentes por dominio: home, manga, shop, character, collections, layout, modals y social.
- `src/components/ui/`: piezas compartidas: títulos, pestañas, paginación, etiquetas y botones.
- `src/components/*/mobile/`: composición para pantallas pequeñas; usa el mismo Tailwind, catálogo y componentes compartidos.
- `src/styles/`: tema y estilos por dominio. No hay hojas de estilo independientes para móvil.
- `src/hooks/`, `src/context/`: comportamiento reutilizable y estado de React.
- `src/services/`: API, autenticación y persistencia.
- `src/config/`, `src/data/`, `src/types/`, `src/utils/`: configuración, datos, tipos y utilidades.
- `src/assets/`: recursos importados por los componentes; Vite los procesa.
- `public/`: recursos con URL fija (favicon, imágenes de colección y promociones).
- `backend/`: plugins de WordPress y conexiones con el servidor. `server/`: configuración y archivos SEO del servidor.
- `scripts/`: compilación y despliegue. `tools/moderacion-mensajes/`: herramienta local de moderación.
- `docs/`: documentación del servidor, tienda y chat.

## Estilos compartidos

`tailwind.config.js` define tipografías, colores y animaciones. `src/styles/theme.css` contiene las variables de superficie, texto y acentos para los temas claro y oscuro. Las utilidades `bg-surface`, `text-ink`, `bg-panel`, `text-muted` y `border-line` responden al tema automáticamente.

`src/main.tsx` importa la base y los estilos comunes por sección. Los estilos específicos de tienda, experiencias y recarga se cargan desde sus páginas. La colección B&N cambia sus acentos mediante variables locales.

El breakpoint compartido es `lg` (1024 px). Las composiciones móvil y escritorio mantienen sus posiciones propias; comparten el lenguaje visual, los iconos, las reacciones, las tarjetas de producto y otros controles. Antes de crear una variante, revisa los componentes de `ui/` y del dominio correspondiente.

## Desarrollo y validación

```bash
npm ci
npm run dev
npm run lint
npm run build
npm run preview
```

Vite muestra el puerto local en la terminal. `npm run build` comprueba TypeScript, compila el frontend y copia `server/` y `backend/` a `dist/`. Compilar no publica cambios.

`src/config/api.ts` centraliza las rutas del backend. Puedes copiar `.env.example` a `.env` para configurar `VITE_WORDPRESS_URL`. En desarrollo, `vite.config.ts` incluye el proxy de WordPress del proyecto; en producción, sin variable, se usa el mismo origen.

## Documentación

- [Servidor y despliegue](docs/servidor.md)
- [Catálogo y promociones de muestra](docs/shop-local-design.md)
- [Chat de personajes y cuota](docs/character-chat-local.md)
