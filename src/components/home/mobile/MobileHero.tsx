import { useCallback, useEffect, useRef, useState, type TouchEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

import { useSavedMangas } from '../../../hooks/useSavedMangas';
import { useTheme } from '../../../hooks/useTheme';
import type { MangaCapitulo } from '../../../types/manga';
import { displayViews } from '../../../utils/seriesViews';
import { preloadImages } from '../../../utils/preloadImages';
import { CheckMark } from './CheckMark';
import { BookmarkIcon, EyeIcon, OpenBookIcon } from './icons';
import { ACCENT_HEX, cleanTitle, formatViewsEs, type MobileAccent } from './shared';

export interface HeroItem {
  id: number | string;
  title: string;
  coverImage: string;
  description: string;
  type: string;
  tags: string[];
  views: number;
}

export const toHeroItems = (mangas: MangaCapitulo[], limit = 8): HeroItem[] =>
  mangas.slice(0, limit).map((manga) => {
    const type = manga.tipo || 'Manga';
    const genres = (manga.genres && manga.genres.length > 0) ? manga.genres.map(String) : ['Romance'];
    return {
      id: manga.id,
      title: cleanTitle(manga.titulo),
      coverImage: manga.portada,
      description: manga.descripcion || 'Una historia increíble te espera...',
      type,
      tags: [type, ...genres].filter(Boolean).slice(0, 4),
      views: displayViews(manga),
    };
  });

interface MobileHeroProps {
  items: HeroItem[];
  accent: MobileAccent;
  /** Texto accesible del carrusel (“Mangas destacados”, “Mangas juveniles destacados”). */
  label: string;
  /** Hueco superior: el primer hero deja sitio a la cabecera fija; el juvenil, al cartel blanco. */
  topSpacingClass?: string;
  /**
   * `stacked`: central de 168×240 con borde blanco y laterales más pequeñas
   * detrás (hero principal). `peek`: portadas de 182×251 todas iguales, sin
   * borde, con las vecinas asomando por los lados (hero juvenil).
   */
  coverLayout?: 'stacked' | 'peek';
}

const COVER_LAYOUTS = {
  // Central de 168×240; las laterales conservan la proporción del diseño (148/181).
  stacked: { width: 168, height: 240, sideOffset: 114, sideScale: 148 / 181, centerBorder: true },
  // 182×251 con 22 px entre portadas: las vecinas quedan cortadas por el borde de la pantalla.
  peek: { width: 182, height: 251, sideOffset: 204, sideScale: 1, centerBorder: false },
} as const;
const SWIPE_THRESHOLD = 40;
const SAVE_FLASH_MS = 1000;

/**
 * Cabecera móvil: tres portadas (la del centro más grande y con borde blanco),
 * etiqueta de tipo + vistas, título, sinopsis, géneros, botones y las barritas
 * de navegación. Cambia sola cada 6 s mientras está a la vista.
 */
export const MobileHero = ({ items, accent, label, topSpacingClass = 'pt-[90px]', coverLayout = 'stacked' }: MobileHeroProps) => {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const { isSaved, toggle: toggleSaved } = useSavedMangas();
  const { theme } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isInView, setIsInView] = useState(true);
  const [isPageVisible, setIsPageVisible] = useState(true);
  // Fondo: solo se cambia cuando la nueva portada ya está descargada, y se
  // funde sobre la anterior. Así nunca hay un hueco negro ni un salto.
  const [backdropSrc, setBackdropSrc] = useState('');
  const sectionRef = useRef<HTMLElement>(null);
  const touchStartX = useRef<number | null>(null);
  const accentHex = ACCENT_HEX[accent];
  const covers = COVER_LAYOUTS[coverLayout];
  // Sobre el color de la sección (rosa o celeste) la letra va siempre en blanco.
  const accentInkClass = 'text-white';
  const count = items.length;
  const activeItem = count > 0 ? items[currentIndex % count] : null;
  const isBookmarked = activeItem ? isSaved(activeItem.id) : false;
  // Al guardar, el botón se pinta un instante (blanco en tema oscuro, negro en
  // claro) con el check en el color opuesto; luego vuelve a su forma con "Guardado".
  const savedFill = theme === 'light' ? '#000000' : '#ffffff';
  const savedInk = theme === 'light' ? '#ffffff' : '#000000';
  const bookmarkFill = 'currentColor';
  const [flashId, setFlashId] = useState<string | null>(null);
  const flashTimer = useRef<number | null>(null);
  const isFlashing = activeItem !== null && flashId === String(activeItem.id);

  useEffect(() => () => { if (flashTimer.current !== null) window.clearTimeout(flashTimer.current); }, []);

  const handleSave = () => {
    if (!activeItem) return;
    const id = String(activeItem.id);
    if (!isBookmarked) {
      if (flashTimer.current !== null) window.clearTimeout(flashTimer.current);
      setFlashId(id);
      flashTimer.current = window.setTimeout(() => setFlashId(null), SAVE_FLASH_MS);
    }
    void toggleSaved(activeItem.id).then((outcome) => {
      // Si no llegó a guardarse (sin sesión, error), el destello no tiene sentido.
      if (outcome.status !== 'ok') setFlashId(null);
    });
  };

  const goTo = useCallback((index: number) => {
    if (count === 0) return;
    setCurrentIndex(((index % count) + count) % count);
  }, [count]);
  const next = useCallback(() => goTo(currentIndex + 1), [goTo, currentIndex]);
  const prev = useCallback(() => goTo(currentIndex - 1), [goTo, currentIndex]);

  useEffect(() => {
    setCurrentIndex((index) => (count === 0 ? 0 : Math.min(index, count - 1)));
  }, [count]);

  useEffect(() => {
    const onVisibility = () => setIsPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    const element = sectionRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setIsInView(entry.isIntersecting));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const activeCover = activeItem?.coverImage ?? '';
  useEffect(() => {
    if (!activeCover) return;
    let cancelled = false;
    void preloadImages([activeCover]).then(() => { if (!cancelled) setBackdropSrc(activeCover); });
    return () => { cancelled = true; };
  }, [activeCover]);

  useEffect(() => {
    if (isPaused || count < 2 || !isPageVisible || !isInView || prefersReducedMotion) return;
    const interval = window.setInterval(() => setCurrentIndex((index) => (index + 1) % count), 6000);
    return () => window.clearInterval(interval);
  }, [isPaused, count, isPageVisible, isInView, prefersReducedMotion]);

  const onTouchStart = (event: TouchEvent) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
    setIsPaused(true);
  };

  const onTouchEnd = (event: TouchEvent) => {
    const startX = touchStartX.current;
    touchStartX.current = null;
    setIsPaused(false);
    if (startX === null) return;
    const delta = (event.changedTouches[0]?.clientX ?? startX) - startX;
    if (Math.abs(delta) < SWIPE_THRESHOLD) return;
    if (delta < 0) next();
    else prev();
  };

  const openManga = () => {
    if (!activeItem) return;
    navigate(`/manga/${activeItem.id}`);
  };

  if (!activeItem) return null;

  const relativeIndex = (index: number) => {
    let delta = (index - currentIndex + count) % count;
    if (delta > count / 2) delta -= count;
    return delta;
  };

  return (
    <section ref={sectionRef} className={`mh-hero relative overflow-hidden mh-surface pb-14 ${topSpacingClass}`} aria-label={label}>
      {/* Fondo: portada activa bajo un velo negro. Capas absolutas de tamaño
          fijo (la imagen va como background), con fundido entre una y otra. */}
      <div aria-hidden="true" className="absolute inset-0 z-0 overflow-hidden mh-surface">
        <AnimatePresence initial={false}>
          {backdropSrc && (
            <motion.div
              key={backdropSrc}
              className="mh-hero-backdrop absolute inset-0"
              style={{ backgroundImage: `url("${backdropSrc}")` }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.5, ease: 'easeOut' }}
            />
          )}
        </AnimatePresence>
        <div className="mh-hero-scrim absolute inset-0" />
      </div>

      {/* Portadas */}
      <div
        className="relative z-10 mx-auto w-full max-w-[440px] touch-pan-y"
        style={{ height: covers.height }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onTouchCancel={() => { touchStartX.current = null; setIsPaused(false); }}
      >
        {items.map((item, index) => {
          const delta = relativeIndex(index);
          const isCenter = delta === 0;
          const isSide = Math.abs(delta) === 1;
          const visible = isCenter || isSide;
          const x = isCenter ? 0 : Math.sign(delta) * covers.sideOffset;
          return (
            <motion.button
              key={String(item.id)}
              type="button"
              tabIndex={isSide ? 0 : -1}
              aria-hidden={!visible}
              aria-label={isSide ? `Mostrar ${item.title}` : undefined}
              disabled={!isSide}
              onClick={() => { if (isSide) { setIsPaused(true); goTo(index); } }}
              className={`absolute left-1/2 top-1/2 block overflow-hidden rounded-lg mh-cover-base p-0 ${isCenter && covers.centerBorder ? 'border mh-hero-cover-border' : ''} ${isSide ? 'cursor-pointer' : 'cursor-default'}`}
              style={{ width: covers.width, height: covers.height, zIndex: isCenter ? 3 : isSide ? 2 : 1, pointerEvents: isSide ? 'auto' : 'none', translate: '-50% -50%' }}
              initial={false}
              animate={{ x, scale: isCenter ? 1 : covers.sideScale, opacity: visible ? 1 : 0 }}
              transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
            >
              <img
                src={item.coverImage}
                alt={isCenter ? `Portada del manga ${item.title}` : ''}
                decoding="async"
                fetchPriority={isCenter ? 'high' : 'low'}
                className="h-full w-full object-cover"
              />
            </motion.button>
          );
        })}
      </div>

      {/* Tipo y vistas */}
      <div className="relative z-10 mt-[46px] flex items-center justify-center gap-[9px]">
        <span className={`mh-font-montserrat flex h-6 items-center rounded-[2px] px-3 text-xs font-black uppercase leading-none ${accentInkClass}`} style={{ backgroundColor: accentHex }}>
          {activeItem.type}
        </span>
        <span className="flex h-5 min-w-[56px] items-center justify-center gap-1 rounded-[2px] border mh-border px-1.5 mh-text" aria-label={`${formatViewsEs(activeItem.views)} vistas`}>
          <EyeIcon size={16} />
          <span className="mh-font-audiowide text-[10px] leading-none tracking-tight">{formatViewsEs(activeItem.views)}</span>
        </span>
      </div>

      {/* Título: caja fija de dos líneas con el texto centrado en vertical, así
          un título corto y uno largo dejan los mismos huecos arriba y abajo.
          Cuerpo al 70% del original (30px → 21px); la caja se mantiene para no mover el resto. */}
      <div className="relative z-10 mx-auto mt-3 flex h-16 w-full max-w-[384px] items-center justify-center overflow-hidden px-3">
        <h2 className="mh-font-montserrat mh-line-clamp-2 w-full text-center text-[21px] font-black uppercase leading-[22px] mh-text">
          {activeItem.title}
        </h2>
      </div>

      {/* Sinopsis */}
      {/* Sinopsis: cinco líneas fijas de 18px, cortando con puntos suspensivos. */}
      <div className="relative z-10 mx-auto mt-[13px] w-full max-w-[368px] rounded-[5px] border mh-border mh-synopsis px-4 py-3">
        <p className="mh-font-inter mh-line-clamp-5 h-[90px] text-justify text-[13px] leading-[18px] mh-text">
          {activeItem.description}
        </p>
      </div>

      {/* Géneros */}
      <div className="relative z-10 mt-[27px] flex h-5 flex-nowrap items-center justify-center gap-2 overflow-hidden px-6">
        {activeItem.tags.map((tag, index) => (
          <span key={`${tag}-${index}`} className="mh-font-anta flex h-5 items-center border mh-border mh-surface px-[7px] text-[10px] leading-5 mh-text">
            {tag}
          </span>
        ))}
      </div>

      {/* Botones */}
      <div className="relative z-10 mt-8 flex items-center justify-center gap-[7px]">
        <button
          type="button"
          onClick={openManga}
          className={`mh-font-montserrat flex h-12 w-44 items-center justify-center gap-2 rounded-md text-sm font-extrabold uppercase transition-transform active:scale-95 ${accentInkClass}`}
          style={{ backgroundColor: accentHex }}
        >
          <OpenBookIcon size={19} /> Leer ahora
        </button>
        {/* Guardar: destello con el check en su círculo y vuelta a la forma inicial con "Guardado". */}
        <motion.button
          type="button"
          onClick={handleSave}
          aria-pressed={isBookmarked}
          whileTap={{ scale: 0.95 }}
          className="mh-font-montserrat flex h-12 w-36 items-center justify-center rounded-md border text-sm font-extrabold uppercase transition-colors duration-300"
          style={isFlashing
            ? { backgroundColor: savedFill, borderColor: savedFill, color: savedInk }
            : { backgroundColor: 'var(--mh-surface)', borderColor: 'var(--mh-border)', color: 'var(--mh-ink)' }}
        >
          <AnimatePresence initial={false} mode="wait">
            {isFlashing ? (
              <CheckMark key="check" background={savedInk} ink={savedFill} />
            ) : (
              <motion.span
                key={isBookmarked ? 'saved' : 'save'}
                className="flex items-center gap-2"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
              >
                <BookmarkIcon size={20} filled={isBookmarked} fillColor={bookmarkFill} /> {isBookmarked ? 'Guardado' : 'Guardar'}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* La fila conserva su altura al cambiar de portada para que el bloque
          de tendencias y sus filtros no suban y bajen durante la transición. */}
      {count > 1 && (
        <div className="relative z-10 mt-[46px] flex h-1.5 items-center justify-center gap-[5px]" role="tablist" aria-label="Cambiar manga destacado">
          {items.map((item, index) => {
            const active = index === currentIndex;
            return (
              <button
                key={String(item.id)}
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={`Mostrar ${item.title}`}
                onClick={() => { setIsPaused(true); goTo(index); }}
                className={`block transition-[width,background-color] duration-300 ${active ? 'h-1.5 w-12' : 'h-[5px] w-5 mh-hero-dot'}`}
                style={active ? { backgroundColor: accentHex } : undefined}
              />
            );
          })}
        </div>
      )}
    </section>
  );
};
