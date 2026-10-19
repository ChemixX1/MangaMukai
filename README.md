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
- `docs/`: documentación del servidor y referencias de diseño.
- La raíz contiene la configuración de desarrollo y compilación. Las imágenes de cada sección viven en `src/assets/`; las de perfil están en `src/assets/profile/`.

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

## Vista compartida en GitHub Pages

Enlace: https://chemixx1.github.io/MangaMukai/

La rama `gh-pages` contiene una copia compilada del frontend. Para preparar otra
copia, ejecutar `npx tsc -b` y `node scripts/build-pages.mjs`; publicar el contenido
de `dist-pages/` en esa rama. La publicación no actualiza el servidor WordPress.
La vista usa rutas con `#` para que los enlaces internos funcionen en Pages,
y consulta la API de `https://mangamukai.com`. Las funciones que necesitan PHP
local (como `/api/character-chat`) no están disponibles en este alojamiento.

## Documentación del servidor

- [Servidor y despliegue](docs/servidor.md)
- [Referencias de iconos](docs/design/icons.md)
