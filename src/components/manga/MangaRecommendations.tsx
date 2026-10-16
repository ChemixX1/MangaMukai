import { useRef, useState } from 'react';
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
  const [manual, setManual] = useState(false);
  const drag = useRef<{ id: number; y: number; scrollTop: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const takeControl = (list: HTMLDivElement) => {
    if (list.dataset.manual === 'true') return;
    const track = list.querySelector<HTMLElement>('.manga-recommendations-track');
    const transform = track ? getComputedStyle(track).transform : 'none';
    const offset = transform === 'none' ? 0 : -new DOMMatrixReadOnly(transform).m42;
    list.dataset.manual = 'true';
    setManual(true);
    list.scrollTop += offset;
  };
  const visible = items.filter(item => String(item.id) !== String(currentId)).slice(0, 5);
  const carousel = !loading && visible.length > 2;
  const renderRecommendation = (manga: RecommendationManga, duplicate = false) => (
    <Link key={manga.id} to={'/manga/' + manga.id} draggable={false} tabIndex={duplicate ? -1 : undefined} className="manga-recommendation">
      <img src={manga.portada} alt={toTitleCase(manga.titulo)} draggable={false} loading="eager" decoding="async" width={86} height={114} />
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
    >
      <div className="manga-recommendations-heading">
        <h2>{title === 'Series similares' ? <>SERIES <span>SIMILARES</span></> : title}</h2>
      </div>
      <div className={`manga-recommendations-list ${carousel ? 'is-carousel' : ''}`} data-manual={manual}
        onFocusCapture={event => takeControl(event.currentTarget)}
        onWheel={event => takeControl(event.currentTarget)}
        onPointerDown={event => {
          if (event.button !== 0) return;
          takeControl(event.currentTarget);
          suppressClick.current = false;
          // Touch keeps native scrolling and momentum; mouse/pen use dragging.
          if (event.pointerType === 'touch') return;
          drag.current = { id: event.pointerId, y: event.clientY, scrollTop: event.currentTarget.scrollTop, moved: false };
        }}
        onPointerMove={event => {
          const gesture = drag.current;
          if (!gesture || gesture.id !== event.pointerId) return;
          const distance = event.clientY - gesture.y;
          if (!gesture.moved && Math.abs(distance) < 5) return;
          if (!gesture.moved) {
            gesture.moved = true;
            suppressClick.current = true;
            event.currentTarget.setPointerCapture(event.pointerId);
            event.currentTarget.dataset.dragging = 'true';
          }
          event.preventDefault();
          event.currentTarget.scrollTop = gesture.scrollTop - distance;
        }}
        onPointerUp={event => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
          drag.current = null;
          delete event.currentTarget.dataset.dragging;
        }}
        onPointerCancel={event => { drag.current = null; delete event.currentTarget.dataset.dragging; }}
        onLostPointerCapture={event => { drag.current = null; delete event.currentTarget.dataset.dragging; }}
        onPointerLeave={() => { if (!drag.current?.moved) drag.current = null; }}
        onClickCapture={event => {
          if (suppressClick.current && event.detail !== 0) {
            event.preventDefault();
            event.stopPropagation();
            suppressClick.current = false;
          }
        }}
      >
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
