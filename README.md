# MangaMukai

MangaMukai es un sitio de lectura de manga en español. Incluye colecciones,
capítulos, recomendaciones de la comunidad, perfiles, Character Chat y una
tienda. El frontend usa React, TypeScript, Vite y Tailwind. Los datos y las
cuentas se conectan con WordPress.

## Uso del proyecto

Para usar, modificar o publicar el código y el diseño propios del proyecto,
solicita permiso al dueño y espera su autorización por escrito. Puedes hacerlo
desde [Contacto](https://mangamukai.com/contacto). Las condiciones completas
están en [LICENSE]. Los recursos de terceros conservan sus licencias.

## Desarrollo

```bash
npm ci
npm run dev
```

Puedes copiar `.env.example` a `.env` y configurar `VITE_WORDPRESS_URL`.
La configuración de la API está en `src/config/api.ts`. Durante el desarrollo,
Vite puede consultar WordPress a través de su proxy local.

## Comprobaciones

```bash
npm run lint
npm test
npm run build
npm run preview
```

La compilación comprueba TypeScript, genera `dist/` y copia los archivos de
`server/` y `backend/`. No publica cambios. `npm run deploy:dry` permite revisar
el despliegue y `npm run deploy` lo realiza cuando se dispone de la configuración.

## Organización

- `src/pages` contiene las pantallas. El inicio usa una única composición adaptable.
- `src/components` reúne los componentes de cada sección y sus piezas compartidas.
- `src/styles` contiene los estilos. Los temas y tamaños de pantalla comparten la misma base.
- `src/services`, `src/hooks` y `src/utils` gestionan datos, comportamiento y utilidades.
- `src/assets` contiene los recursos que procesa Vite. `public` guarda los de dirección fija.
- `server` contiene las rutas, los metadatos y los sitemaps que se sirven con PHP.
- `backend` contiene los complementos de WordPress mantenidos en este repositorio.
- `scripts` contiene las pruebas y las tareas de compilación y despliegue.
- `tools/moderacion-mensajes` contiene la herramienta local de moderación.

Las composiciones móviles que tienen un diseño propio siguen activas. La
Biblioteca se utiliza dentro del buscador, aunque ya no tenga una página
independiente. Los archivos de servidor, las pruebas y la moderación forman
parte del proyecto aunque no aparezcan como una pantalla pública.

En Comunidad solo se recomiendan mangas, con su portada. El buscador de mangas
se abre sobre el contenido y no desplaza el formulario.


## Documentación

- [Servidor y despliegue](docs/servidor.md)
- [Apariencia en buscadores](docs/seo.md)
- [Notificaciones de Comunidad](docs/community-notifications.md)
- [Transacciones](docs/transactions.md)
