import { DetailReadersIcon } from './referenceIcons';
import { MangaProgressMeter } from './MangaProgressMeter';

export const MangaReaderActivity = ({ online }: { online: number }) => (
  <div className="manga-reader-activity">
    <p><DetailReadersIcon size={22} /><span>Lectores En Línea ({online})</span></p>
    <MangaProgressMeter className="manga-reader-meter" percent={55} />
  </div>
);
