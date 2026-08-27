import { Clock, Flame, Grid, LockKeyhole } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import type { MangaCapitulo } from '../../types/manga';
import { PaginationControls } from '../common';

interface AdultLatestUpdatesProps {
  items: MangaCapitulo[];
  isLight: boolean;
  titleAccent?: string;
  sectionId?: string;
  accent?: 'pink' | 'blue';
}

const ITEMS_PER_PAGE = 9;

const cleanTitle = (value = '') => value
  .replace(/[-–]?\s*(Capitulo|Capítulo|Chapter|Volumen|Episodio)\s*\d+.*$/i, '')
  .trim();

const relativeDate = (value = '') => {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return 'Sin fecha';

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

export function AdultLatestUpdates({
  items,
  isLight,
  titleAccent = 'actualizaciones',
  sectionId = 'adult-latest-updates',
  accent = 'pink',
}: AdultLatestUpdatesProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const latestItems = useMemo(() => [...items]
    .filter((manga) => manga.capitulosRecientes.length > 0)
    .sort((first, second) => {
      const firstDate = new Date(first.capitulosRecientes[0]?.fecha || first.fecha || 0).getTime();
      const secondDate = new Date(second.capitulosRecientes[0]?.fecha || second.fecha || 0).getTime();
      return secondDate - firstDate;
    }), [items]);
  const totalPages = Math.max(1, Math.ceil(latestItems.length / ITEMS_PER_PAGE));
  const pageItems = latestItems.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const accentClasses = accent === 'blue' ? {
    border: 'border-[#00C2FF]',
    text: 'text-[#00C2FF]',
    background: 'bg-[#00C2FF]',
    hoverBorder: 'hover:border-[#00C2FF]',
    hoverText: 'group-hover:text-[#00C2FF]',
    rowHover: 'hover:text-[#00C2FF]',
  } : {
    border: 'border-[#FF4D88]',
    text: 'text-[#FF4D88]',
    background: 'bg-[#FF4D88]',
    hoverBorder: 'hover:border-[#FF4D88]',
    hoverText: 'group-hover:text-[#FF4D88]',
    rowHover: 'hover:text-[#FF4D88]',
  };

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

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
            const chapters = manga.capitulosRecientes.slice(0, 3);
            return (
              <article key={manga.id} className={`group flex min-h-[250px] overflow-hidden rounded-[12px] border transition-transform duration-300 hover:-translate-y-1 sm:min-h-[285px] ${isLight ? 'border-black/10 bg-white text-slate-950' : 'border-white/10 bg-black text-white'}`}>
                <Link to={`/manga/${manga.id}`} className="relative w-[43%] shrink-0 overflow-hidden sm:w-[45%]">
                  <img src={manga.portada} alt={cleanTitle(manga.titulo)} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <span className={`absolute bottom-3 left-3 grid h-8 w-8 place-items-center rounded-full text-white ${accentClasses.background}`}>
                    <Flame size={16} fill="currentColor" />
                  </span>
                </Link>

                <div className="flex min-w-0 flex-1 flex-col px-4 py-4 sm:px-5 sm:py-5">
                  <Link to={`/manga/${manga.id}`} className="mb-4">
                    <h3 className={`line-clamp-3 text-[17px] font-black leading-tight transition-colors sm:text-[20px] ${accentClasses.hoverText}`}>
                      {cleanTitle(manga.titulo)}
                    </h3>
                  </Link>

                  <div className="mt-auto divide-y divide-current/15 border-t border-current/25">
                    {chapters.map((chapter, index) => (
                      <Link key={chapter.id} to={`/read/${chapter.id}`} className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 py-3 text-[13px] transition-colors sm:text-[14px] ${accentClasses.rowHover} ${index === 0 ? `font-bold ${accentClasses.text}` : isLight ? 'text-black/45' : 'text-white/45'}`}>
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span className="truncate">Capítulo {chapter.numero}</span>
                          {!chapter.esGratis && <LockKeyhole className="h-3.5 w-3.5 shrink-0" />}
                        </span>
                        <time className="whitespace-nowrap text-[11px] sm:text-[12px]">{relativeDate(chapter.fecha)}</time>
                      </Link>
                    ))}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
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
