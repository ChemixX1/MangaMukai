import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bookmark, Play, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useHomeData } from '../../context/HomeDataContext';
import { useTheme } from '../../hooks/useTheme';
import type { MangaCapitulo } from '../../types/manga';

const blackWhitePattern = /b\/?n|blanco|negro|shounen|seinen|acci[oó]n|manga juvenil/i;

const cleanTitle = (value = '') => value
  .replace(/[-–]?\s*(Capitulo|Capítulo|Chapter|Volumen|Episodio)\s*\d+.*$/i, '')
  .trim();

const cleanDescription = (title: string, value = '') => {
  const normalizedTitle = title.trim().toLocaleLowerCase('es');
  const normalizedValue = value.trim();
  if (normalizedValue.toLocaleLowerCase('es').startsWith(normalizedTitle)) {
    return normalizedValue.slice(title.trim().length).trim();
  }
  return normalizedValue;
};

const uniqueBySeries = (items: MangaCapitulo[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = String(item.eroSeri || item.id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const belongsToBlackWhite = (manga: MangaCapitulo) => blackWhitePattern.test([
  manga.tipo,
  manga.genero,
  ...(manga.genres || []),
].filter(Boolean).join(' '));

const formatAge = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value.includes(' ') ? value.replace(' ', 'T') : value);
  if (Number.isNaN(date.getTime())) return '—';
  const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));
  if (days === 0) return 'HOY';
  if (days >= 365) return `${Math.floor(days / 365)}a`;
  return `${days}d`;
};

const getRating = (manga: MangaCapitulo) => {
  const seed = String(manga.id).split('').reduce((total, character) => total + character.charCodeAt(0), 0);
  return `9.${seed % 8}`;
};

