# Promociones de la tienda local

Las tres promociones se configuran en `src/data/shopPromotions.ts`.

- `backgroundImage`: diseño que queda dentro del panel con sus esquinas redondeadas
- `foregroundImage`: imagen que sobresale por encima o por el lado del panel; usa PNG o WebP con transparencia para personajes o productos recortados
- `foregroundType`: `character` para una figura vertical o `product` para una portada/producto
- `eyebrow`, `title`, `action`: texto visible de la promoción
- `category`: filtro del catálogo que se activa al pulsar el botón

Guarda tus imágenes en `public/images/promotions/` y usa rutas como `/images/promotions/novedades.png`. El panel exterior tiene `overflow: visible`; solo la superficie interior recorta la imagen de fondo. Esto permite cambiar el diseño del fondo y el personaje de forma independiente. Los ejemplos actuales son ilustraciones y portadas, no promociones ni precios definitivos.

El movimiento responde al puntero en escritorio y se desactiva cuando el dispositivo solicita reducir animaciones. En móvil se mantiene la superposición estática sin depender del cursor. La cuadrícula del catálogo conserva 4 columnas en escritorio y 2 en móvil.

La ilustración completa de Gojo procede de la [página oficial de personajes de Jujutsu Kaisen](https://jujutsukaisen.jp/character/index_1st.php), archivo `https://jujutsukaisen.jp/images/chara_detail4.png`, utilizado como referencia visual local. Las portadas son las del catálogo existente de MangaMukai. Sustituye las imágenes de muestra por los recursos definitivos de la tienda.
