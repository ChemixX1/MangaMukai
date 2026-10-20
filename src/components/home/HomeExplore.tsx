import { Link } from 'react-router-dom';
import { useHomeData } from '../../context/HomeDataContext';
import { mostViewedMangas } from '../../utils/mostViewedMangas';

export function HomeExplore() {
  const { popularHistorical, popularMenHistorical, loaded } = useHomeData();
  const top = loaded.popularHistorical && loaded.popularMenHistorical
    ? mostViewedMangas([...popularHistorical, ...popularMenHistorical])
    : [];
  const links = [
    { to: '/#tendencia-ahora', title: 'Tendencia Ahora' },
    { to: '/#mangas-juveniles', title: 'Mangas Juveniles' },
    { to: '/manga-bn', title: 'Mangas Blanco & Negro' },
    { to: '/manga-19', title: 'Mangas para adultos' },
    ...top.map(manga => ({ to: `/manga/${manga.eroSeri || manga.id}`, title: manga.titulo })),
    { to: '/comunidad', title: 'Comunidad Mukai' },
    { to: '/chat', title: 'Character Chat' },
  ];
  return (
    <nav aria-label="Explora MangaMukai" className="mx-auto mt-16 w-full max-w-6xl px-5">
      <h2 className="mb-4 font-montserrat text-lg font-bold">Explora MangaMukai</h2>
      <ul className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        {links.map(link => <li key={link.to}><Link to={link.to} className="text-ink/80 hover:text-mukai-magenta">{link.title}</Link></li>)}
      </ul>
      <p className="mt-4 text-sm text-muted">En Character Chat puedes conversar con tus personajes favoritos, crear tu propia historia y vivir una aventura.</p>
    </nav>
  );
}
