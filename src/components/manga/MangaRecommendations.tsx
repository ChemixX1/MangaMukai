import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DetailStarIcon } from './referenceIcons';
import { toTitleCase } from '../../utils/titleCase';

export interface RecommendationManga {
  id: number | string;
  titulo: string;
  portada: string;
  chapterCount?: number;
}

export const MangaRecommendations = ({ items, currentId, title = 'Series similares', loading = false, className = '' }: {
  items: RecommendationManga[];
  currentId?: number | string;
  title?: string;
  loading?: boolean;
  className?: string;
  listClassName?: string;
}) => {
  const [paused, setPaused] = useState(false);
  const visible = items.filter(item => String(item.id) !== String(currentId)).slice(0, 5);
  const carousel = !loading && visible.length > 2;
  const renderRecommendation = (manga: RecommendationManga, duplicate = false) => (
    <Link key={manga.id} to={'/manga/' + manga.id} tabIndex={duplicate ? -1 : undefined} className="manga-recommendation">
      <img src={manga.portada} alt={toTitleCase(manga.titulo)} loading="lazy" decoding="async" />
      <span className="manga-recommendation-info">
        <span className="manga-recommendation-title">{toTitleCase(manga.titulo)}</span>
        <span className="manga-recommendation-stats">
          <span className="manga-recommendation-rating"><DetailStarIcon size={22} />10</span>
          <span>{manga.chapterCount ?? '—'} Cap</span>
        </span>
      </span>
    </Link>
  );
  if (!loading && !visible.length) return null;
  return (
    <section aria-label={loading ? 'Cargando series similares' : title} aria-busy={loading} className={'manga-recommendations ' + className}
      onPointerDown={event => { if (event.pointerType !== 'mouse') setPaused(true); }}
      onPointerUp={() => setPaused(false)}
      onPointerCancel={() => setPaused(false)}
      onPointerLeave={() => setPaused(false)}
    >
      <div className="manga-recommendations-heading">
        <h2>{title === 'Series similares' ? <>SERIES <span>SIMILARES</span></> : title}</h2>
      </div>
      <div className={`manga-recommendations-list ${carousel ? 'is-carousel' : ''}`} data-paused={paused}>
        {loading ? Array.from({ length: 5 }, (_, i) => <div key={i} aria-hidden="true" className="manga-recommendation-skeleton animate-pulse motion-reduce:animate-none" />) : (
          <div className="manga-recommendations-track">
            <div>{visible.map(manga => renderRecommendation(manga))}</div>
            {carousel && <div className="manga-recommendations-copy" aria-hidden="true">{visible.map(manga => renderRecommendation(manga, true))}</div>}
          </div>
        )}
      </div>
    </section>
  );
};
