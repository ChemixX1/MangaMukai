import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, CalendarDays, CircleDollarSign, Hash, Ticket } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { useHomeData } from '../../context/HomeDataContext';
import { useTheme } from '../../hooks/useTheme';
import type { MangaCapitulo } from '../../types/manga';
import { PaginationControls } from '../common';

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

interface BlackWhiteLatestBoardProps {
  audience: 'women' | 'men';
  sectionId: string;
  eyebrow: string;
}

function BlackWhiteLatestBoard({ audience, sectionId, eyebrow }: BlackWhiteLatestBoardProps) {
  const { latestWomen, latestMen, isReady } = useHomeData();
  const { theme } = useTheme();
  const reduceMotion = useReducedMotion();
  const isLight = theme === 'light';
  const [currentPage, setCurrentPage] = useState(1);
  const source = audience === 'women' ? latestWomen : latestMen;
  const items = useMemo(() => latestFirst(source), [source]);
  const itemsPerPage = 6;
  const totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage));
  const pageItems = items.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => setCurrentPage((page) => Math.min(page, totalPages)), [totalPages]);
  if (!isReady || items.length === 0) return null;

  return (
    <section className={`relative overflow-hidden py-12 sm:py-16 ${isLight ? 'bg-[#f3f4f5] text-black' : 'bg-[#050607] text-white'}`}>
      <div id={sectionId} className="desktop-content-shell relative z-10 mx-auto w-full max-w-[1580px] scroll-mt-24 px-4 sm:px-6 lg:px-10">
        <header className="mb-8 grid grid-cols-[auto_1fr] items-center gap-4 sm:gap-6">
          <span className="grid h-14 w-14 place-items-center bg-[#00C2FF] text-black sm:h-16 sm:w-16">
            <Hash className="h-7 w-7" strokeWidth={3} />
          </span>
          <div className="min-w-0 border-y border-current/20 py-3">
            <p className="text-[9px] font-black uppercase tracking-[0.32em] text-[#00C2FF]">{eyebrow}</p>
            <h2 className="mt-1 text-2xl font-black uppercase italic tracking-[-0.045em] sm:text-4xl">Últimas actualizaciones</h2>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-2">
          {pageItems.map((manga, index) => {
            const chapter = manga.capitulosRecientes[0];
            const displayIndex = String((currentPage - 1) * itemsPerPage + index + 1).padStart(2, '0');

            return (
              <motion.article
                key={`${currentPage}-${manga.id}`}
                initial={reduceMotion ? false : { opacity: 0, y: 24, rotateX: -7 }}
                whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                viewport={{ once: true, amount: 0.18 }}
                transition={{ duration: 0.5, delay: (index % 2) * 0.08, ease: [0.22, 1, 0.36, 1] }}
                whileHover={reduceMotion ? undefined : { y: -4 }}
                className={`group relative min-h-[220px] overflow-hidden border ${isLight ? 'border-black/20 bg-white' : 'border-white/20 bg-[#090b0d]'}`}
                style={{ transformPerspective: 900 }}
              >
                <span className={`pointer-events-none absolute -right-3 -top-5 font-[Montserrat] text-[108px] font-black leading-none tracking-[-0.09em] ${isLight ? 'text-black/[0.035]' : 'text-white/[0.045]'}`}>
                  {displayIndex}
                </span>

                <div className="relative z-10 grid min-h-[220px] grid-cols-[104px_minmax(0,1fr)] sm:grid-cols-[132px_minmax(0,1fr)_132px]">
                  <Link to={`/manga/${manga.id}`} className="relative m-3 overflow-hidden border border-current/25 bg-black sm:m-4">
                    <motion.img
                      src={manga.portada}
                      alt={cleanTitle(manga.titulo)}
                      loading="lazy"
                      className="h-full w-full object-cover"
                      initial={false}
                      whileHover={reduceMotion ? undefined : { scale: 1.07, rotate: 1.2 }}
                      transition={{ duration: 0.45 }}
                    />
                    <span className="absolute inset-x-0 bottom-0 bg-black/70 px-2 py-1.5 text-center text-[8px] font-black uppercase tracking-[0.18em] text-white">
                      {manga.tipo || 'Manga'}
                    </span>
                  </Link>

                  <div className="flex min-w-0 flex-col justify-center py-5 pr-4 sm:py-6">
                    <span className={`mb-3 font-[Montserrat] text-[10px] font-bold uppercase tracking-[0.22em] ${isLight ? 'text-black/40' : 'text-white/40'}`}>
                      Archivo B&amp;N · {displayIndex}
                    </span>
                    <Link to={`/manga/${manga.id}`} className="line-clamp-3 text-[16px] font-black uppercase leading-[1.08] tracking-[-0.025em] transition-colors hover:text-[#00C2FF] sm:text-[19px]">
                      {cleanTitle(manga.titulo)}
                    </Link>
                    <time className={`mt-4 flex items-center gap-1.5 text-[11px] font-bold ${isLight ? 'text-black/45' : 'text-white/50'}`}>
                      <CalendarDays size={13} /> {formatDate(chapter.fecha)}
                    </time>
                  </div>

                  <Link
                    to={`/read/${chapter.id}`}
                    className={`col-span-2 flex min-h-16 items-center justify-between gap-3 border-t px-4 py-3 transition-colors sm:col-span-1 sm:min-h-full sm:flex-col sm:items-start sm:justify-center sm:border-l sm:border-t-0 sm:px-5 ${chapter.esGratis ? 'border-[#00C2FF] bg-[#00C2FF] text-black hover:bg-white' : 'border-amber-400 bg-amber-400 text-black hover:bg-white'}`}
                    style={{ clipPath: 'polygon(12px 0, 100% 0, 100% 100%, 0 100%, 0 12px)' }}
                  >
                    <span className="text-[9px] font-black uppercase tracking-[0.2em]">Capítulo</span>
                    <strong className="font-[Montserrat] text-3xl font-black leading-none sm:text-4xl">{chapter.numero}</strong>
                    <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.12em]">
                      {chapter.esGratis ? <Ticket size={14} /> : <CircleDollarSign size={14} />}
                      {chapter.esGratis ? 'Gratis' : 'Pago'}
                    </span>
                    <ArrowUpRight className="hidden h-5 w-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1 sm:block" />
                  </Link>
                </div>
              </motion.article>
            );
          })}
        </div>

        <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} accent="blue" scrollTargetId={sectionId} theme={isLight ? 'light' : 'dark'} />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,transparent_48%,rgba(0,194,255,0.045)_48%,rgba(0,194,255,0.045)_52%,transparent_52%,transparent_100%)] bg-[length:42px_42px]" aria-hidden="true" />
    </section>
  );
}

export function BlackWhiteLatestEditorial() {
  return <BlackWhiteLatestBoard audience="women" sectionId="bn-latest-editorial" eyebrow="Archivo principal" />;
}

export function BlackWhiteYouthLatestGallery() {
  return <BlackWhiteLatestBoard audience="men" sectionId="bn-latest-youth-gallery" eyebrow="Archivo juvenil" />;
}
