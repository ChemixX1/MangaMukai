/**
 * Iconos vectoriales propios (trazados entregados por diseño): lupa y campana
 * del navbar y las monedas apiladas de la página "Más".
 */

interface GlyphProps {
  size?: number;
  className?: string;
}

/** Lupa: aro grande y grueso con un mango corto (el aro manda, el mango es la mitad de su diámetro). */
export const SearchGlyph = ({ size = 22, className }: GlyphProps) => (
  <svg width={size} height={size} viewBox="0 0 200 200" className={className} aria-hidden="true">
    <circle cx="90" cy="90" r="72" fill="none" stroke="currentColor" strokeWidth="18" />
    <line x1="141" y1="141" x2="180" y2="180" stroke="currentColor" strokeWidth="18" strokeLinecap="butt" />
  </svg>
);

/** Lápiz de "Editar perfil" (viewBox del diseño 175×153): trazo curvo, cuerpo y punta rellenos. */
export const EditPencilGlyph = ({ size = 22, className }: GlyphProps) => (
  <svg width={size} height={Math.round(size * 153 / 175)} viewBox="0 0 175 153" className={className} fill="currentColor" aria-hidden="true">
    <path d="M16 8C33 8 51 10 62 16C71 21 75 27 75 33C75 42 69 48 61 56L33 83C28 88 27 94 30 99C31 102 33 104 36 106L35 118C24 112 17 104 16 94C15 84 20 76 28 68L58 39C63 34 64 31 60 28C53 22 37 20 16 20Z" />
    <path d="M96 52L126 82L73 134C72 135 70 136 68 136H49C45 136 42 133 42 129V108C42 105 43 103 45 101Z" />
    <path d="M120 29C122 27 125 27 127 29L148 50C151 53 151 56 148 59L136 71L106 41Z" />
  </svg>
);

/** Publicaciones: documento con líneas y bloque (viewBox del diseño 430×430), trazo de 24. */
export const PostGlyph = ({ size = 22, className }: GlyphProps) => (
  <svg width={size} height={size} viewBox="0 0 430 430" className={className} fill="none" stroke="currentColor" strokeWidth="24" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M110 185V70C110 35 128 15 165 15H350C385 15 405 35 405 70V330C405 365 385 382 350 382H75" />
    <path d="M110 185H60C45 185 37 195 37 210V335C37 365 52 382 75 382C98 382 110 364 110 335V185" />
    <line x1="183" y1="87" x2="330" y2="87" />
    <line x1="183" y1="161" x2="330" y2="161" />
    <rect x="171" y="222" width="73" height="98" rx="13" fill="currentColor" stroke="none" />
    <line x1="282" y1="234" x2="330" y2="234" />
    <line x1="282" y1="308" x2="330" y2="308" />
  </svg>
);

/** Guardados: marcador con línea exterior (viewBox del diseño 377×430), trazo de 43. */
export const SavedGlyph = ({ size = 22, className }: GlyphProps) => (
  <svg width={Math.round(size * 377 / 430)} height={size} viewBox="0 0 377 430" className={className} fill="none" stroke="currentColor" strokeWidth="43" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M135 36H318C329 36 338 45 338 56V325" />
    <path d="M64 398V126C64 116 72 108 82 108H247C257 108 265 116 265 126V398L164 326L64 398Z" />
  </svg>
);

/** Libro abierto del lector (viewBox del diseño 268×247), relleno; el color lo pone el texto. */
export const ReaderBookGlyph = ({ size = 22, className }: GlyphProps) => (
  <svg width={size} height={Math.round(size * 247 / 268)} viewBox="0 0 268 247" className={className} fill="currentColor" fillRule="evenodd" clipRule="evenodd" aria-hidden="true">
    <path d="M39 61L39 190L42 192L60 185L64 185L65 184L74 183L75 182L98 182L99 183L110 184L120 187L130 192L132 194L135 194L139 191L141 191L152 186L155 186L164 183L170 183L171 182L193 182L194 183L205 184L217 188L221 191L226 191L227 190L227 61L219 56L212 54L212 169L210 170L209 169L201 168L200 167L195 167L194 166L170 166L169 167L156 169L144 173L135 178L132 177L132 86L133 85L133 80L132 79L133 78L133 75L132 74L132 61L119 54L109 51L105 51L104 50L98 50L97 49L74 49L73 50L62 51L47 56ZM56 70L64 67L73 66L74 65L96 65L97 66L103 66L104 67L111 68L117 72L117 168L116 169L108 168L107 167L101 167L100 166L74 166L73 167L62 168L57 170L55 169L55 71Z" />
    <path d="M193 20L151 61L151 155L193 117Z" />
  </svg>
);

/** Campana con badajo (viewBox del diseño 180×197): solo contorno, sin relleno. */
export const BellGlyph = ({ size = 22, className }: GlyphProps) => (
  <svg width={size} height={size} viewBox="0 0 180 197" className={className} fill="none" stroke="currentColor" strokeWidth="14" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
    <path d="M87.5 6.5C53.8 6.5 26.5 32.4 26.5 64.2L26.5 98.7L13.3 132.9C11.2 138.2 14.5 142.1 20.2 142.1H154.8C160.5 142.1 163.8 138.2 161.7 132.9L148.5 98.7V64.2C148.5 32.4 121.2 6.5 87.5 6.5Z" />
    <path d="M60.5 155H114.5C112.6 167.2 101.7 176.2 87.5 176.2C73.3 176.2 62.4 167.2 60.5 155Z" />
  </svg>
);

/** Tres monedas apiladas con degradado (viewBox del diseño 480×432). */
export const CoinsStack = ({ size = 28, className }: GlyphProps) => (
  <svg width={size} height={size * 0.9} viewBox="0 0 480 432" fill="none" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="mm-coin-face" x1="70" y1="70" x2="390" y2="320" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#FFC61E" />
        <stop offset="0.48" stopColor="#FFB83A" />
        <stop offset="1" stopColor="#FF9354" />
      </linearGradient>
      <linearGradient id="mm-coin-side" x1="90" y1="190" x2="375" y2="360" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#FF7A3E" />
        <stop offset="1" stopColor="#F94E37" />
      </linearGradient>
    </defs>
    <path d="M59 277C59 237.2 124.4 205 205.5 205C286.6 205 352 237.2 352 277V318C352 357.8 286.6 390 205.5 390C124.4 390 59 357.8 59 318V277Z" fill="url(#mm-coin-side)" />
    <path d="M352 277C352 316.8 286.6 349 205.5 349C124.4 349 59 316.8 59 277C59 237.2 124.4 205 205.5 205C286.6 205 352 237.2 352 277Z" fill="url(#mm-coin-face)" />
    <path d="M141 199C141 156.4 206.4 122 287 122C367.6 122 433 156.4 433 199V237C433 279.6 367.6 314 287 314C206.4 314 141 279.6 141 237V199Z" fill="url(#mm-coin-side)" />
    <path d="M433 199C433 241.6 367.6 276 287 276C206.4 276 141 241.6 141 199C141 156.4 206.4 122 287 122C367.6 122 433 156.4 433 199Z" fill="url(#mm-coin-face)" />
    <path d="M42 108C42 65 107.4 30 188 30C268.6 30 334 65 334 108V152C334 195 268.6 230 188 230C107.4 230 42 195 42 152V108Z" fill="url(#mm-coin-side)" />
    <path d="M334 108C334 151 268.6 186 188 186C107.4 186 42 151 42 108C42 65 107.4 30 188 30C268.6 30 334 65 334 108Z" fill="url(#mm-coin-face)" />
  </svg>
);
