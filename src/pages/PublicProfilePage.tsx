import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Loader2, MessageCircle, UserRound, UserPlus, UserCheck } from 'lucide-react';
import { ProfilePostCard } from '../components/social/ProfilePostCard';
import { useTheme } from '../hooks/useTheme';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { getStoredToken, getStoredUser } from '../services/authService';
import { followUser, getPublicProfile, getSocialLibrary, openChat, unfollowUser, type PublicProfile, type SocialLibrary } from '../services/socialService';
import { isPlaceholderAvatar } from '../services/wordpressService';
import { readerRankName } from '../utils/readerRank';
import profileBanner from '../assets/banners/illustration-anime-character-rain.jpg';
import postIcon from '../assets/profile-icons/post.svg';
import collectionIcon from '../assets/profile-icons/collection.svg';
import collectionActiveIcon from '../assets/profile-icons/collection-active.svg';
import likeIcon from '../assets/profile-icons/like.svg';
import likeActiveIcon from '../assets/profile-icons/like-active.svg';
import '../styles/profile-page.css';

type Tab = 'collection' | 'posts' | 'likes';
const tabs = [
  { id: 'collection', label: 'Colección', icon: postIcon, activeIcon: postIcon },
  { id: 'posts', label: 'Post', icon: collectionActiveIcon, activeIcon: collectionIcon },
  { id: 'likes', label: 'Me gusta', icon: likeIcon, activeIcon: likeActiveIcon },
] as const;
const compact = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(n);

export const PublicProfilePage = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const self = String(getStoredUser()?.id) === id;
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [library, setLibrary] = useState<SocialLibrary | null>(null);
  const [tab, setTab] = useState<Tab>('collection');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  useDocumentTitle(profile ? `Perfil de ${profile.username}` : undefined);

  const load = useCallback(async () => {
    setLoading(true);
    setProfile(null);
    setError('');
    try { setProfile(await getPublicProfile(id)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'No se pudo cargar este perfil.'); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { setTab('collection'); void load(); }, [load]);
  useEffect(() => {
    if (!self) { setLibrary(null); return; }
    let live = true;
    void getSocialLibrary().then((value) => { if (live) setLibrary(value); }).catch(() => undefined);
    return () => { live = false; };
  }, [self]);
  const requireSession = () => {
    if (getStoredToken()) return true;
    navigate('/auth/login', { state: { returnTo: `/usuarios/${id}` } });
    return false;
  };
  const handleFollow = async () => {
    if (!profile || working || !requireSession()) return;
    if (self || profile.follow_status === 'self') { navigate('/perfil/editar'); return; }
    setWorking(true);
    try {
      const followers = profile.follow_status === 'following' ? await unfollowUser(profile.id) : await followUser(profile.id);
      setProfile((current) => current ? { ...current, follow_status: current.follow_status === 'following' ? 'none' : 'following', followers_count: followers } : null);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'No se pudo actualizar el seguimiento.'); }
    finally { setWorking(false); }
  };
  const handleMessage = () => { if (profile && requireSession()) openChat(profile); };

  if (loading) return <main className={`profile-page mobile-profile ${isLight ? 'mobile-profile-light' : 'mobile-profile-dark'}`}><span role="status" aria-label="Cargando perfil" /></main>;
  if (!profile) return <main className={`profile-page mobile-profile ${isLight ? 'mobile-profile-light' : 'mobile-profile-dark'}`}><div className="mobile-profile-guest"><section><h1>Perfil no disponible</h1><p>{error || 'El usuario no existe.'}</p><Link to="/comunidad">Volver a Comunidad</Link></section></div></main>;
  const chaptersRead = profile.chapters_read_count ?? profile.mangas_read_count ?? 0;
  const avatar = profile.avatar_url;
  const following = profile.follow_status === 'following';

  return <main className={`profile-page mobile-profile ${isLight ? 'mobile-profile-light' : 'mobile-profile-dark'} public-profile-page`}>
    <div className={`mobile-profile-shell public-profile-shell ${profile.is_pro ? 'public-profile-pro' : ''}`}>
      <div className="mobile-profile-hero"><img src={profile.banner_url || profileBanner} alt="" aria-hidden="true" /><span className="mobile-profile-hero-fade" /></div>
      <section className="mobile-profile-identity" aria-label="Información del perfil">
        <span className="mobile-profile-avatar">{avatar && !isPlaceholderAvatar(avatar) ? <img src={avatar} alt="" /> : <UserRound size={45} />}</span>
        <div className="mobile-profile-identity-info">
          <div className="mobile-profile-name-row">
            <div className="mobile-profile-name"><h1>{profile.username}</h1><span>@{profile.username}</span></div>
          </div>
          <div className="mobile-profile-stats">
            <div><strong>{compact(profile.followers_count || 0)}</strong><span>Seguidores</span></div>
            <div><strong>{readerRankName(chaptersRead)}</strong><span>Rango Mukai</span></div>
            <div><strong>{compact(chaptersRead)}</strong><span>Leídos</span></div>
          </div>
          <div className="public-profile-actions">
            <button type="button" className="public-profile-follow" onClick={() => void handleFollow()} disabled={working} aria-pressed={self ? undefined : following}>{working ? <Loader2 size={16} className="animate-spin" /> : self ? null : following ? <UserCheck size={16} /> : <UserPlus size={16} />}{self ? 'Editar perfil' : following ? 'Siguiendo' : 'Seguir'}</button>
            {!self && <button type="button" className="public-profile-message" onClick={handleMessage}><MessageCircle size={17} />Mensaje</button>}
          </div>
          {profile.follows_you && !self && <span className="public-profile-follows-you">Te sigue</span>}
          <p className="mobile-profile-bio">{profile.bio?.trim() || 'No bio yet'}</p>
        </div>
      </section>
      {error && <p role="alert" className="public-profile-error">{error}</p>}
      <section className="mobile-profile-content" aria-label="Contenido del perfil">
        <div className="mobile-profile-tabs" role="tablist" aria-label="Apartados del perfil">
          {tabs.map(({ id: section, label, icon, activeIcon }) => <button key={section} type="button" role="tab" aria-selected={tab === section} aria-label={label} onClick={() => setTab(section)} className={tab === section ? 'active' : ''}><img src={tab === section ? activeIcon : icon} alt="" /><span>{label}</span></button>)}
        </div>
        {tab === 'collection' && <div role="tabpanel" className="mobile-profile-panel"><p className="mobile-profile-empty">{profile.username} aún no tiene objetos públicos en su colección.</p></div>}
        {tab === 'posts' && <div role="tabpanel" className="mobile-profile-panel">{profile.posts?.length ? <div className="mobile-profile-posts">{profile.posts.map((post) => <ProfilePostCard key={post.id} initialPost={post} isLight={isLight} variant="community" />)}</div> : <p className="mobile-profile-empty">Aún no hay publicaciones.</p>}</div>}
        {tab === 'likes' && <div role="tabpanel" className="mobile-profile-panel">{self && library?.liked_mangas.length ? <div className="mobile-profile-cover-grid">{library.liked_mangas.map((manga) => <Link key={manga.manga_id} to={`/manga/${manga.manga_id}`} className="mobile-profile-cover"><img src={manga.cover} alt={manga.title} loading="lazy" /><span className="mobile-profile-cover-shade" /><span className="mobile-profile-cover-title">{manga.title}</span></Link>)}</div> : <p className="mobile-profile-empty">{self ? 'Aún no has dado Me gusta a ninguna serie.' : 'Los Me gusta de este lector no están disponibles públicamente.'}</p>}</div>}
      </section>
    </div>
  </main>;
};
