import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { AlarmClock, ChevronLeft, ChevronRight, Info, KeyRound, LogOut, Shield, Trash2, UserRound, X } from 'lucide-react';
import { ProfilePostCard } from '../components/social/ProfilePostCard';
import { SlidePanel } from '../components/layout/SlidePanel';
import { OPEN_TIMER_EVENT } from '../components/layout/useNavbarState';
import { MoonIcon, SunIcon } from '../components/ui';
import { SOCIAL_LINKS } from '../config/social';
import { wordpressUrl } from '../config/api';
import { useTheme } from '../hooks/useTheme';
import { AUTH_CHANGED_EVENT, clearAuth, getStoredToken, getStoredUser, type MMUser } from '../services/authService';
import { getInteractions } from '../services/interactionsService';
import { getUltimosCapitulos } from '../services/mangaService';
import { getProfilePosts, type ProfilePost } from '../services/profilePostService';
import { useSavedMangasState } from '../services/savedMangas';
import { getPublicProfile, getSocialLibrary, type PublicProfile, type SocialLibrary, type LibraryChapter } from '../services/socialService';
import { isPlaceholderAvatar } from '../services/wordpressService';
import type { MangaCapitulo } from '../types/manga';
import { readerRankName } from '../utils/readerRank';
import { displayViews } from '../utils/seriesViews';
import { openSubscriptionModal } from '../utils/subscriptionModal';
import profileBanner from '../assets/banners/illustration-anime-character-rain.jpg';
import editIcon from '../assets/profile-icons/edit.svg';
import menuIcon from '../assets/profile-icons/menu.svg';
import crownIcon from '../assets/profile-icons/crown.svg';
import postIcon from '../assets/profile-icons/post.svg';
import collectionIcon from '../assets/profile-icons/collection.svg';
import collectionActiveIcon from '../assets/profile-icons/collection-active.svg';
import savedIcon from '../assets/profile-icons/saved.svg';
import savedActiveIcon from '../assets/profile-icons/saved-active.svg';
import likeIcon from '../assets/profile-icons/like.svg';
import likeActiveIcon from '../assets/profile-icons/like-active.svg';
import historyIcon from '../assets/profile-icons/history.svg';
import historyActiveIcon from '../assets/profile-icons/history-active.svg';
import eyeIcon from '../assets/profile-icons/eye.svg';
import rechargeCoinIcon from '../assets/profile-icons/recharge-coin.svg';
import mukaiProLogo from '../assets/profile-icons/mukai-pro.svg';
import rechargeArtwork from '../../Recarga.png';
import proArtwork from '../../HaztePro.png';
import '../styles/profile-page.css';

