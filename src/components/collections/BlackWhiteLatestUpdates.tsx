import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowUpRight,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  Layers3,
  Ticket,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { useHomeData } from '../../context/HomeDataContext';
import { useTheme } from '../../hooks/useTheme';
import type { MangaCapitulo } from '../../types/manga';
import { PaginationControls } from '../common';

type Chapter = MangaCapitulo['capitulosRecientes'][number];
type BoardVariant = 'ledger' | 'gallery';

const cleanTitle = (value = '') => value
  .replace(/[-–]?\s*(Capitulo|Capítulo|Chapter|Volumen|Episodio)\s*\d+.*$/i, '')
  .trim();

const formatDate = (value = '') => {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

const latestFirst = (items: MangaCapitulo[]) => [...items]
  .filter((manga) => manga.capitulosRecientes.length > 0)
  .sort((first, second) => {
    const firstDate = new Date(first.capitulosRecientes[0]?.fecha || first.fecha || 0).getTime();
    const secondDate = new Date(second.capitulosRecientes[0]?.fecha || second.fecha || 0).getTime();
    return secondDate - firstDate;
  });

const chapterSlots = (manga: MangaCapitulo): Array<Chapter | undefined> => Array.from(
  { length: 3 },
  (_, index) => manga.capitulosRecientes[index],
);

interface ChapterRowProps {
  chapter?: Chapter;
  index: number;
  isLight: boolean;
  compact?: boolean;
}

function ChapterRow({ chapter, index, isLight, compact = false }: ChapterRowProps) {
  const rowClass = `grid min-h-[48px] grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 py-1.5 transition-colors ${
    chapter
      ? isLight ? 'hover:bg-black/[0.035]' : 'hover:bg-white/[0.045]'
      : isLight ? 'text-black/25' : 'text-white/25'
  }`;

  const content = (
    <>
      <span className="flex min-w-0 items-center gap-3">
        <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[8px] font-black ${chapter ? 'bg-[#00C2FF] text-black' : isLight ? 'bg-black/[0.06]' : 'bg-white/[0.06]'}`}>
          {String(index + 1).padStart(2, '0')}
        </span>
        <span className="min-w-0">
          <strong className={`block truncate text-[12px] font-black ${compact ? 'sm:text-[12px]' : 'sm:text-[13px]'}`}>
            {chapter ? `Capítulo ${chapter.numero}` : 'Espacio disponible'}
          </strong>
          <time className={`mt-0.5 flex items-center gap-1 text-[9px] font-semibold ${isLight ? 'text-black/45' : 'text-white/45'}`}>
            <CalendarDays size={10} /> {chapter ? formatDate(chapter.fecha) : 'Sin publicación'}
          </time>
        </span>
      </span>
      {chapter ? (
        <span className={`inline-flex h-6 items-center gap-1 rounded-full px-2 text-[8px] font-black uppercase tracking-[0.06em] ${chapter.esGratis ? 'bg-emerald-500/12 text-emerald-500' : 'bg-amber-400/15 text-amber-500'}`}>
          {chapter.esGratis ? <Ticket size={11} /> : <CircleDollarSign size={11} />}
          {chapter.esGratis ? 'Gratis' : 'Pago'}
        </span>
      ) : <span className="text-[9px] font-bold uppercase tracking-wider">Pendiente</span>}
    </>
  );

  return chapter
    ? <Link to={`/read/${chapter.id}`} className={rowClass}>{content}</Link>
    : <div className={rowClass}>{content}</div>;
}

function ChapterTicket({ chapter, index, isLight }: Omit<ChapterRowProps, 'compact'>) {
  const ticketClass = `flex min-h-[84px] min-w-0 flex-col justify-between p-2 transition-colors ${
    chapter
      ? isLight ? 'hover:bg-black/[0.045]' : 'hover:bg-white/[0.055]'
      : isLight ? 'text-black/25' : 'text-white/25'
  }`;

  const content = (
    <>
      <span className="flex items-center justify-between gap-1">
        <span className="text-[8px] font-black uppercase tracking-[0.16em]">Cap.</span>
        <span className={`grid h-6 w-6 place-items-center rounded-full text-[8px] font-black ${chapter ? 'bg-[#00C2FF] text-black' : isLight ? 'bg-black/[0.06]' : 'bg-white/[0.06]'}`}>{String(index + 1).padStart(2, '0')}</span>
      </span>
      <strong className="my-1 block truncate font-[Montserrat] text-lg font-black leading-none">{chapter?.numero || '—'}</strong>
      <time className={`flex min-w-0 items-center gap-1 text-[8px] font-semibold leading-3 ${isLight ? 'text-black/45' : 'text-white/45'}`}><CalendarDays size={10} className="shrink-0" /> <span className="truncate">{chapter ? formatDate(chapter.fecha) : 'Sin fecha'}</span></time>
      <span className={`mt-1 flex items-center gap-1 text-[8px] font-black uppercase tracking-[0.06em] ${chapter ? chapter.esGratis ? 'text-emerald-500' : 'text-amber-500' : ''}`}>
        {chapter ? chapter.esGratis ? <Ticket size={10} /> : <CircleDollarSign size={10} /> : null}
        {chapter ? chapter.esGratis ? 'Gratis' : 'Pago' : 'Pendiente'}
      </span>
    </>
  );

  return chapter
    ? <Link to={`/read/${chapter.id}`} className={ticketClass}>{content}</Link>
    : <div className={ticketClass}>{content}</div>;
}

interface BlackWhiteLatestBoardProps {
  audience: 'women' | 'men';
  sectionId: string;
  variant: BoardVariant;
}

function BlackWhiteLatestBoard({ audience, sectionId, variant }: BlackWhiteLatestBoardProps) {
  const { latestWomen, latestMen, isReady } = useHomeData();
  const { theme } = useTheme();
  const reduceMotion = useReducedMotion();
  const isLight = theme === 'light';
  const [currentPage, setCurrentPage] = useState(1);
  const source = audience === 'women' ? latestWomen : latestMen;
  const items = useMemo(() => latestFirst(source), [source]);
  const itemsPerPage = 3;
  const totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage));
  const pageItems = items.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => setCurrentPage((page) => Math.min(page, totalPages)), [totalPages]);
  if (!isReady || items.length === 0) return null;

  if (variant === 'gallery') {
    return (
      <section className={`relative overflow-hidden py-10 sm:py-12 ${isLight ? 'bg-[#edf4f6] text-[#101214]' : 'bg-[#071014] text-white'}`}>
        <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(0,194,255,.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,194,255,.1)_1px,transparent_1px)] [background-size:36px_36px]" aria-hidden="true" />
        <div id={sectionId} className="desktop-content-shell relative z-10 mx-auto w-full max-w-[1580px] scroll-mt-24 px-4 sm:px-6 lg:px-10">
          <header className="mb-6 flex flex-col justify-between gap-4 border-b-2 border-[#00C2FF] pb-4 sm:flex-row sm:items-end">
            <div>
              <p className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.3em] text-[#00A9DE]"><Clock3 size={14} /> Radar juvenil</p>
              <h2 className="mt-2 text-3xl font-black uppercase italic tracking-[-0.05em] sm:text-5xl">Nuevos en órbita</h2>
            </div>
            <p className={`max-w-sm text-xs font-semibold leading-5 sm:text-right ${isLight ? 'text-black/50' : 'text-white/50'}`}>Cada ficha conserva los tres movimientos más recientes: capítulo, fecha y tipo de acceso.</p>
          </header>

          <div className="grid gap-5 lg:grid-cols-3">
            {pageItems.map((manga, index) => {
              const displayIndex = String((currentPage - 1) * itemsPerPage + index + 1).padStart(2, '0');
              return (
                <motion.article
                  key={`${currentPage}-${manga.id}`}
                  initial={reduceMotion ? false : { opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ duration: 0.5, delay: (index % 3) * 0.07, ease: [0.22, 1, 0.36, 1] }}
                  className={`group overflow-hidden rounded-[22px] border ${isLight ? 'border-black/10 bg-white shadow-[0_18px_50px_rgba(18,48,58,0.08)]' : 'border-white/10 bg-[#0b171c] shadow-[0_18px_50px_rgba(0,0,0,0.22)]'}`}
                >
                  <Link to={`/manga/${manga.id}`} className="relative block h-36 overflow-hidden bg-black">
                    <img src={manga.portada} alt={cleanTitle(manga.titulo)} loading="lazy" className="manga-bn-interactive-cover h-full w-full object-cover object-top transition duration-500 group-hover:scale-[1.035]" />
                    <span className="absolute inset-0 bg-gradient-to-t from-black via-black/5 to-transparent" />
                    <span className="absolute left-4 top-4 rounded-full border border-white/30 bg-black/45 px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.16em] text-white backdrop-blur-md">{manga.tipo || 'Manga B&N'}</span>
                    <span className="absolute -bottom-3 right-4 font-[Montserrat] text-7xl font-black leading-none tracking-[-0.1em] text-white/90">{displayIndex}</span>
                  </Link>

                  <div className="p-4 pb-2">
                    <Link to={`/manga/${manga.id}`} className="block min-h-[38px] text-base font-black uppercase leading-[1.08] tracking-[-0.025em] transition-colors hover:text-[#00A9DE]">
                      {cleanTitle(manga.titulo)}
                    </Link>
                    <div className={`mt-3 overflow-hidden rounded-xl border divide-y ${isLight ? 'divide-black/[0.07] border-black/[0.08] bg-[#f7fafb]' : 'divide-white/[0.07] border-white/[0.08] bg-black/15'}`}>
                      {chapterSlots(manga).map((chapter, slotIndex) => <ChapterRow key={chapter?.id ?? `empty-${slotIndex}`} chapter={chapter} index={slotIndex} isLight={isLight} compact />)}
                    </div>
                  </div>

                  <Link to={`/manga/${manga.id}`} className={`mx-4 mb-3 mt-2 flex h-9 items-center justify-between border-t text-[9px] font-black uppercase tracking-[0.16em] transition-colors hover:text-[#00C2FF] ${isLight ? 'border-black/10' : 'border-white/10'}`}>
                    Abrir serie <ArrowUpRight size={15} />
                  </Link>
                </motion.article>
              );
            })}
          </div>

          <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} accent="blue" scrollTargetId={sectionId} theme={isLight ? 'light' : 'dark'} />
        </div>
      </section>
    );
  }

  return (
    <section className={`relative overflow-hidden py-10 sm:py-12 ${isLight ? 'bg-[#f5f3ee] text-black' : 'bg-[#090a0b] text-white'}`}>
      <div id={sectionId} className="desktop-content-shell relative z-10 mx-auto w-full max-w-[1580px] scroll-mt-24 px-4 sm:px-6 lg:px-10">
        <header className="mb-6 grid gap-4 border-y-2 border-current py-4 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center">
          <span className={`grid h-14 w-14 place-items-center border-2 border-current font-[Montserrat] text-xl font-black ${isLight ? 'bg-black text-white' : 'bg-white text-black'}`}>01</span>
          <div>
            <p className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.32em] text-[#00A9DE]"><Layers3 size={14} /> Mesa de novedades</p>
            <h2 className="mt-1 text-3xl font-black uppercase tracking-[-0.055em] sm:text-4xl">Registro de estrenos</h2>
          </div>
          <div className={`hidden border-l pl-6 text-right md:block ${isLight ? 'border-black/20' : 'border-white/20'}`}>
            <strong className="block font-[Montserrat] text-2xl font-black">03</strong>
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[#00A9DE]">capítulos por serie</span>
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-3">
          {pageItems.map((manga, index) => {
            const displayIndex = String((currentPage - 1) * itemsPerPage + index + 1).padStart(2, '0');
            return (
              <motion.article
                key={`${currentPage}-${manga.id}`}
                initial={reduceMotion ? false : { opacity: 0, y: 24, rotate: index % 2 === 0 ? -0.8 : 0.8 }}
                whileInView={{ opacity: 1, y: 0, rotate: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.48, delay: (index % 3) * 0.06, ease: [0.22, 1, 0.36, 1] }}
                className={`group flex min-w-0 flex-col overflow-hidden border ${isLight ? 'border-black/15 bg-white shadow-[7px_7px_0_rgba(0,0,0,0.08)]' : 'border-white/15 bg-[#101214] shadow-[7px_7px_0_rgba(0,194,255,0.07)]'}`}
              >
                <header className={`flex items-center justify-between border-b px-4 py-3 ${isLight ? 'border-black/10' : 'border-white/10'}`}>
                  <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[#00A9DE]">Expediente {displayIndex}</span>
                  <span className={`text-[8px] font-black uppercase tracking-[0.14em] ${isLight ? 'text-black/40' : 'text-white/40'}`}>{manga.tipo || 'Manga B&N'}</span>
                </header>

                <Link to={`/manga/${manga.id}`} className="relative block h-36 overflow-hidden bg-black">
                  <img src={manga.portada} alt={cleanTitle(manga.titulo)} loading="lazy" className="manga-bn-interactive-cover h-full w-full object-cover object-top grayscale transition duration-500 group-hover:scale-105" />
                  <span className="absolute inset-0 bg-gradient-to-t from-black via-black/5 to-transparent" />
                  <span className="absolute -bottom-3 right-4 font-[Montserrat] text-7xl font-black leading-none tracking-[-0.1em] text-white/90">{displayIndex}</span>
                </Link>

                <div className="flex min-h-[68px] items-center p-3.5">
                  <Link to={`/manga/${manga.id}`} className="line-clamp-2 text-lg font-black uppercase leading-[1.05] tracking-[-0.035em] transition-colors hover:text-[#00A9DE]">
                    {cleanTitle(manga.titulo)}
                  </Link>
                </div>

                <div className={`mx-4 mb-4 overflow-hidden border ${isLight ? 'border-black/12 bg-[#f7f6f2]' : 'border-white/12 bg-black/20'}`}>
                  <div className={`grid grid-cols-3 divide-x ${isLight ? 'divide-black/10' : 'divide-white/10'}`}>
                    {chapterSlots(manga).map((chapter, slotIndex) => <ChapterTicket key={chapter?.id ?? `empty-${slotIndex}`} chapter={chapter} index={slotIndex} isLight={isLight} />)}
                  </div>
                </div>

                <Link to={`/manga/${manga.id}`} className={`mt-auto flex h-10 items-center justify-between border-t px-4 text-[9px] font-black uppercase tracking-[0.16em] transition-colors hover:text-[#00A9DE] ${isLight ? 'border-black/10' : 'border-white/10'}`}>Abrir expediente <ArrowUpRight size={14} /></Link>
              </motion.article>
            );
          })}
        </div>

        <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} accent="blue" scrollTargetId={sectionId} theme={isLight ? 'light' : 'dark'} />
      </div>
      <div className="pointer-events-none absolute right-0 top-0 h-full w-1/3 bg-[radial-gradient(circle_at_top_right,rgba(0,194,255,0.08),transparent_65%)]" aria-hidden="true" />
    </section>
  );
}

export function BlackWhiteLatestEditorial() {
  return <BlackWhiteLatestBoard audience="women" sectionId="bn-latest-editorial" variant="ledger" />;
}

export function BlackWhiteYouthLatestGallery() {
  return <BlackWhiteLatestBoard audience="men" sectionId="bn-latest-youth-gallery" variant="gallery" />;
}
