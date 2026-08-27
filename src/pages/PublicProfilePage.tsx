import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Cake, CalendarDays, Check, Edit3, Image as ImageIcon, Link2, Loader2, MapPin, MessageCircle, Phone, User, UserPlus, Video } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { getStoredToken, getStoredUser } from '../services/authService';
import { respondFriendRequest, sendFriendRequest } from '../services/friendsService';
import { getPublicProfile, openChat, type PublicProfile } from '../services/socialService';

const SOCIAL_LABELS: Record<string, string> = {
  facebook: 'Facebook', twitter: 'X / Twitter', instagram: 'Instagram', discord: 'Discord',
  whatsapp: 'WhatsApp', telegram: 'Telegram', youtube: 'YouTube', github: 'GitHub',
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
    : new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(date);
};

export const PublicProfilePage = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const currentUser = getStoredUser();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setProfile(await getPublicProfile(id));
      setError('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo cargar este perfil.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const links = useMemo(() => profile
    ? Object.entries(profile.social_links).filter(([, value]) => Boolean(value?.trim()))
    : [], [profile]);

  const handleRelationship = async () => {
    if (!profile || working) return;
    if (!getStoredToken()) {
      navigate('/auth/login', { state: { returnTo: `/usuarios/${profile.id}` } });
      return;
    }
    if (profile.friendship_status === 'self') { navigate('/perfil'); return; }
    if (profile.friendship_status === 'friends') { openChat(profile); return; }
    setWorking(true);
    try {
      if (profile.friendship_status === 'pending_received') await respondFriendRequest(profile.friend_request_id, 'accept');
      else if (profile.friendship_status === 'none' || profile.friendship_status === 'guest') await sendFriendRequest(profile.id);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo completar la solicitud.');
    } finally {
      setWorking(false);
    }
  };

  if (loading) return <div className={`flex min-h-screen items-center justify-center pt-24 ${isLight ? 'bg-white text-black' : 'bg-black text-white'}`}><Loader2 size={26} className="animate-spin text-[#FF4D88]" /></div>;
  if (!profile) return <div className={`flex min-h-screen flex-col items-center justify-center gap-4 px-6 pt-24 text-center ${isLight ? 'bg-white text-black' : 'bg-black text-white'}`}><User size={42} className="text-[#FF4D88]" /><h1 className="text-xl font-black">Perfil no disponible</h1><p className={isLight ? 'text-black/50' : 'text-white/45'}>{error || 'El usuario no existe.'}</p><Link to="/" className="rounded-xl bg-[#FF4D88] px-5 py-3 text-xs font-black text-white">Volver al inicio</Link></div>;

  const joined = new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric' }).format(new Date(profile.created_at));
  const buttonText = profile.friendship_status === 'self' ? 'Editar mi perfil'
    : profile.friendship_status === 'friends' ? 'Enviar mensaje'
      : profile.friendship_status === 'pending_sent' ? 'Solicitud enviada'
        : profile.friendship_status === 'pending_received' ? 'Aceptar solicitud'
          : 'Agregar amigo';

  return (
    <main className={`min-h-screen pb-24 pt-20 transition-colors ${isLight ? 'bg-white text-black' : 'bg-black text-white'}`}>
      <section className={`relative h-52 overflow-hidden md:h-72 ${profile.banner_url ? '' : profile.banner_color}`}>
        {profile.banner_url && <img src={profile.banner_url} alt="" className="h-full w-full object-cover" />}
        <div className={`absolute inset-0 bg-gradient-to-t ${isLight ? 'from-white via-transparent' : 'from-black via-transparent'} to-transparent`} />
      </section>

      <div className="mx-auto -mt-16 max-w-5xl px-5 md:-mt-20">
        <section className={`relative rounded-3xl border p-5 shadow-2xl md:p-8 ${isLight ? 'border-black/10 bg-white' : 'border-white/10 bg-[#070707]'}`}>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
            <div className={`h-32 w-32 shrink-0 overflow-hidden rounded-3xl border-[6px] md:h-40 md:w-40 ${isLight ? 'border-white bg-zinc-100' : 'border-black bg-zinc-900'}`}>
              {profile.avatar_url ? <img src={profile.avatar_url} alt={`Avatar de ${profile.username}`} className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center"><User size={54} className={isLight ? 'text-black/20' : 'text-white/20'} /></span>}
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <div className="flex flex-wrap items-center gap-2"><h1 className="break-words text-3xl font-black tracking-tight md:text-4xl">{profile.username}</h1>{profile.is_pro && <span className="rounded-full bg-[#FF4D88]/15 px-3 py-1 text-[9px] font-black text-[#FF4D88]">MUKAI PRO</span>}</div>
              <div className={`mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs ${isLight ? 'text-black/50' : 'text-white/45'}`}>
                {profile.location && <span className="flex items-center gap-1.5"><MapPin size={14} className="text-[#FF4D88]" />{profile.location}</span>}
                {profile.birth_date && <span className="flex items-center gap-1.5"><Cake size={14} className="text-[#FF4D88]" />{formatProfileDate(profile.birth_date)}</span>}
                {profile.phone && <span className="flex items-center gap-1.5"><Phone size={14} className="text-[#FF4D88]" />{profile.phone}</span>}
                <span className="flex items-center gap-1.5"><CalendarDays size={14} className="text-[#FF4D88]" />Miembro desde {joined}</span>
              </div>
            </div>
            <button type="button" onClick={() => void handleRelationship()} disabled={working || profile.friendship_status === 'pending_sent'} className={`flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl px-5 text-xs font-black transition-all disabled:opacity-55 ${profile.friendship_status === 'friends' ? isLight ? 'bg-black text-white' : 'bg-white text-black' : 'bg-[#FF4D88] text-white hover:bg-[#ff347b]'}`}>
              {working ? <Loader2 size={16} className="animate-spin" /> : profile.friendship_status === 'self' ? <Edit3 size={16} /> : profile.friendship_status === 'friends' ? <MessageCircle size={17} /> : profile.friendship_status === 'pending_sent' ? <Check size={16} /> : <UserPlus size={17} />}
              {buttonText}
            </button>
          </div>

          {error && <p className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-400">{error}</p>}

          <div className="mt-8 grid gap-5 md:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.6fr)]">
            <article className={`rounded-2xl border p-5 ${isLight ? 'border-black/10 bg-zinc-50' : 'border-white/10 bg-black'}`}>
              <h2 className="text-sm font-black">Sobre {profile.username}</h2>
              <p className={`mt-3 whitespace-pre-wrap text-sm leading-7 ${isLight ? 'text-black/65' : 'text-white/60'}`}>{profile.bio || 'Este lector todavía no agregó una descripción.'}</p>
            </article>
            <aside className={`rounded-2xl border p-5 ${isLight ? 'border-black/10 bg-zinc-50' : 'border-white/10 bg-black'}`}>
              <h2 className="flex items-center gap-2 text-sm font-black"><Link2 size={16} className="text-[#FF4D88]" />Redes y enlaces</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {links.length === 0 ? <p className={`text-xs ${isLight ? 'text-black/45' : 'text-white/40'}`}>Sin enlaces públicos.</p> : links.map(([key, value]) => key === 'discord' && !value.startsWith('http')
                  ? <span key={key} className={`rounded-lg border px-3 py-2 text-xs font-bold ${isLight ? 'border-black/10' : 'border-white/10'}`}>{SOCIAL_LABELS[key]}: {value}</span>
                  : <a key={key} href={value} target="_blank" rel="noreferrer" className={`rounded-lg border px-3 py-2 text-xs font-bold transition-colors hover:border-[#FF4D88] hover:text-[#FF4D88] ${isLight ? 'border-black/10' : 'border-white/10'}`}>{SOCIAL_LABELS[key] || key}</a>)}
              </div>
            </aside>
          </div>

          <section className="mt-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-black">Publicaciones</h2>
              <span className={`text-[11px] font-bold ${isLight ? 'text-black/40' : 'text-white/35'}`}>{profile.posts?.length || 0}</span>
            </div>
            {!profile.posts?.length ? (
              <div className={`rounded-2xl border px-5 py-9 text-center ${isLight ? 'border-black/10 bg-zinc-50' : 'border-white/10 bg-black'}`}>
                <ImageIcon size={25} className="mx-auto text-[#FF4D88]/60" />
                <p className={`mt-3 text-xs font-bold ${isLight ? 'text-black/45' : 'text-white/40'}`}>Este perfil todavía no tiene publicaciones.</p>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {profile.posts.map((post) => (
                  <article key={post.id} className={`overflow-hidden rounded-2xl border ${isLight ? 'border-black/10 bg-white' : 'border-white/10 bg-black'}`}>
                    <header className="flex items-center gap-3 p-4">
                      <div className={`h-10 w-10 overflow-hidden rounded-full ${isLight ? 'bg-zinc-100' : 'bg-zinc-900'}`}>
                        {post.author.avatar_url
                          ? <img src={post.author.avatar_url} alt="" className="h-full w-full object-cover" />
                          : <User size={18} className={`m-auto mt-2.5 ${isLight ? 'text-black/25' : 'text-white/25'}`} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black">{post.author.username}</p>
                        <p className={`text-[10px] ${isLight ? 'text-black/40' : 'text-white/35'}`}>{formatPostDate(post.created_at)}</p>
                      </div>
                      {post.media_type === 'video' ? <Video size={16} className="text-[#FF4D88]" /> : post.media_type === 'image' ? <ImageIcon size={16} className="text-[#FF4D88]" /> : null}
                    </header>
                    {post.content && <p className={`whitespace-pre-wrap px-4 pb-4 text-sm leading-6 ${isLight ? 'text-black/70' : 'text-white/65'}`}>{post.content}</p>}
                    {post.media_url && post.media_type === 'video' && <video controls preload="metadata" src={post.media_url} className="max-h-[420px] w-full bg-black object-contain" />}
                    {post.media_url && post.media_type === 'image' && <img src={post.media_url} alt="Publicación" loading="lazy" className="max-h-[420px] w-full object-cover" />}
                  </article>
                ))}
              </div>
            )}
          </section>
        </section>
      </div>
      {currentUser && String(currentUser.id) === id && <span className="sr-only">Este es tu perfil.</span>}
    </main>
  );
};
