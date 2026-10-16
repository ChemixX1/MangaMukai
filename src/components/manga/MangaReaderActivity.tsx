import type { ReactNode } from 'react';
import { DetailReadersIcon } from './referenceIcons';
import { MangaProgressMeter } from './MangaProgressMeter';

export const MangaReaderActivity = ({ online, likeAction, cards = false, children }: { online: number; likeAction?: ReactNode; cards?: boolean; children?: ReactNode }) => (
  <div className="manga-reader-activity">
    <div className="manga-reader-activity-head">
      <p><DetailReadersIcon size={22} />{cards ? <span className="manga-reader-stat-copy"><strong>{online}</strong><small>Lectores en línea</small></span> : <span>Lectores En Línea ({online})</span>}</p>
      {likeAction}
    </div>
    {children}
    {!cards && <MangaProgressMeter className="manga-reader-meter" percent={55} />}
  </div>
);
