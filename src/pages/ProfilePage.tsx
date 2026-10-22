import { PremiumElectricBorder } from '../components/ui/PremiumElectricBorder';
import { prefetchRoute } from '../utils/prefetchRoute';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { AlarmClock, ChevronLeft, ChevronRight, Info, KeyRound, LogOut, ReceiptText, Shield, Trash2, UserRound, X } from 'lucide-react';
import { ProfilePostCard } from '../components/social/ProfilePostCard';
import { CollectionCoverPreview } from '../components/social/CollectionCoverPreview';
import { SlidePanel } from '../components/layout/SlidePanel';
import { OPEN_TIMER_EVENT } from '../components/layout/useNavbarState';
import { MoonIcon, SunIcon } from '../components/ui';
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
import { selectLikedSeries } from '../utils/profileSeriesLikes';
import { getReadyProfileImages, isProfileImageReady, loadProfileData, peekProfileData, rememberProfileImage } from '../services/profilePageCache';
import profileBanner from '../assets/banners/illustration-anime-character-rain.webp';
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
import rechargeArtwork from '../assets/profile/Recarga.png';
import proArtwork from '../assets/profile/HaztePro.png';
import '../styles/profile-page.css';

type Tab = 'collection' | 'posts' | 'saved' | 'likes' | 'history';
type LibraryFilter = 'objects' | 'covers' | 'purchased' | 'series' | 'chapters';
type MenuSection = 'main' | 'security' | 'information' | 'account';
const footerInfoLinks = [
  { label: 'Recibe ayuda', href: 'https://wa.me/51926615198' },
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
    <span className="mobile-profile-cover-badges">
      {tag && <span className="mobile-profile-cover-type">{tag}</span>}
      <span className="mobile-profile-cover-views"><img src={eyeIcon} alt="" />{compact(views)}</span>
    </span>
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

const ProfileLoading = () => <div className="profile-loading-grid" role="status" aria-label="Cargando contenido del perfil">{[0, 1, 2].map(index => <span key={index} className="profile-loading-block" aria-hidden="true" />)}</div>;

const ProfileImage = ({ src, className = '', onSettled }: { src: string; className?: string; onSettled: (src: string) => void }) => {
  const [ready, setReady] = useState(() => isProfileImageReady(src));
  useEffect(() => {

    const timer = window.setTimeout(() => onSettled(src), 8000);
    return () => window.clearTimeout(timer);
  }, [src, onSettled]);
  return <img src={src} alt="" loading="eager" fetchPriority="high" decoding="async"
    className={`${className} profile-priority-image${ready ? ' is-ready' : ''}`}
    onLoad={event => { const image = event.currentTarget; void image.decode().catch(() => undefined).then(() => { rememberProfileImage(src); setReady(true); onSettled(src); }); }}
    onError={() => onSettled(src)} />;
};

export const ProfilePage = () => {
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState<MMUser | null>(() => getStoredToken() ? getStoredUser() : null);
  const [profile, setProfile] = useState<PublicProfile | null>(() => user ? peekProfileData(user.id, 'profile') ?? null : null);
  const [tab, setTab] = useState<Tab>('collection');
  const [collectionFilter, setCollectionFilter] = useState<LibraryFilter>('covers');
  const [likesFilter, setLikesFilter] = useState<LibraryFilter>('series');
  const [catalog, setCatalog] = useState<MangaCapitulo[]>(() => user ? peekProfileData(user.id, 'catalog') ?? [] : []);
  const [library, setLibrary] = useState<SocialLibrary>(() => user ? peekProfileData(user.id, 'library') ?? emptyLibrary() : emptyLibrary());
  const [likedIds, setLikedIds] = useState<string[]>(() => user ? peekProfileData(user.id, 'likedIds') ?? [] : []);
  const [posts, setPosts] = useState<ProfilePost[]>(() => user ? peekProfileData(user.id, 'posts') ?? [] : []);
  const [loaded, setLoaded] = useState(() => !!user && ['catalog', 'library', 'likedIds', 'posts'].every(key => peekProfileData(user.id, key as 'catalog' | 'library' | 'likedIds' | 'posts') !== undefined));
  const [catalogLoaded, setCatalogLoaded] = useState(() => !!user && peekProfileData(user.id, 'catalog') !== undefined);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuSection, setMenuSection] = useState<MenuSection>('main');
  const [profileLoadedFor, setProfileLoadedFor] = useState<string | null>(() => user && profile ? String(user.id) : null);
  const profileLoaded = !!user && profileLoadedFor === String(user.id);
  const [settledImages, setSettledImages] = useState<string[]>(getReadyProfileImages);
  const settleImage = useCallback((src: string) => setSettledImages(current => current.includes(src) ? current : [...current, src]), []);
  const avatar = profile?.avatar_url || user?.avatar || '';
  const banner = profile?.banner_url || profileBanner;
  const primaryImages = [banner, rechargeArtwork, proArtwork, mukaiProLogo, ...(avatar && !isPlaceholderAvatar(avatar) ? [avatar] : [])];
  const primaryReady = profileLoaded && primaryImages.every(src => settledImages.includes(src));
  const saved = useSavedMangasState(primaryReady);
  const userId = user?.id;

  useEffect(() => {
    const sync = () => setUser(getStoredToken() ? getStoredUser() : null);
    window.addEventListener(AUTH_CHANGED_EVENT, sync);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, sync);
  }, []);
  useEffect(() => {
    if (!userId) return;
    let active = true;
    const cachedProfile = peekProfileData(userId, 'profile');
    setLoaded(['catalog', 'library', 'likedIds', 'posts'].every(key => peekProfileData(userId, key as 'catalog' | 'library' | 'likedIds' | 'posts') !== undefined));
    setCatalogLoaded(peekProfileData(userId, 'catalog') !== undefined);
    setProfileLoadedFor(cachedProfile ? String(userId) : null);
    setProfile(cachedProfile ?? null);
    setCatalog(peekProfileData(userId, 'catalog') ?? []);
    setPosts(peekProfileData(userId, 'posts') ?? []);
    setLibrary(peekProfileData(userId, 'library') ?? emptyLibrary());
    setLikedIds(peekProfileData(userId, 'likedIds') ?? []);
    void loadProfileData(userId, 'profile', async () => {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 10000);
      try { return await getPublicProfile(userId, controller.signal); }
      finally { window.clearTimeout(timeout); }
    }).then(result => { if (active) setProfile(result); }).catch(() => undefined)
      .finally(() => { if (active) setProfileLoadedFor(String(userId)); });
    return () => { active = false; };
  }, [userId]);
  useEffect(() => {
    if (!userId || !primaryReady) return;
    let active = true;
    const catalogRequest = loadProfileData(userId, 'catalog', getUltimosCapitulos).then(items => {
      if (active) setCatalog(items);
    }).catch(() => undefined).finally(() => { if (active) setCatalogLoaded(true); });
    const libraryRequest = loadProfileData(userId, 'library', getSocialLibrary).then(items => { if (active) setLibrary(items); });
    const interactionsRequest = loadProfileData(userId, 'likedIds', async () => {
      const items = await getInteractions();
      if (!items) throw new Error('No se pudieron cargar las interacciones.');
      return items.likes.map(String);
    }).then(items => { if (active) setLikedIds(items); });
    const postsRequest = loadProfileData(userId, 'posts', () => getProfilePosts(userId)).then(items => { if (active) setPosts(items); });
    void Promise.allSettled([catalogRequest, libraryRequest, interactionsRequest, postsRequest])
      .then(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, [userId, primaryReady]);
  const catalogById = useMemo(() => new Map(catalog.map((manga) => [String(manga.id), manga])), [catalog]);
  const savedMangas = useMemo(() => saved.ids.map((id) => catalogById.get(id)).filter((manga): manga is MangaCapitulo => Boolean(manga)), [saved.ids, catalogById]);
  const likedMangas = useMemo(() => selectLikedSeries(likedIds, catalog), [likedIds, catalog]);
  const previewManga = catalog.find((manga) => String(manga.id) === '55005') || catalog[0];

  if (!user) return <Navigate to="/auth/login" replace state={{ returnTo: '/profile' }} />;
  const isLight = theme === 'light';
  const chaptersRead = profile?.chapters_read_count ?? profile?.mangas_read_count ?? 0;
  const premium = Boolean(profile?.is_pro ?? (user.isPremium || user.is_premium));
  const empty = (label: string) => loaded ? <p className="mobile-profile-empty">{label}</p> : <ProfileLoading />;
  const viewsFor = (id: number | string) => displayViews(catalogById.get(String(id)) || { id, totalViews: 0 });
  const closeMenu = () => { setMenuOpen(false); setMenuSection('main'); };
  const openAlarm = () => { closeMenu(); window.dispatchEvent(new Event(OPEN_TIMER_EVENT)); };

  return <main className={`profile-page mobile-profile mobile-profile-more ${isLight ? 'mobile-profile-light' : 'mobile-profile-dark'}`}>
    <div className="mobile-profile-shell">
      <div className={`mobile-profile-hero${!settledImages.includes(banner) ? " profile-loading-surface" : ""}`} aria-busy={!settledImages.includes(banner)}>
        {profileLoaded && <ProfileImage key={banner} src={banner} onSettled={settleImage} />}
        <span className="mobile-profile-hero-fade" />
        <Link to="/perfil/editar" className="mobile-profile-edit" aria-label="Editar perfil"><img src={editIcon} alt="" /></Link>
        <button type="button" className="mobile-profile-menu" aria-label="Abrir menú" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}><img src={menuIcon} alt="" /></button>
      </div>
      <section className="mobile-profile-identity" aria-label="Información del perfil">
        <span className={`premium-avatar-frame${premium ? ' premium-avatar-frame--active' : ''}`}><span className={`mobile-profile-avatar${!profileLoaded || (avatar && !settledImages.includes(avatar)) ? " profile-loading-surface" : ""}`}>{avatar && !isPlaceholderAvatar(avatar) ? <ProfileImage key={avatar} src={avatar} onSettled={settleImage} /> : <UserRound size={45} />}</span>{premium && <PremiumElectricBorder />}</span>
        <div className="mobile-profile-identity-info">
          <div className="mobile-profile-name-row">
            <div className="mobile-profile-name"><h1>{user.display_name || user.username}</h1><span>@{user.username}</span></div>
            <Link to="/pro" className="mobile-profile-pro-badge"><img src={crownIcon} alt="" />{premium ? 'Mukai Pro' : 'Hazte Pro'}</Link>
          </div>
          <div className={`mobile-profile-stats${!profileLoaded ? " profile-loading-text" : ""}`} aria-busy={!profileLoaded}>
            <div><strong>{compact(profile?.followers_count ?? 0)}</strong><span>Seguidores</span></div>
            <div><strong>{readerRankName(chaptersRead)}</strong><span>Rango Mukai</span></div>
            <div><strong>{compact(chaptersRead)}</strong><span>Leídos</span></div>
          </div>
          <p className={`mobile-profile-bio${!profileLoaded ? " profile-loading-text" : ""}`}>{profile?.bio?.trim() || 'No bio yet'}</p>
        </div>
      </section>
      <section className={`mobile-profile-promos${!primaryReady ? " profile-promos-loading" : ""}`} aria-label="Monedas y suscripción">
        <Link to="/recargar" onPointerEnter={() => prefetchRoute('/recargar')} onFocus={() => prefetchRoute('/recargar')} onTouchStart={() => prefetchRoute('/recargar')} className="mobile-profile-promo mobile-profile-recharge">
          <ProfileImage key={rechargeArtwork} className="mobile-profile-promo-artwork" src={rechargeArtwork} onSettled={settleImage} />
          <span className="mobile-profile-recharge-details">
            <span className="mobile-profile-balance"><img className="mobile-profile-coin" src={rechargeCoinIcon} alt="Monedas" />{user.coins ?? 0}</span>
            <span className="mobile-profile-recharge-action">Recargar</span>
          </span>
        </Link>
        <Link to="/pro" onPointerEnter={() => prefetchRoute('/pro')} onFocus={() => prefetchRoute('/pro')} onTouchStart={() => prefetchRoute('/pro')} className="mobile-profile-promo mobile-profile-pro-promo">
          <ProfileImage key={proArtwork} className="mobile-profile-promo-artwork" src={proArtwork} onSettled={settleImage} />
          <ProfileImage key={mukaiProLogo} className="mobile-profile-pro-logo" src={mukaiProLogo} onSettled={settleImage} />
          <span className="mobile-profile-pro-promo-action">Hazte Pro</span>
        </Link>
      </section>
      <section className="mobile-profile-content" aria-label="Biblioteca del perfil">
        <div className="mobile-profile-tabs" role="tablist" aria-label="Apartados del perfil">
          {tabs.map(({ id, label, icon, activeIcon }) => <button key={id} type="button" role="tab" aria-selected={tab === id} aria-label={label} onClick={() => setTab(id)} className={tab === id ? 'active' : ''}><img src={tab === id ? activeIcon : icon} alt="" /><span>{label}</span></button>)}
        </div>
        {tab === 'collection' && <div role="tabpanel" className="mobile-profile-panel">
          <div className="mobile-profile-filters"><button type="button" className={collectionFilter === 'objects' ? 'active' : ''} onClick={() => setCollectionFilter('objects')}>Objetos</button><button type="button" className={collectionFilter === 'covers' ? 'active' : ''} onClick={() => setCollectionFilter('covers')}>Portadas</button><button type="button" aria-pressed={collectionFilter === 'purchased'} className={`mobile-profile-purchased-filter${collectionFilter === 'purchased' ? ' active' : ''}`} onClick={() => setCollectionFilter('purchased')}>Comprado</button></div>
          {collectionFilter === 'covers' || collectionFilter === 'purchased' ? (
            previewManga?.portada ? <div className="profile-collection-preview-grid"><CollectionCoverPreview key={previewManga.portada} cover={previewManga.portada} title={previewManga.titulo || 'Portada de colección'} purchased={collectionFilter === 'purchased'} /></div>
              : catalogLoaded ? <p className="mobile-profile-empty">No hay portadas disponibles</p>
                : <div className="profile-collection-preview-grid" role="status" aria-label="Cargando portadas"><span className="profile-collection-loading" aria-hidden="true" /></div>
          ) : empty('Aún no tienes una colección')}
        </div>}
        {tab === 'posts' && <div role="tabpanel" className="mobile-profile-panel">
          {posts.length ? <div className="mobile-profile-posts">{posts.map((post) => <ProfilePostCard key={post.id} initialPost={post} isLight={isLight} variant="community" onShared={(shared) => setPosts((current) => [shared, ...current.filter((item) => item.id !== shared.id)])} />)}</div> : empty('Aún no has publicado nada')}
        </div>}
        {tab === 'saved' && <div role="tabpanel" className="mobile-profile-panel">{!loaded ? <ProfileLoading /> : savedMangas.length ? <div className="mobile-profile-cover-grid">{savedMangas.map((manga) => <Cover key={manga.id} id={manga.id} title={manga.titulo} cover={manga.portada} views={displayViews(manga)} />)}</div> : saved.loaded && empty('Aún no has guardado mangas')}</div>}
        {tab === 'likes' && <div role="tabpanel" className="mobile-profile-panel">
          <div className="mobile-profile-filters"><button type="button" className={likesFilter === 'series' ? 'active' : ''} onClick={() => setLikesFilter('series')}>Series</button><button type="button" className={likesFilter === 'chapters' ? 'active' : ''} onClick={() => setLikesFilter('chapters')}>Capítulos</button></div>
          {likesFilter === 'series' ? likedMangas.length ? <div className="mobile-profile-cover-grid">{likedMangas.map((manga) => <Cover key={manga.id} {...manga} views={viewsFor(manga.id)} tag="Manga" />)}</div> : empty('Aún no has dado me gusta a ninguna serie') : library.liked_chapters.length ? <div className="mobile-profile-chapters">{library.liked_chapters.map((item) => <Chapter key={item.chapter_id} item={item} />)}</div> : empty('Aún no has reaccionado a ningún capítulo')}
        </div>}
        {tab === 'history' && <div role="tabpanel" className="mobile-profile-panel">{library.reading.length ? <div className="mobile-profile-history">{library.reading.map((item) => <Chapter key={item.chapter_id} item={item} history />)}</div> : empty('Aún no has empezado ninguna lectura')}</div>}
      </section>
    </div>
    <SlidePanel open={menuOpen} from="right" size="profile" blurBackdrop isLight={isLight} label="Opciones del perfil" onClose={closeMenu}>
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
            <button type="button" className="profile-settings-theme" role="switch" aria-checked={!isLight} aria-label="Tema oscuro" onClick={toggleTheme}>{isLight ? <MoonIcon size={20} /> : <SunIcon size={20} />}<span>Tema</span><span className="profile-theme-switch" aria-hidden="true"><span /></span></button>
            <button type="button" onClick={openAlarm}><AlarmClock size={19} /><span>Alarma</span><ChevronRight size={16} /></button>
            <div className="profile-settings-divider" />
            <Link to="/transacciones" onClick={closeMenu} onPointerEnter={() => prefetchRoute('/transacciones')} onFocus={() => prefetchRoute('/transacciones')}><ReceiptText size={19} aria-hidden="true" /><span>Transacciones</span><ChevronRight size={16} /></Link>
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
