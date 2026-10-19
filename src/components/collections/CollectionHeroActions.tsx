import { HomeReadIcon, HomeSaveIcon } from '../home/HomeIcons';

interface Props {
  saved: boolean;
  onRead: () => void;
  onSave: () => void;
}

export function CollectionHeroActions({ saved, onRead, onSave }: Props) {
  return <div className="collection-hero-actions">
    <button type="button" className="collection-hero-action collection-hero-action--read" onClick={onRead}>
      <HomeReadIcon className="size-5" />Leer ahora
    </button>
    <button type="button" className="collection-hero-action collection-hero-action--save" aria-pressed={saved} onClick={onSave}>
      <HomeSaveIcon className="size-5" />{saved ? 'Guardado' : 'Guardar'}
    </button>
  </div>;
}