export function BlackWhiteHero() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const {
    popularHistorical,
    popularMenHistorical,
    latestWomen,
    latestMen,
    newReleases,
    isReady,
  } = useHomeData();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const isLightMode = theme === 'light';

  const items = useMemo(() => {
    const allMangas = uniqueBySeries([
      ...popularHistorical,
      ...latestWomen,
      ...popularMenHistorical,
      ...latestMen,
      ...newReleases,
    ]);
    const blackWhiteMangas = allMangas.filter(belongsToBlackWhite);
    return uniqueBySeries([...blackWhiteMangas, ...allMangas]).slice(0, 9);
  }, [latestMen, latestWomen, newReleases, popularHistorical, popularMenHistorical]);

  const nextSlide = useCallback(() => {
    if (items.length > 1) setActiveIndex((current) => (current + 1) % items.length);
  }, [items.length]);

  useEffect(() => {
    if (isPaused || items.length < 2) return;
    const timer = window.setInterval(nextSlide, 6500);
    return () => window.clearInterval(timer);
  }, [isPaused, items.length, nextSlide]);

  useEffect(() => {
    if (activeIndex >= items.length) setActiveIndex(0);
  }, [activeIndex, items.length]);

  const active = items[activeIndex];
  const thumbnails = items.length > 1
    ? Array.from({ length: Math.min(4, items.length - 1) }, (_, offset) => ({
        item: items[(activeIndex + offset + 1) % items.length],
        index: (activeIndex + offset + 1) % items.length,
      }))
    : [];
  const title = cleanTitle(active?.titulo || 'Mangas en blanco y negro');
  const description = cleanDescription(title, active?.descripcion)
    || 'Historias clásicas, acción y tinta pura en una colección pensada para lectores de manga tradicional.';
  const genres = (active?.genres?.length ? active.genres : [active?.tipo || 'Manga']).slice(0, 2);
  const latestChapter = active?.capitulosRecientes?.[0]?.numero;

  return (
    <section
      className={`bn-hero relative min-h-[1050px] w-full overflow-hidden transition-colors duration-700 lg:h-[690px] lg:min-h-0 ${isLightMode ? 'bg-[#f5f6f8] text-black' : 'bg-[#101010] text-white'}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      aria-label="Mangas en blanco y negro destacados"
    >
      <div className={`home-theme-backdrop-base absolute inset-0 ${isLightMode ? 'bg-[#f5f6f8]' : 'bg-[#101010]'}`} aria-hidden="true">
        <AnimatePresence initial={false} mode="popLayout">
          {active?.portada && (
            <motion.div key={active.id} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.9 }}>
              <img src={active.portada} alt="" className={`h-full w-full scale-110 object-cover grayscale blur-[3px] transition-[filter] duration-700 ${isLightMode ? 'brightness-[0.9] contrast-[0.96]' : 'brightness-[0.3] contrast-[1.12]'}`} />
              <div className="home-hero-theme-scrim absolute inset-0" />
              <div className={`absolute inset-0 bg-gradient-to-r transition-colors duration-700 ${isLightMode ? 'from-white/95 via-white/72 to-white/35' : 'from-black/95 via-black/72 to-black/35'}`} />
              <div className={`absolute inset-0 bg-gradient-to-t ${isLightMode ? 'from-[#f5f6f8]/90 via-transparent to-white/15' : 'from-[#101010]/90 via-transparent to-black/15'}`} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="desktop-content-shell relative z-10 mx-auto grid h-full w-full max-w-[1440px] grid-cols-1 gap-8 px-5 pb-20 pt-28 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(540px,.92fr)] lg:items-center lg:gap-12 lg:px-12 lg:pb-12 lg:pt-24 xl:gap-16 xl:px-16">
        <div className="order-2 flex min-w-0 flex-col items-center lg:order-1 lg:items-start">
          {!isReady || !active ? (
            <div className="flex w-full max-w-[650px] animate-pulse flex-col gap-6">
              <div className={`h-6 w-72 ${isLightMode ? 'bg-black/10' : 'bg-white/10'}`} />
              <div className={`h-24 w-full ${isLightMode ? 'bg-black/10' : 'bg-white/10'}`} />
              <div className={`h-32 w-full ${isLightMode ? 'bg-black/10' : 'bg-white/10'}`} />
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div key={active.id} className="w-full max-w-[660px]" initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 18 }} transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}>
                <div className="mb-4 flex flex-wrap items-center justify-center gap-1.5 lg:justify-start">
                  <span className={`border px-2 py-1 text-[8px] font-black uppercase tracking-[0.14em] ${isLightMode ? 'border-black bg-black text-white' : 'border-white bg-white text-black'}`}>Manga B&N</span>
                  {genres.map((genre) => (
                    <span key={genre} className={`border px-2 py-1 text-[8px] font-black uppercase tracking-[0.12em] ${isLightMode ? 'border-black/25 bg-white/25 text-black' : 'border-white/25 bg-black/25 text-white'}`}>{genre}</span>
                  ))}
                </div>

                <h1 className="mb-6 line-clamp-3 text-center text-[clamp(1.55rem,3vw,3rem)] font-black uppercase italic leading-[0.98] tracking-[-0.045em] lg:text-left">
                  {title}
                </h1>

                <div className={`mb-8 flex min-h-[138px] w-full items-center border-l-[4px] px-6 py-5 backdrop-blur-md ${isLightMode ? 'border-black bg-white/55' : 'border-white bg-black/35'}`}>
                  <p className={`line-clamp-4 text-justify text-[14px] font-medium leading-7 sm:text-[15px] ${isLightMode ? 'text-black/72' : 'text-white/82'}`}>{description}</p>
                </div>

                <div className="mb-8 grid max-w-[360px] grid-cols-3 gap-6 text-left">
                  <div>
                    <span className={`block text-[9px] font-black uppercase tracking-[0.18em] ${isLightMode ? 'text-black/60' : 'text-white/55'}`}>Rating</span>
                    <strong className="mt-1 flex items-center gap-2 text-[21px] font-black tracking-tight">{getRating(active)} <Zap size={18} fill="currentColor" /></strong>
                  </div>
                  <div>
                    <span className={`block text-[9px] font-black uppercase tracking-[0.18em] ${isLightMode ? 'text-black/60' : 'text-white/55'}`}>Capítulos</span>
                    <strong className="mt-1 block text-[21px] font-black tracking-tight">CH {latestChapter || '—'}</strong>
                  </div>
                  <div>
                    <span className={`block text-[9px] font-black uppercase tracking-[0.18em] ${isLightMode ? 'text-black/60' : 'text-white/55'}`}>Estado</span>
                    <strong className="mt-1 block text-[21px] font-black tracking-tight">{formatAge(active.rawFecha || active.fecha)}</strong>
                  </div>
                </div>

                <div className="flex flex-wrap justify-center gap-4 lg:justify-start">
                  <button type="button" onClick={() => navigate(`/manga/${active.id}`)} className="h-[52px] -skew-x-[11deg] bg-white px-8 text-black transition hover:bg-[#00C2FF] active:scale-95">
                    <span className="flex skew-x-[11deg] items-center gap-3 text-[12px] font-black uppercase tracking-[0.13em]">Leer ahora <Play size={16} fill="currentColor" /></span>
                  </button>
                  <button type="button" onClick={() => setIsBookmarked((current) => !current)} className={`h-[52px] -skew-x-[11deg] border-2 px-8 transition active:scale-95 ${isBookmarked ? 'border-[#00C2FF] bg-[#00C2FF] text-black' : isLightMode ? 'border-black/30 bg-white/65 text-black hover:border-black' : 'border-white/30 bg-white/90 text-[#111827] hover:border-white'}`}>
                    <span className="flex skew-x-[11deg] items-center gap-3 text-[12px] font-black uppercase tracking-[0.13em]"><Bookmark size={16} fill={isBookmarked ? 'currentColor' : 'none'} />{isBookmarked ? 'Guardado' : 'Guardar'}</span>
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        <div className="order-1 flex h-[375px] min-w-0 items-center justify-center gap-2 sm:h-[420px] sm:gap-3 lg:order-2 lg:h-[540px] lg:justify-end lg:gap-4">
          {!isReady || !active ? (
            <div className={`h-[360px] w-[270px] animate-pulse rounded-[18px] ${isLightMode ? 'bg-black/10' : 'bg-white/10'}`} />
          ) : (
            <>
              <AnimatePresence mode="wait">
                <motion.article key={active.id} className={`relative h-[340px] w-[238px] shrink-0 overflow-hidden rounded-[18px] border shadow-[0_24px_70px_rgba(0,0,0,0.38)] sm:h-[390px] sm:w-[300px] lg:h-[500px] lg:w-[360px] xl:w-[400px] ${isLightMode ? 'border-black/15 bg-white' : 'border-white/15 bg-black'}`} initial={{ opacity: 0, scale: 0.96, x: 16 }} animate={{ opacity: 1, scale: 1, x: 0 }} exit={{ opacity: 0, scale: 0.97, x: -14 }} transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}>
                  <img src={active.portada} alt={title} className="manga-bn-interactive-cover h-full w-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 h-[34%] bg-gradient-to-t from-black via-black/45 to-transparent" />
                  <span className="absolute left-4 top-4 rounded-full bg-white/80 px-4 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-black backdrop-blur-md">Destacado</span>
                  <div className="absolute bottom-4 left-4 flex max-w-[calc(100%-2rem)] flex-wrap gap-2">
                    {genres.map((genre) => <span key={genre} className="bg-black/75 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-white backdrop-blur-sm">{genre}</span>)}
                  </div>
                </motion.article>
              </AnimatePresence>

              <div className="flex h-[340px] w-[66px] shrink-0 flex-col justify-between sm:h-[390px] sm:w-[96px] lg:h-[500px] lg:w-[125px] xl:w-[145px]">
                {thumbnails.map(({ item, index }) => (
                  <button key={item.id} type="button" onClick={() => setActiveIndex(index)} aria-label={`Mostrar ${cleanTitle(item.titulo)}`} className="group relative h-[78px] w-full overflow-hidden rounded-[11px] border border-white/30 bg-black transition hover:-translate-y-0.5 hover:border-white sm:h-[90px] sm:rounded-[14px] lg:h-[112px] lg:rounded-[16px]">
                    <img src={item.portada} alt={cleanTitle(item.titulo)} className="manga-bn-interactive-cover h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                    <span className="absolute inset-x-0 bottom-0 h-[3px] bg-[#FF4D88]" />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
