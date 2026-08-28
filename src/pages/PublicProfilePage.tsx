import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Cake,
  CalendarDays,
  Check,
  Edit3,
  Image as ImageIcon,
  Link2,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
  User,
  UserPlus,
  Video,
} from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { ProfileMotionBackdrop, type ProfileBackdropCover } from '../components/social';
import { getStoredToken, getStoredUser } from '../services/authService';
import { respondFriendRequest, sendFriendRequest } from '../services/friendsService';
import { getUltimosCapitulos } from '../services/mangaService';
import { getPublicProfile, openChat, type PublicProfile } from '../services/socialService';
import { finishGlobalLoading, startGlobalLoading } from '../utils/globalLoading';

const SOCIAL_LABELS: Record<string, string> = {
  facebook: 'Facebook',
  twitter: 'X / Twitter',
  instagram: 'Instagram',
  discord: 'Discord',
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  youtube: 'YouTube',
  github: 'GitHub',
};

type PublicProfileSection = 'summary' | 'information';

const buildProfileCovers = (items: Awaited<ReturnType<typeof getUltimosCapitulos>>): ProfileBackdropCover[] => {
  const seen = new Set<string>();
  return items.reduce<ProfileBackdropCover[]>((result, manga) => {
    const id = manga.eroSeri || manga.id;
    const key = String(id);
    if (!id || seen.has(key) || !manga.portada) return result;
    seen.add(key);
    result.push({ id, title: manga.titulo, cover: manga.portada });
    return result;
  }, []).slice(0, 10);
};

const formatProfileDate = (value: string) => {
  if (!value) return '';
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
};

const formatPostDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('es-PE', {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
};

export const PublicProfilePage = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const currentUser = getStoredUser();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [backgroundCovers, setBackgroundCovers] = useState<ProfileBackdropCover[]>([]);
  const [activeSection, setActiveSection] = useState<PublicProfileSection>('summary');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (showPageLoading = false) => {
    if (showPageLoading) setLoading(true);
    try {
      setProfile(await getPublicProfile(id));
      setError('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo cargar este perfil.');
    } finally {
      if (showPageLoading) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const loadingScope = `public-profile:${id}`;
    setActiveSection('summary');
    startGlobalLoading(14, loadingScope);
    void Promise.all([
      load(true),
      getUltimosCapitulos().then((items) => setBackgroundCovers(buildProfileCovers(items))).catch(() => setBackgroundCovers([])),
    ]).finally(() => finishGlobalLoading(loadingScope));
    return () => finishGlobalLoading(loadingScope);
  }, [id, load]);

  const links = useMemo(() => profile
    ? Object.entries(profile.social_links).filter(([, value]) => Boolean(value?.trim()))
    : [], [profile]);

  const handleRelationship = async () => {
    if (!profile || working) return;
    if (!getStoredToken()) {
      navigate('/auth/login', { state: { returnTo: `/usuarios/${profile.id}` } });
      return;
    }
    if (profile.friendship_status === 'self') {
      navigate('/perfil');
      return;
    }
    if (profile.friendship_status === 'friends') {
      openChat(profile);
      return;
    }

    setWorking(true);
    try {
      if (profile.friendship_status === 'pending_received') {
        await respondFriendRequest(profile.friend_request_id, 'accept');
      } else if (profile.friendship_status === 'none' || profile.friendship_status === 'guest') {
        await sendFriendRequest(profile.id);
      }
      await load(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo completar la solicitud.');
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return <div className={`min-h-screen ${isLight ? 'bg-[#f0f2f5]' : 'bg-[#18191a]'}`} />;
  }

  if (!profile) {
    return (
      <div className={`flex min-h-screen flex-col items-center justify-center gap-4 px-6 pt-24 text-center ${isLight ? 'bg-[#f0f2f5] text-black' : 'bg-[#18191a] text-white'}`}>
        <User size={42} className="text-[#FF4D88]" />
        <h1 className="text-xl font-black">Perfil no disponible</h1>
        <p className={isLight ? 'text-black/50' : 'text-white/45'}>{error || 'El usuario no existe.'}</p>
        <Link to="/" className="rounded-lg bg-[#FF4D88] px-5 py-3 text-xs font-black text-white">
          Volver al inicio
        </Link>
      </div>
    );
  }

  const joined = new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric' }).format(new Date(profile.created_at));
  const buttonText = profile.friendship_status === 'self'
    ? 'Editar mi perfil'
    : profile.friendship_status === 'friends'
      ? 'Enviar mensaje'
      : profile.friendship_status === 'pending_sent'
        ? 'Solicitud enviada'
        : profile.friendship_status === 'pending_received'
          ? 'Aceptar solicitud'
          : 'Agregar amigo';
  const cardClass = isLight
    ? 'border-black/[.08] bg-white shadow-[0_1px_2px_rgba(0,0,0,.12)]'
    : 'border-white/[.08] bg-[#242526] shadow-[0_1px_2px_rgba(0,0,0,.45)]';
  const secondaryText = isLight ? 'text-black/60' : 'text-white/60';
  const hasPublicDetails = Boolean(profile.location || profile.birth_date || profile.phone);

  const socialLinks = (
    <div className="mt-4 flex flex-wrap gap-2">
      {links.length === 0 ? (
        <p className={`text-sm ${secondaryText}`}>Sin redes sociales públicas.</p>
      ) : links.map(([key, value]) => key === 'discord' && !value.startsWith('http') ? (
        <span
          key={key}
          className={`rounded-lg border px-3 py-2 text-xs font-bold ${isLight ? 'border-black/10 bg-black/[.03]' : 'border-white/10 bg-white/[.04]'}`}
        >
          {SOCIAL_LABELS[key]}: {value}
        </span>
      ) : (
        <a
          key={key}
          href={value}
          target="_blank"
          rel="noreferrer"
          className={`rounded-lg border px-3 py-2 text-xs font-bold transition-colors hover:border-[#FF4D88] hover:text-[#FF4D88] ${isLight ? 'border-black/10 bg-black/[.03]' : 'border-white/10 bg-white/[.04]'}`}
        >
          {SOCIAL_LABELS[key] || key}
        </a>
      ))}
    </div>
  );

  return (
    <main className={`min-h-screen pb-24 pt-16 transition-colors ${isLight ? 'bg-[#f0f2f5] text-[#050505]' : 'bg-[#18191a] text-[#e4e6eb]'}`}>
      <section className={`border-b ${isLight ? 'border-black/10 bg-white' : 'border-white/10 bg-[#242526]'}`}>
        <div className="mx-auto max-w-6xl">
          <div className={`relative h-56 overflow-hidden rounded-b-2xl sm:h-72 md:h-[360px] ${profile.banner_url ? '' : profile.banner_color}`}>
            {profile.banner_url && (
              <img src={profile.banner_url} alt={`Portada de ${profile.username}`} className="h-full w-full object-cover" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/5" />
          </div>

          <div className="px-4 sm:px-6">
            <div className="flex flex-col items-center gap-3 pb-4 sm:-mt-10 sm:flex-row sm:items-end sm:gap-5">
              <div className={`relative -mt-16 h-32 w-32 shrink-0 overflow-hidden rounded-full border-[5px] sm:mt-0 sm:h-40 sm:w-40 ${isLight ? 'border-white bg-zinc-100' : 'border-[#242526] bg-zinc-900'}`}>
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={`Avatar de ${profile.username}`} className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center">
                    <User size={54} className={isLight ? 'text-black/20' : 'text-white/20'} />
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1 text-center sm:-translate-y-3 sm:text-left">
                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <h1 className="break-words text-3xl font-black leading-tight tracking-tight md:text-4xl">{profile.username}</h1>
                  {profile.is_pro && (
                    <span className="rounded-full bg-[#FF4D88]/15 px-3 py-1 text-[9px] font-black tracking-wide text-[#FF4D88]">
                      MUKAI PRO
                    </span>
                  )}
                </div>
                <p className={`mt-1 flex items-center justify-center gap-1.5 text-sm font-semibold sm:justify-start ${secondaryText}`}>
                  <CalendarDays size={15} className="shrink-0 text-[#FF4D88]" />
                  Miembro de Manga Mukai desde {joined}
                </p>
              </div>

              <button
                type="button"
                onClick={() => void handleRelationship()}
                disabled={working || profile.friendship_status === 'pending_sent'}
                className={`mb-1 flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-lg px-5 text-sm font-bold transition-all hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-default disabled:opacity-60 sm:w-auto ${profile.friendship_status === 'friends' ? isLight ? 'bg-[#e4e6eb] text-[#050505] hover:bg-[#d8dadf]' : 'bg-[#3a3b3c] text-white hover:bg-[#4e4f50]' : 'bg-[#FF4D88] text-white hover:bg-[#ff347b]'}`}
              >
                {working ? <Loader2 size={17} className="animate-spin" />
                  : profile.friendship_status === 'self' ? <Edit3 size={17} />
                    : profile.friendship_status === 'friends' ? <MessageCircle size={18} />
                      : profile.friendship_status === 'pending_sent' ? <Check size={17} />
                        : <UserPlus size={18} />}
                {buttonText}
              </button>
            </div>

            <nav className={`flex justify-center border-t sm:justify-start ${isLight ? 'border-black/10' : 'border-white/10'}`} aria-label="Secciones del perfil">
              <button
                type="button"
                onClick={() => setActiveSection('summary')}
                className={`relative min-w-28 px-4 py-4 text-sm font-bold transition-colors ${activeSection === 'summary' ? 'text-[#FF4D88]' : `${secondaryText} hover:bg-black/5 dark:hover:bg-white/5`}`}
              >
                Resumen
                {activeSection === 'summary' && <span className="absolute inset-x-2 bottom-0 h-[3px] rounded-t-full bg-[#FF4D88]" />}
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('information')}
                className={`relative min-w-28 px-4 py-4 text-sm font-bold transition-colors ${activeSection === 'information' ? 'text-[#FF4D88]' : `${secondaryText} hover:bg-black/5 dark:hover:bg-white/5`}`}
              >
                Información
                {activeSection === 'information' && <span className="absolute inset-x-2 bottom-0 h-[3px] rounded-t-full bg-[#FF4D88]" />}
              </button>
            </nav>
          </div>
        </div>
      </section>

      <div className="relative isolate min-h-[680px] overflow-hidden">
        <ProfileMotionBackdrop covers={backgroundCovers} isLight={isLight} />
        <div className="relative z-10 mx-auto max-w-6xl px-3 py-4 sm:px-6">
        {error && (
          <p className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500">{error}</p>
        )}

        {activeSection === 'summary' ? (
          <div className="grid items-start gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
            <aside className="space-y-4 lg:sticky lg:top-24">
              <section className={`rounded-xl border p-4 ${cardClass}`}>
                <h2 className="text-xl font-black">Presentación</h2>
                <p className={`mt-3 whitespace-pre-wrap text-center text-sm leading-6 ${secondaryText}`}>
                  {profile.bio || 'Este lector todavía no agregó una descripción.'}
                </p>

                <div className="mt-5 space-y-3 text-sm">
                  {profile.location && (
                    <p className="flex items-start gap-3">
                      <MapPin size={20} className={`mt-0.5 shrink-0 ${secondaryText}`} />
                      <span>Vive en <strong>{profile.location}</strong></span>
                    </p>
                  )}
                  {profile.birth_date && (
                    <p className="flex items-start gap-3">
                      <Cake size={20} className={`mt-0.5 shrink-0 ${secondaryText}`} />
                      <span>Nació el <strong>{formatProfileDate(profile.birth_date)}</strong></span>
                    </p>
                  )}
                  {profile.phone && (
                    <p className="flex items-start gap-3">
                      <Phone size={20} className={`mt-0.5 shrink-0 ${secondaryText}`} />
                      <span><strong>{profile.phone}</strong></span>
                    </p>
                  )}
                </div>
              </section>

              <section className={`rounded-xl border p-4 ${cardClass}`}>
                <h2 className="flex items-center gap-2 text-xl font-black">
                  <Link2 size={20} className="text-[#FF4D88]" />
                  Redes sociales
                </h2>
                {socialLinks}
              </section>
            </aside>

            <section className="min-w-0 space-y-4">
              <div className={`flex items-center justify-between rounded-xl border px-4 py-3 ${cardClass}`}>
                <h2 className="text-xl font-black">Publicaciones</h2>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${isLight ? 'bg-black/[.06] text-black/55' : 'bg-white/[.08] text-white/55'}`}>
                  {profile.posts?.length || 0}
                </span>
              </div>

              {!profile.posts?.length ? (
                <div className={`rounded-xl border px-5 py-12 text-center ${cardClass}`}>
                  <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${isLight ? 'bg-black/[.05]' : 'bg-white/[.07]'}`}>
                    <ImageIcon size={25} className="text-[#FF4D88]" />
                  </div>
                  <p className="mt-4 text-base font-bold">Todavía no hay publicaciones</p>
                  <p className={`mt-1 text-sm ${secondaryText}`}>Cuando {profile.username} publique algo, aparecerá aquí.</p>
                </div>
              ) : profile.posts.map((post) => (
                <article key={post.id} className={`overflow-hidden rounded-xl border ${cardClass}`}>
                  <header className="flex items-center gap-3 px-4 pb-3 pt-4">
                    <div className={`flex h-10 w-10 shrink-0 overflow-hidden rounded-full ${isLight ? 'bg-zinc-100' : 'bg-zinc-900'}`}>
                      {post.author.avatar_url ? (
                        <img src={post.author.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <User size={18} className={`m-auto ${isLight ? 'text-black/25' : 'text-white/25'}`} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{post.author.username}</p>
                      <p className={`text-xs ${secondaryText}`}>{formatPostDate(post.created_at)} · Perfil Mukai</p>
                    </div>
                    {post.media_type === 'video' ? <Video size={18} className="text-[#FF4D88]" />
                      : post.media_type === 'image' ? <ImageIcon size={18} className="text-[#FF4D88]" />
                        : null}
                  </header>

                  {post.content && (
                    <p className={`whitespace-pre-wrap px-4 pb-4 text-[15px] leading-6 ${isLight ? 'text-black/80' : 'text-white/80'}`}>
                      {post.content}
                    </p>
                  )}
                  {post.media_url && post.media_type === 'video' && (
                    <video controls preload="metadata" src={post.media_url} className="max-h-[620px] w-full bg-black object-contain" />
                  )}
                  {post.media_url && post.media_type === 'image' && (
                    <img src={post.media_url} alt="Publicación" loading="lazy" className="max-h-[620px] w-full bg-black/5 object-contain" />
                  )}
                </article>
              ))}
            </section>
          </div>
        ) : (
          <div className="mx-auto grid max-w-4xl items-start gap-4 md:grid-cols-2">
            <section className={`rounded-xl border p-5 md:col-span-2 ${cardClass}`}>
              <h2 className="text-xl font-black">Información sobre {profile.username}</h2>
              <p className={`mt-3 whitespace-pre-wrap text-sm leading-7 ${secondaryText}`}>
                {profile.bio || 'Este lector todavía no agregó una descripción.'}
              </p>
            </section>

            <section className={`rounded-xl border p-5 ${cardClass}`}>
              <h2 className="text-lg font-black">Detalles públicos</h2>
              <div className="mt-4 space-y-4 text-sm">
                {profile.location && (
                  <p className="flex items-start gap-3"><MapPin size={20} className={`shrink-0 ${secondaryText}`} /><span>Vive en <strong>{profile.location}</strong></span></p>
                )}
                {profile.birth_date && (
                  <p className="flex items-start gap-3"><Cake size={20} className={`shrink-0 ${secondaryText}`} /><span>Nació el <strong>{formatProfileDate(profile.birth_date)}</strong></span></p>
                )}
                {profile.phone && (
                  <p className="flex items-start gap-3"><Phone size={20} className={`shrink-0 ${secondaryText}`} /><strong>{profile.phone}</strong></p>
                )}
                {!hasPublicDetails && <p className={secondaryText}>No hay más detalles públicos.</p>}
              </div>
            </section>

            <section className={`rounded-xl border p-5 ${cardClass}`}>
              <h2 className="flex items-center gap-2 text-lg font-black"><Link2 size={19} className="text-[#FF4D88]" />Redes sociales</h2>
              {socialLinks}
            </section>
          </div>
        )}
        </div>
      </div>

      {currentUser && String(currentUser.id) === id && <span className="sr-only">Este es tu perfil.</span>}
    </main>
  );
};
