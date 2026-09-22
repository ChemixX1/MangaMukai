import { Clock, Flame, Grid, LockKeyhole, LockKeyholeOpen } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import type { MangaCapitulo } from '../../types/manga';
import { PaginationControls } from '../common';
import { useChapterAccess } from '../../hooks/useChapterAccess';
import { getChaptersBySeries, type SeriesChapter } from '../../services/mangaService';
import { getStoredToken, getUnlockedChapters } from '../../services/authService';
import { whenIdle } from '../../utils/whenIdle';

interface AdultLatestUpdatesProps {
  items: MangaCapitulo[];
  isLight: boolean;
  titleAccent?: string;
  sectionId?: string;
  accent?: 'pink' | 'blue';
  /** 'neutral' pinta capítulo y fecha en negro/blanco según el tema. */
  rowTone?: 'accent' | 'neutral';
  /** Mantiene los mangas que aún no tienen capítulos (solo portada y título). */
  includeUpcoming?: boolean;
}

const ITEMS_PER_PAGE = 9;

const cleanTitle = (value = '') => value
  .replace(/[-–]?\s*(Capitulo|Capítulo|Chapter|Volumen|Episodio)\s*\d+.*$/i, '')
  .trim();

/** "AAAA-MM-DD HH:MM:SS" de WordPress no lo entiende Safari sin la "T". */
const parseDate = (value = '') => {
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(value) ? value.replace(' ', 'T') : value;
  const date = new Date(normalized);
  return value && !Number.isNaN(date.getTime()) ? date : null;
};

/** Vacío cuando no hay fecha: la fila se pinta sin ella en vez de decir "Sin fecha". */
const relativeDate = (value = '') => {
  const date = parseDate(value);
  if (!date) return '';

  const elapsed = Math.max(0, Date.now() - date.getTime());
  const hours = Math.max(1, Math.floor(elapsed / 3_600_000));
  if (hours < 24) return `hace ${hours} h`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `hace ${days} d`;

  const months = Math.floor(days / 30);
  if (days < 365) return `hace ${months} ${months === 1 ? 'mes' : 'meses'}`;

  const years = Math.floor(days / 365);
  return `hace ${years} ${years === 1 ? 'año' : 'años'}`;
};

/**
 * Los listados marcan las series sin capítulos con un capítulo vacío
 * (`numero: '-'`, id 0); no cuenta como publicado.
 */
const isPublishedChapter = (chapter: { id: number | string; numero: string }) =>
  Number(chapter.numero) > 0 && Number(chapter.id) > 0;

const hasPublishedChapters = (manga: MangaCapitulo) => manga.capitulosRecientes.some(isPublishedChapter);

/** Alta de la serie (la subida de la portada), sin mirar capítulos. */
const seriesDateOf = (manga: MangaCapitulo) => manga.rawFecha || manga.publishedAt || '';

/**
 * Fecha real de la ficha: el capítulo más nuevo o, sin capítulos, el alta de
 * la serie. `fecha` ya llega formateada ("04 sept") y no sirve para calcular.
 */
const latestDateOf = (manga: MangaCapitulo) =>
  manga.capitulosRecientes[0]?.fecha || seriesDateOf(manga);

