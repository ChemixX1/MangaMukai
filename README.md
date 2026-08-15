# MangaMukai Web

Frontend editable de MangaMukai, construido con React, TypeScript, Vite y Tailwind CSS. Consume el backend de WordPress mediante una URL centralizada y conserva los parches PHP necesarios para producción.

## Arquitectura

```text
MangaMukai-WebSite1/
├── public/                  # Archivos estáticos servidos sin procesar
├── scripts/                 # Automatización del build
├── server/                  # Backend y parches de WordPress
│   ├── backend-patches/
│   └── wp-content/mu-plugins/
├── src/
│   ├── assets/              # Imágenes agrupadas por uso
│   │   ├── banners/
│   │   └── modals/
│   ├── components/          # Componentes reutilizables por dominio
│   │   ├── collections/
│   │   ├── common/
│   │   ├── home/
│   │   ├── layout/
│   │   ├── manga/
│   │   └── modals/
│   ├── config/              # Variables y rutas compartidas
│   ├── context/             # Estado global de React
│   ├── hooks/               # Hooks reutilizables
│   ├── pages/               # Pantallas asociadas a las rutas
│   ├── services/            # API, autenticación y persistencia
│   └── types/               # Tipos compartidos
├── .env.example
└── package.json
```

`src/config/api.ts` es el único punto de configuración de la conexión con WordPress. `npm run build` compila el frontend y copia `server/` dentro de `dist/` para generar el paquete completo de despliegue.

## Desarrollo

```bash
npm install
npm run dev
```

Vite inicia normalmente en `http://localhost:5173`. Si ese puerto está ocupado, selecciona otro libre y lo muestra en la terminal.

## Variables de entorno

Copia `.env.example` como `.env` si necesitas apuntar a otra instalación de WordPress:

```env
VITE_WORDPRESS_URL=https://tu-wordpress.com
```

Sin esa variable, el frontend utiliza `https://mangamukai.com`.

## Validación y build

```bash
npm run lint
npm run build
npm run preview
```

- `lint` comprueba la calidad del código TypeScript/React.
- `build` genera el frontend y agrega el backend de `server/`.
- `preview` sirve localmente el contenido final de `dist/`.