type Tab = 'collection' | 'posts' | 'saved' | 'likes' | 'history';
type LibraryFilter = 'objects' | 'covers' | 'series' | 'chapters';
type MenuSection = 'main' | 'security' | 'information' | 'account';
const footerInfoLinks = [
  { label: 'Sobre Nosotros', to: '/nosotros' },
  { label: 'Recibe ayuda', href: SOCIAL_LINKS.discord },
  { label: 'Política de Privacidad', to: '/privacidad' },
  { label: 'Términos de Servicio', to: '/terminos' },
  { label: 'Normas de la Comunidad', to: '/normas-comunidad' },
  { label: 'Política de Cookies', to: '/cookies' },
  { label: 'Cookie Settings', to: '/cookies#como-gestionarlas' },
] as const;
const emptyLibrary = (): SocialLibrary => ({ reading: [], liked_chapters: [], liked_mangas: [] });
const compact = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '')}k` : String(n);
const chapterLabel = (n: number) => n > 0 ? `Capítulo ${n}` : 'Capítulo';

const tabs = [
  { id: 'collection', label: 'Colección', icon: postIcon, activeIcon: postIcon },
  { id: 'posts', label: 'Post', icon: collectionActiveIcon, activeIcon: collectionIcon },
  { id: 'saved', label: 'Guardado', icon: savedIcon, activeIcon: savedActiveIcon },
  { id: 'likes', label: 'Me gusta', icon: likeIcon, activeIcon: likeActiveIcon },
  { id: 'history', label: 'Historial', icon: historyIcon, activeIcon: historyActiveIcon },
] as const;

const Cover = ({ id, title, cover, views, tag }: { id: number | string; title: string; cover: string; views: number; tag?: string }) => (
  <Link to={`/manga/${id}`} className="mobile-profile-cover">
    <img src={cover} alt="" loading="lazy" decoding="async" />
    <span className="mobile-profile-cover-shade" aria-hidden="true" />
    {tag && <span className="mobile-profile-cover-type">{tag}</span>}
    <span className="mobile-profile-cover-views"><img src={eyeIcon} alt="" />{compact(views)}</span>
    <span className="mobile-profile-cover-title">{title}</span>
  </Link>
);
const Chapter = ({ item, history = false }: { item: LibraryChapter; history?: boolean }) => (
  <Link to={`/read/${item.chapter_id}`} className={history ? 'mobile-profile-history-card' : 'mobile-profile-chapter'}>
    <img src={item.image || item.cover} alt="" loading="lazy" decoding="async" />
    <span className="mobile-profile-chapter-info">
      <strong>{chapterLabel(item.chapter_number)}</strong>
      <span>{item.title}</span>
      {history && <em>Continuar</em>}
    </span>
  </Link>
);

export const ProfilePage = () => {
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState<MMUser | null>(() => getStoredToken() ? getStoredUser() : null);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [tab, setTab] = useState<Tab>('collection');
  const [collectionFilter, setCollectionFilter] = useState<LibraryFilter>('covers');
  const [likesFilter, setLikesFilter] = useState<LibraryFilter>('series');
  const [catalog, setCatalog] = useState<MangaCapitulo[]>([]);
  const [library, setLibrary] = useState<SocialLibrary>(emptyLibrary);
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [posts, setPosts] = useState<ProfilePost[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuSection, setMenuSection] = useState<MenuSection>('main');
  const saved = useSavedMangasState();
  const userId = user?.id;

  useEffect(() => {
    const sync = () => setUser(getStoredToken() ? getStoredUser() : null);
    window.addEventListener(AUTH_CHANGED_EVENT, sync);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, sync);
  }, []);
  useEffect(() => {
    if (!userId) return;
    let active = true;
    void Promise.allSettled([getPublicProfile(userId), getUltimosCapitulos(), getSocialLibrary(), getInteractions(), getProfilePosts(userId)])
      .then(([p, c, l, i, post]) => {
        if (!active) return;
        setProfile(p.status === 'fulfilled' ? p.value : null);
        setCatalog(c.status === 'fulfilled' ? c.value : []);
        setLibrary(l.status === 'fulfilled' ? l.value : emptyLibrary());
        setLikedIds(i.status === 'fulfilled' ? i.value?.likes.map(String) ?? [] : []);
        setPosts(post.status === 'fulfilled' ? post.value : []);
        setLoaded(true);
      });
    return () => { active = false; };
  }, [userId]);
  const catalogById = useMemo(() => new Map(catalog.map((manga) => [String(manga.id), manga])), [catalog]);
  const savedMangas = useMemo(() => saved.ids.map((id) => catalogById.get(id)).filter((manga): manga is MangaCapitulo => Boolean(manga)), [saved.ids, catalogById]);
  const likedMangas = useMemo(() => library.liked_mangas.length
    ? library.liked_mangas.map((item) => ({ id: item.manga_id, title: item.title, cover: item.cover }))
    : likedIds.map((id) => catalogById.get(id)).filter((manga): manga is MangaCapitulo => Boolean(manga)).map((manga) => ({ id: manga.id, title: manga.titulo, cover: manga.portada })),
  [library.liked_mangas, likedIds, catalogById]);

  if (!user) return <Navigate to="/auth/login" replace state={{ returnTo: '/mas' }} />;
  const isLight = theme === 'light';
  const chaptersRead = profile?.chapters_read_count ?? profile?.mangas_read_count ?? 0;
  const avatar = profile?.avatar_url || user.avatar || '';
  const premium = Boolean(profile?.is_pro || user.isPremium || user.is_premium);
  const empty = (label: string) => loaded ? <p className="mobile-profile-empty">{label}</p> : null;
  const viewsFor = (id: number | string) => displayViews(catalogById.get(String(id)) || { id, totalViews: 0 });
  const closeMenu = () => { setMenuOpen(false); setMenuSection('main'); };
  const openAlarm = () => { closeMenu(); window.dispatchEvent(new Event(OPEN_TIMER_EVENT)); };

  return <main className={`profile-page mobile-profile mobile-profile-more ${isLight ? 'mobile-profile-light' : 'mobile-profile-dark'}`}>
    <div className="mobile-profile-shell">
      <div className="mobile-profile-hero">
        <img src={profile?.banner_url || profileBanner} alt="" aria-hidden="true" />
        <span className="mobile-profile-hero-fade" />
        <Link to="/perfil/editar" className="mobile-profile-edit" aria-label="Editar perfil"><img src={editIcon} alt="" /></Link>
        <button type="button" className="mobile-profile-menu" aria-label="Abrir menú" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}><img src={menuIcon} alt="" /></button>
      </div>
      <section className="mobile-profile-identity" aria-label="Información del perfil">
        <span className="mobile-profile-avatar">{avatar && !isPlaceholderAvatar(avatar) ? <img src={avatar} alt="" /> : <UserRound size={45} />}</span>
        <div className="mobile-profile-identity-info">
          <div className="mobile-profile-name-row">
            <div className="mobile-profile-name"><h1>{user.display_name || user.username}</h1><span>@{user.username}</span></div>
            <button type="button" className="mobile-profile-pro-badge" onClick={openSubscriptionModal}><img src={crownIcon} alt="" />{premium ? 'Mukai Pro' : 'Hazte Pro'}</button>
          </div>
          <div className="mobile-profile-stats">
            <div><strong>{compact(profile?.followers_count ?? 0)}</strong><span>Seguidores</span></div>
            <div><strong>{readerRankName(chaptersRead)}</strong><span>Rango Mukai</span></div>
            <div><strong>{compact(chaptersRead)}</strong><span>Leídos</span></div>
          </div>
          <p className="mobile-profile-bio">{profile?.bio?.trim() || 'No bio yet'}</p>
        </div>
      </section>
      <section className="mobile-profile-promos" aria-label="Monedas y suscripción">
        <Link to="/recargar" className="mobile-profile-promo mobile-profile-recharge">
          <img className="mobile-profile-promo-artwork" src={rechargeArtwork} alt="" />
          <span className="mobile-profile-balance"><img className="mobile-profile-coin" src={rechargeCoinIcon} alt="" />{compact(user.coins || 0)}</span>
          <span className="mobile-profile-recharge-action">Recargar</span>
        </Link>
        <button type="button" onClick={openSubscriptionModal} className="mobile-profile-promo mobile-profile-pro-promo">
          <img className="mobile-profile-promo-artwork" src={proArtwork} alt="" />
          <img className="mobile-profile-pro-logo" src={mukaiProLogo} alt="" />
          <span className="mobile-profile-pro-promo-action">Hazte Pro</span>
        </button>
      </section>
      <section className="mobile-profile-content" aria-label="Biblioteca del perfil">
        <div className="mobile-profile-tabs" role="tablist" aria-label="Apartados del perfil">
          {tabs.map(({ id, label, icon, activeIcon }) => <button key={id} type="button" role="tab" aria-selected={tab === id} aria-label={label} onClick={() => setTab(id)} className={tab === id ? 'active' : ''}><img src={tab === id ? activeIcon : icon} alt="" /><span>{label}</span></button>)}
        </div>
        {tab === 'collection' && <div role="tabpanel" className="mobile-profile-panel">
          <div className="mobile-profile-filters"><button type="button" className={collectionFilter === 'objects' ? 'active' : ''} onClick={() => setCollectionFilter('objects')}>Objetos</button><button type="button" className={collectionFilter === 'covers' ? 'active' : ''} onClick={() => setCollectionFilter('covers')}>Portadas</button></div>
          {empty('Aún no tienes una colección')}
        </div>}
        {tab === 'posts' && <div role="tabpanel" className="mobile-profile-panel">
          {posts.length ? <div className="mobile-profile-posts">{posts.map((post) => <ProfilePostCard key={post.id} initialPost={post} isLight={isLight} variant="community" onShared={(shared) => setPosts((current) => [shared, ...current.filter((item) => item.id !== shared.id)])} />)}</div> : empty('Aún no has publicado nada')}
        </div>}
        {tab === 'saved' && <div role="tabpanel" className="mobile-profile-panel">{savedMangas.length ? <div className="mobile-profile-cover-grid">{savedMangas.map((manga) => <Cover key={manga.id} id={manga.id} title={manga.titulo} cover={manga.portada} views={displayViews(manga)} />)}</div> : saved.loaded && empty('Aún no has guardado mangas')}</div>}
        {tab === 'likes' && <div role="tabpanel" className="mobile-profile-panel">
          <div className="mobile-profile-filters"><button type="button" className={likesFilter === 'series' ? 'active' : ''} onClick={() => setLikesFilter('series')}>Series</button><button type="button" className={likesFilter === 'chapters' ? 'active' : ''} onClick={() => setLikesFilter('chapters')}>Capítulos</button></div>
          {likesFilter === 'series' ? likedMangas.length ? <div className="mobile-profile-cover-grid">{likedMangas.map((manga) => <Cover key={manga.id} {...manga} views={viewsFor(manga.id)} tag="Manga" />)}</div> : empty('Aún no has dado me gusta a ninguna serie') : library.liked_chapters.length ? <div className="mobile-profile-chapters">{library.liked_chapters.map((item) => <Chapter key={item.chapter_id} item={item} />)}</div> : empty('Aún no has reaccionado a ningún capítulo')}
        </div>}
        {tab === 'history' && <div role="tabpanel" className="mobile-profile-panel">{library.reading.length ? <div className="mobile-profile-history">{library.reading.map((item) => <Chapter key={item.chapter_id} item={item} history />)}</div> : empty('Aún no has empezado ninguna lectura')}</div>}
      </section>
    </div>
    <SlidePanel open={menuOpen} from="right" size="wide" blurBackdrop isLight={isLight} label="Opciones del perfil" onClose={closeMenu}>
      <div className="profile-settings-panel">
        <header className="profile-settings-header">
          {menuSection !== 'main' ? <button type="button" onClick={() => setMenuSection('main')} aria-label="Volver a opciones"><ChevronLeft size={20} /></button> : <span />}
          <h2>{menuSection === 'main' ? 'Opciones' : menuSection === 'security' ? 'Seguridad' : menuSection === 'information' ? 'Información' : 'Cuenta'}</h2>
          <button type="button" onClick={closeMenu} aria-label="Cerrar opciones"><X size={20} /></button>
        </header>
        {menuSection === 'security' ? <nav className="profile-settings-list" aria-label="Seguridad de la cuenta">
          <a href={wordpressUrl('wp-login.php?action=lostpassword')}><KeyRound size={19} /><span>Restablecer contraseña</span><ChevronRight size={16} /></a>
        </nav> : menuSection === 'information' ? <nav className="profile-settings-list" aria-label="Información y ayuda">
          {footerInfoLinks.map(link => 'to' in link ? <Link key={link.label} to={link.to} onClick={closeMenu}><span>{link.label}</span><ChevronRight size={16} /></Link> : <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer"><span>{link.label}</span><ChevronRight size={16} /></a>)}
        </nav> : menuSection === 'account' ? <nav className="profile-settings-list" aria-label="Cuenta">
          <Link to="/contacto?motivo=eliminar-cuenta" onClick={closeMenu} className="profile-settings-danger"><Trash2 size={19} /><span>Eliminar cuenta</span><ChevronRight size={16} /></Link>
          <p className="profile-settings-note">Solicita la eliminación de tu cuenta al equipo de MangaMukai.</p>
        </nav> : <>
          <nav className="profile-settings-list" aria-label="Opciones de cuenta">
            <button type="button" className="profile-settings-theme" onClick={toggleTheme}>{isLight ? <MoonIcon size={20} /> : <SunIcon size={20} />}<span>Tema</span><small>{isLight ? 'Claro' : 'Oscuro'}</small></button>
            <button type="button" onClick={openAlarm}><AlarmClock size={19} /><span>Alarma</span><ChevronRight size={16} /></button>
            <div className="profile-settings-divider" />
            <button type="button" onClick={() => setMenuSection('security')}><Shield size={19} /><span>Seguridad</span><ChevronRight size={16} /></button>
            <button type="button" onClick={() => setMenuSection('information')}><Info size={19} /><span>Información</span><ChevronRight size={16} /></button>
            <button type="button" onClick={() => setMenuSection('account')}><UserRound size={19} /><span>Cuenta</span><ChevronRight size={16} /></button>
          </nav>
          <button type="button" className="profile-settings-logout" onClick={() => { closeMenu(); void clearAuth(); }}><LogOut size={19} />Cerrar sesión</button>
        </>}
      </div>
    </SlidePanel>
  </main>;
};