export function AdultLatestUpdates({
  items,
  isLight,
  titleAccent = 'actualizaciones',
  sectionId = 'adult-latest-updates',
  accent = 'pink',
  rowTone = 'accent',
  includeUpcoming = false,
}: AdultLatestUpdatesProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const { openChapter, chapterAccessModal } = useChapterAccess();
  // Caben unos 4 capítulos en móvil y 5 en escritorio sin desbordar la tarjeta.
  const [visibleChapters, setVisibleChapters] = useState(5);

  // El endpoint de novedades solo trae 2 capítulos por ficha; para llenar la
  // tarjeta se pide la lista completa de cada serie visible, una sola vez.
  const [seriesChapters, setSeriesChapters] = useState<Record<string, SeriesChapter[]>>({});
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(() => new Set());
  // Series ya pedidas, para no repetir la consulta al cambiar de página.
  const requestedSeries = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!getStoredToken()) return;
    let active = true;
    void getUnlockedChapters()
      .then((ids) => { if (active) setUnlockedIds(ids); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const wide = window.matchMedia('(min-width: 640px)');
    const sync = () => setVisibleChapters(wide.matches ? 5 : 4);
    sync();
    wide.addEventListener('change', sync);
    return () => wide.removeEventListener('change', sync);
  }, []);
  const latestItems = useMemo(() => [...items]
    .filter((manga) => includeUpcoming || hasPublishedChapters(manga))
    .sort((first, second) => {
      const firstDate = parseDate(latestDateOf(first))?.getTime() ?? 0;
      const secondDate = parseDate(latestDateOf(second))?.getTime() ?? 0;
      return secondDate - firstDate;
    }), [items, includeUpcoming]);
  const totalPages = Math.max(1, Math.ceil(latestItems.length / ITEMS_PER_PAGE));
  const pageItems = latestItems.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const accentClasses = accent === 'blue' ? {
    border: 'border-[#00C2FF]',
    text: 'text-[#00C2FF]',
    background: 'bg-[#00C2FF]',
    hoverBorder: 'hover:border-[#00C2FF]',
  } : {
    border: 'border-[#FF4D88]',
    text: 'text-[#FF4D88]',
    background: 'bg-[#FF4D88]',
    hoverBorder: 'hover:border-[#FF4D88]',
  };

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const visibleSeriesIds = pageItems
    .filter((manga) => includeUpcoming || hasPublishedChapters(manga))
    .map((manga) => String(manga.eroSeri || manga.id));
  const visibleSeriesKey = visibleSeriesIds.join(',');

  /* Las tarjetas ya se pintan con los capítulos que trae el listado; completarlas
     es una mejora. La página monta dos de estas secciones a la vez, así que las
     peticiones esperan a que el navegador quede libre en lugar de salir todas
     de golpe compitiendo con las portadas. */
  useEffect(() => {
    const ids = visibleSeriesKey ? visibleSeriesKey.split(',') : [];
    if (ids.length === 0) return;

    const alreadyRequested = requestedSeries.current;
    const missing = ids.filter((id) => !alreadyRequested.has(id));
    if (missing.length === 0) return;
    missing.forEach((id) => alreadyRequested.add(id));

    let active = true;
    let started = false;
    const cancelIdle = whenIdle(() => {
      started = true;
      void Promise.all(missing.map(async (id) => [id, await getChaptersBySeries(id).catch(() => [])] as const))
        .then((entries) => {
          if (active) setSeriesChapters((previous) => ({ ...previous, ...Object.fromEntries(entries) }));
        });
    });

    return () => {
      active = false;
      cancelIdle();
      // Cambiar de página antes de que el hueco llegue cancela la tarea: estas
      // series vuelven a estar pendientes para cuando se muestren otra vez.
      if (!started) missing.forEach((id) => alreadyRequested.delete(id));
    };
  }, [visibleSeriesKey]);

  if (latestItems.length === 0) return null;

  return (
    <section className={`relative py-12 sm:py-16 ${isLight ? 'bg-[#f5f6f8]' : 'bg-black'}`}>
      <div id={sectionId} className="desktop-content-shell mx-auto w-full max-w-[1600px] scroll-mt-24 px-4 sm:px-5 lg:px-8">
        <div className="mb-7 flex items-end justify-between gap-4">
          <div className={`flex items-center gap-3 border-l-4 pl-4 ${accentClasses.border}`}>
            <Clock className={`h-7 w-7 sm:h-8 sm:w-8 ${accentClasses.text}`} strokeWidth={3} />
            <h2 className={`text-xl font-black uppercase italic tracking-tighter sm:text-3xl lg:text-4xl ${isLight ? 'text-slate-950' : 'text-white'}`}>
              Últimas <span className={accentClasses.text}>{titleAccent}</span>
            </h2>
          </div>
          <Link to="/biblioteca" className={`hidden items-center gap-2 rounded-[7px] border px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.12em] transition sm:flex ${accentClasses.hoverBorder} ${isLight ? 'border-black/15 bg-white text-black' : 'border-white/15 bg-black text-white'}`}>
            <Grid size={16} /> Ver todo
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pageItems.map((manga) => {
            const fullList = seriesChapters[String(manga.eroSeri || manga.id)];
            // Solo capítulos publicados: el marcador "-" del listado no genera fila.
            const chapters = (fullList && fullList.length > 0
              ? [...fullList]
                  .sort((first, second) => second.chapter_number - first.chapter_number)
                  .map((chapter) => ({
                    id: chapter.id,
                    numero: String(chapter.chapter_number),
                    esGratis: !chapter.is_paid,
                    fecha: chapter.created_at,
                  }))
              : manga.capitulosRecientes)
              .filter(isPublishedChapter)
              .slice(0, visibleChapters);
            return (
              <article key={manga.id} className={`group flex min-h-[250px] overflow-hidden rounded-[12px] border transition-transform duration-300 hover:-translate-y-1 sm:min-h-[285px] ${isLight ? 'border-black/25 bg-white text-slate-950' : 'border-white/20 bg-black text-white'}`}>
                <Link to={`/manga/${manga.id}`} className="relative w-[43%] shrink-0 overflow-hidden sm:w-[45%]">
                  <img src={manga.portada} alt={`Portada del manga ${cleanTitle(manga.titulo)}`} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <span className={`absolute bottom-3 left-3 grid h-8 w-8 place-items-center rounded-full text-white ${accentClasses.background}`}>
                    <Flame size={16} fill="currentColor" />
                  </span>
                </Link>

                <div className="flex min-w-0 flex-1 flex-col px-4 py-4 sm:px-5 sm:py-5">
                  <Link to={`/manga/${manga.id}`} className="mb-3">
                    <h3 className="line-clamp-3 text-[17px] font-black leading-[1.15] sm:text-[20px]">
                      {cleanTitle(manga.titulo)}
                    </h3>
                  </Link>

                  {/* Mini tabla: una línea encima y otra debajo de cada fila, sin
                      laterales. Empieza justo debajo del título. */}
                  {/* Sin capítulos publicados se pinta una fila "Capítulo -" con
                      el alta de la ficha para que la tarjeta no quede vacía; en
                      cuanto llega el primer capítulo la sustituyen las filas
                      reales. */}
                  <div className="divide-y divide-current/20 border-y border-current/25">
                    {chapters.length === 0 && (
                      <Link
                        to={`/manga/${manga.id}`}
                        className={`-mx-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-[4px] px-2 py-2.5 font-[Montserrat] font-normal transition-colors ${
                          isLight ? 'text-black/45 hover:bg-black/[0.06]' : 'text-white/45 hover:bg-white/[0.07]'
                        }`}
                      >
                        <span className="truncate text-[13px] sm:text-[14px]">Capítulo -</span>
                        <time className="shrink-0 whitespace-nowrap text-[11px] sm:text-[12px]">
                          {relativeDate(seriesDateOf(manga))}
                        </time>
                      </Link>
                    )}
                    {chapters.map((chapter, index) => (
                      <Link
                        key={chapter.id}
                        to={`/read/${chapter.id}`}
                        onClick={(event) => {
                          if (chapter.esGratis) {
                            return;
                          }
                          event.preventDefault();
                          void openChapter({
                            chapterId: chapter.id,
                            seriesId: manga.eroSeri || manga.id,
                            isFree: chapter.esGratis,
                            chapterNumber: chapter.numero,
                          });
                        }}
                        className={`-mx-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-[4px] px-2 py-2.5 font-[Montserrat] font-normal transition-colors ${isLight ? 'hover:bg-black/[0.06]' : 'hover:bg-white/[0.07]'} ${
                          rowTone === 'neutral'
                            ? (isLight ? 'text-black' : 'text-white')
                            : index === 0
                              ? `font-bold ${accentClasses.text}`
                              : isLight ? 'text-black/45' : 'text-white/45'
                        }`}
                      >
                        {/* Los capítulos de pago van en dorado, texto y candado. */}
                        <span className={`flex min-w-0 items-center gap-1.5 ${chapter.esGratis ? '' : isLight ? 'text-[#B8860B]' : 'text-[#F0B429]'}`}>
                          {/* Una sola línea aunque el número llegue a tres cifras. */}
                          <span className="truncate text-[13px] sm:text-[14px]">Capítulo {chapter.numero}</span>
                          {!chapter.esGratis && (unlockedIds.has(String(chapter.id))
                            ? <LockKeyholeOpen className="h-3.5 w-3.5 shrink-0" />
                            : <LockKeyhole className="h-3.5 w-3.5 shrink-0" />)}
                        </span>
                        <time className="shrink-0 whitespace-nowrap text-[11px] sm:text-[12px]">{relativeDate(chapter.fecha)}</time>
                      </Link>
                    ))}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        {chapterAccessModal}
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          accent={accent}
          scrollTargetId={sectionId}
          theme={isLight ? 'light' : 'dark'}
        />
      </div>
    </section>
  );
}
