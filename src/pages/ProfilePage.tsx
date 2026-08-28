import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ProfileMotionBackdrop, type ProfileBackdropCover } from '../components/social';
import {
  Cake,
  CalendarDays,
  Camera,
  Check,
  Edit3,
  Eye,
  EyeOff,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
  Save,
  Send,
  User,
  UserMinus,
  Users,
  Video,
  X,
} from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { getStoredToken, getStoredUser } from '../services/authService';
import { getUltimosCapitulos } from '../services/mangaService';
import {
  emptyFriendsOverview,
  getFriendsOverview,
  removeFriend,
  respondFriendRequest,
  type FriendEntry,
  type FriendsOverview,
} from '../services/friendsService';
import { openChat } from '../services/socialService';
import {
  createProfilePost,
  getProfilePosts,
  uploadProfilePostMedia,
  type ProfilePost,
} from '../services/profilePostService';
import { finishGlobalLoading, startGlobalLoading } from '../utils/globalLoading';
import {
  emptySocialLinks,
  getWordPressProfile,
  saveWordPressProfile,
  uploadWordPressProfileImage,
  type ProfileSocialLinks,
  type WordPressProfile,
} from '../services/wordpressService';

const BANNER_COLORS = ['bg-[#FF4D88]', 'bg-black', 'bg-zinc-800', 'bg-[#5865F2]', 'bg-[#7C3AED]', 'bg-[#0EA5E9]', 'bg-[#16A34A]'];
const SOCIAL_FIELDS: Array<{ key: keyof ProfileSocialLinks; label: string; placeholder: string }> = [
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/...' },
  { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/...' },
  { key: 'twitter', label: 'X / Twitter', placeholder: 'https://x.com/...' },
  { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@...' },
  { key: 'telegram', label: 'Telegram', placeholder: 'https://t.me/...' },
  { key: 'whatsapp', label: 'WhatsApp', placeholder: 'https://wa.me/...' },
  { key: 'github', label: 'GitHub', placeholder: 'https://github.com/...' },
  { key: 'discord', label: 'Discord', placeholder: 'Usuario o enlace de Discord' },
];

const fallbackProfile = (username = '', avatar = ''): WordPressProfile => ({
  username,
  bio: '',
  location: '',
  birth_date: '',
  country_code: '+51',
  phone: '',
  show_birth_date: false,
  show_phone: false,
  avatar_url: avatar,
  banner_url: '',
  banner_color: 'bg-[#FF4D88]',
  is_pro: false,
  created_at: new Date().toISOString(),
  social_links: emptySocialLinks(),
});

const formatProfileDate = (value = '') => {
  if (!value) return 'Sin configurar';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'long', year: 'numeric' }).format(date);
};

const formatPostDate = (value = '') => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Ahora';
  return new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date);
};

const buildProfileCovers = (items: Awaited<ReturnType<typeof getUltimosCapitulos>>): ProfileBackdropCover[] => {
  const seen = new Set<string>();
  return items.reduce<ProfileBackdropCover[]>((result, manga) => {
    const id = manga.eroSeri || manga.id;
    const key = String(id);
    if (!id || seen.has(key) || !manga.portada) return result;
    seen.add(key);
    result.push({
      id,
      title: manga.titulo,
      cover: manga.portada,
    });
    return result;
  }, []).slice(0, 10);
};

const UserAvatar = ({ entry, size = 'h-10 w-10' }: { entry: FriendEntry; size?: string }) => entry.user.avatar_url
  ? <img src={entry.user.avatar_url} alt="" className={`${size} shrink-0 rounded-full object-cover ring-2 ring-[#FF4D88]/25`} />
  : <span className={`${size} flex shrink-0 items-center justify-center rounded-full bg-[#FF4D88] text-sm font-black text-white`}>{entry.user.username.charAt(0).toUpperCase()}</span>;

type ProfileSection = 'summary' | 'information' | 'friends';
type PostMedia = { url: string; kind: 'image' | 'video'; name: string; file: File };

export const ProfilePage = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [profile, setProfile] = useState<WordPressProfile>(() => fallbackProfile());
  const [friends, setFriends] = useState<FriendsOverview>(() => emptyFriendsOverview());
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageType, setImageType] = useState<'avatar' | 'banner' | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [actionId, setActionId] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState<ProfileSection>('summary');
  const [postText, setPostText] = useState('');
  const [postMedia, setPostMedia] = useState<PostMedia | null>(null);
  const [posts, setPosts] = useState<ProfilePost[]>([]);
  const [backgroundCovers, setBackgroundCovers] = useState<ProfileBackdropCover[]>([]);
  const [publishing, setPublishing] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);
  const postImageRef = useRef<HTMLInputElement>(null);
  const postVideoRef = useRef<HTMLInputElement>(null);
  const postMediaUrlsRef = useRef(new Set<string>());
  const user = useMemo(() => getStoredUser(), []);

  useEffect(() => {
    if (!user || !getStoredToken()) {
      navigate('/auth/login', { replace: true, state: { returnTo: '/perfil' } });
      return;
    }
    let active = true;
    const loadingScope = 'profile-page';
    startGlobalLoading(12, loadingScope);
    Promise.all([
      getWordPressProfile(user),
      getFriendsOverview().catch(() => emptyFriendsOverview()),
      getProfilePosts(user.id).catch(() => []),
      getUltimosCapitulos().then(buildProfileCovers).catch(() => []),
    ]).then(([loadedProfile, loadedFriends, loadedPosts, loadedBackgroundCovers]) => {
      if (!active) return;
      setProfile(loadedProfile);
      setFriends(loadedFriends);
      setPosts(loadedPosts);
      setBackgroundCovers(loadedBackgroundCovers);
    }).catch(() => {
      if (!active) return;
      setProfile(fallbackProfile(user.username, user.avatar || ''));
      setFriends(emptyFriendsOverview());
      setNotice({ type: 'error', text: 'No se pudo sincronizar el perfil.' });
    }).finally(() => {
      if (!active) return;
      setLoading(false);
      finishGlobalLoading(loadingScope);
    });
    return () => {
      active = false;
      finishGlobalLoading(loadingScope);
    };
  }, [navigate, user]);

  useEffect(() => () => {
    postMediaUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    postMediaUrlsRef.current.clear();
  }, []);

  const reloadFriends = async () => setFriends(await getFriendsOverview());

  const handleImage = async (event: ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const field = type === 'avatar' ? 'avatar_url' : 'banner_url';
    const previous = profile[field];
    const preview = URL.createObjectURL(file);
    setProfile((current) => ({ ...current, [field]: preview }));
    setImageType(type);
    setNotice(null);
    try {
      const result = await uploadWordPressProfileImage(file, type);
      if (!result.success) throw new Error(result.message);
      setProfile((current) => ({ ...current, [field]: result.url }));
      setNotice({ type: 'success', text: type === 'avatar' ? 'Foto actualizada en todo MangaMukai.' : 'Portada actualizada.' });
    } catch (caught) {
      setProfile((current) => ({ ...current, [field]: previous }));
      setNotice({ type: 'error', text: caught instanceof Error ? caught.message : 'No se pudo subir la imagen.' });
    } finally {
      URL.revokeObjectURL(preview);
      setImageType(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setNotice(null);
    try {
      const result = await saveWordPressProfile(profile);
      if (!result.success) throw new Error(result.message);
      setEditing(false);
      setNotice({ type: 'success', text: 'Perfil guardado y sincronizado.' });
    } catch (caught) {
      setNotice({ type: 'error', text: caught instanceof Error ? caught.message : 'No se pudo guardar el perfil.' });
    } finally {
      setSaving(false);
    }
  };

  const handleRequest = async (requestId: number, action: 'accept' | 'reject') => {
    setActionId(requestId);
    setNotice(null);
    try {
      await respondFriendRequest(requestId, action);
      await reloadFriends();
      setNotice({ type: 'success', text: action === 'accept' ? 'Solicitud aceptada. Ya pueden conversar.' : 'Solicitud rechazada.' });
    } catch (caught) {
      setNotice({ type: 'error', text: caught instanceof Error ? caught.message : 'No se pudo responder.' });
    } finally {
      setActionId(null);
    }
  };

  const handleRemove = async (entry: FriendEntry) => {
    if (!window.confirm(`¿Eliminar a ${entry.user.username} de tus amigos?`)) return;
    setActionId(entry.user.id);
    try {
      await removeFriend(entry.user.id);
      await reloadFriends();
    } catch (caught) {
      setNotice({ type: 'error', text: caught instanceof Error ? caught.message : 'No se pudo eliminar la amistad.' });
    } finally {
      setActionId(null);
    }
  };

  const handlePostMedia = (event: ChangeEvent<HTMLInputElement>, kind: PostMedia['kind']) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (postMedia) {
      URL.revokeObjectURL(postMedia.url);
      postMediaUrlsRef.current.delete(postMedia.url);
    }

    const url = URL.createObjectURL(file);
    postMediaUrlsRef.current.add(url);
    setPostMedia({ url, kind, name: file.name, file });
  };

  const clearPostMedia = () => {
    if (!postMedia) return;
    URL.revokeObjectURL(postMedia.url);
    postMediaUrlsRef.current.delete(postMedia.url);
    setPostMedia(null);
  };

  const publishPost = async () => {
    const text = postText.trim();
    if ((!text && !postMedia) || publishing) return;
    setPublishing(true);
    setNotice(null);
    try {
      const uploaded = postMedia ? await uploadProfilePostMedia(postMedia.file) : null;
      const created = await createProfilePost(text, uploaded?.id);
      setPosts((current) => [created, ...current]);
      setPostText('');
      clearPostMedia();
    } catch (caught) {
      setNotice({ type: 'error', text: caught instanceof Error ? caught.message : 'No se pudo publicar.' });
    } finally {
      setPublishing(false);
    }
  };

  if (loading) return <main className={`min-h-screen ${isLight ? 'bg-[#f0f2f5]' : 'bg-[#18191a]'}`} />;

  const muted = isLight ? 'text-black/50' : 'text-white/45';
  const input = isLight ? 'border-black/10 bg-[#f0f2f5] text-black placeholder:text-black/30' : 'border-white/10 bg-white/[0.05] text-white placeholder:text-white/25';
  const card = isLight
    ? 'border-black/[0.08] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.12)]'
    : 'border-white/[0.08] bg-[#242526] shadow-[0_1px_2px_rgba(0,0,0,0.45)]';
  const joined = new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric' }).format(new Date(profile.created_at));

  return (
    <main className={`min-h-screen pb-24 transition-colors ${isLight ? 'bg-[#f0f2f5] text-[#1c1e21]' : 'bg-[#18191a] text-white'}`}>
      <section className={`border-b ${isLight ? 'border-black/[0.08] bg-white' : 'border-white/[0.08] bg-[#242526]'}`}>
        <div className="mx-auto w-full max-w-6xl">
          <div className={`relative h-56 overflow-hidden rounded-b-2xl sm:h-72 md:h-[360px] ${profile.banner_color}`}>
            {profile.banner_url && <img src={profile.banner_url} alt="Portada de tu perfil" className="absolute inset-0 h-full w-full object-cover" />}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/5" />

            {editing && (
              <div className="absolute bottom-4 right-4 flex max-w-[calc(100%-2rem)] flex-col items-end gap-2">
                <div className={`flex flex-wrap justify-end gap-2 rounded-xl border p-2 shadow-xl backdrop-blur-md ${isLight ? 'border-black/10 bg-white/85' : 'border-white/10 bg-black/75'}`} aria-label="Colores de portada">
                  {BANNER_COLORS.map((color) => (
                    <button key={color} type="button" aria-label="Elegir color de portada" onClick={() => setProfile((current) => ({ ...current, banner_color: color }))} className={`h-7 w-7 rounded-full border-2 transition-transform ${color} ${profile.banner_color === color ? 'scale-110 border-[#FF4D88]' : isLight ? 'border-black/10' : 'border-white/20'}`} />
                  ))}
                </div>
                <button type="button" onClick={() => bannerRef.current?.click()} disabled={imageType === 'banner'} className="flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-[11px] font-black text-black shadow-lg transition hover:bg-zinc-100 disabled:opacity-60">
                  {imageType === 'banner' ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                  Cambiar portada
                </button>
                <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={(event) => void handleImage(event, 'banner')} />
              </div>
            )}
          </div>

          <div className="px-4 sm:px-6">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-5">
              <div className="group relative -mt-16 shrink-0 sm:-mt-10">
                <div className={`h-32 w-32 overflow-hidden rounded-full border-[5px] shadow-lg sm:h-40 sm:w-40 ${isLight ? 'border-white bg-zinc-100' : 'border-[#242526] bg-zinc-900'}`}>
                  {profile.avatar_url ? <img src={profile.avatar_url} alt="Tu avatar" className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center"><User size={52} className={isLight ? 'text-black/20' : 'text-white/20'} /></span>}
                </div>
                <button type="button" onClick={() => avatarRef.current?.click()} disabled={imageType === 'avatar'} aria-label="Cambiar foto de perfil" className={`absolute bottom-1 right-1 flex h-10 w-10 items-center justify-center rounded-full border shadow-md transition hover:bg-[#FF4D88] hover:text-white ${isLight ? 'border-white bg-[#e4e6eb] text-black' : 'border-[#242526] bg-[#3a3b3c] text-white'}`}>{imageType === 'avatar' ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}</button>
                <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={(event) => void handleImage(event, 'avatar')} />
              </div>

              <div className="flex min-w-0 flex-1 flex-col items-center gap-4 pb-1 text-center sm:-translate-y-3 sm:flex-row sm:items-center sm:justify-between sm:text-left">
                <div className="min-w-0">
                  {editing ? <input value={profile.username} maxLength={60} onChange={(event) => setProfile((current) => ({ ...current, username: event.target.value }))} className={`w-full max-w-xl rounded-lg border px-4 py-3 text-2xl font-black outline-none focus:border-[#FF4D88]/60 ${input}`} /> : <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start"><h1 className="break-words text-3xl font-black tracking-[-0.035em] md:text-4xl">{profile.username}</h1>{profile.is_pro && <span className="rounded bg-yellow-400 px-2 py-1 text-[9px] font-black text-black">MUKAI PRO</span>}</div>}
                  <div className={`mt-2 flex flex-wrap items-center justify-center gap-3 text-xs font-semibold sm:justify-start ${muted}`}>
                    <span className="flex items-center gap-1.5"><CalendarDays size={14} className="text-[#FF4D88]" />Miembro desde {joined}</span>
                    <span>{friends.friends.length} {friends.friends.length === 1 ? 'amigo' : 'amigos'}</span>
                    <span className="flex items-center gap-1.5"><MapPin size={14} />{profile.location || 'Ubicación sin configurar'}</span>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  {editing && <button type="button" onClick={() => { setEditing(false); if (user) void getWordPressProfile(user).then(setProfile); }} className={`flex h-10 items-center gap-2 rounded-lg border px-4 text-xs font-bold ${isLight ? 'border-black/10 bg-[#e4e6eb] hover:bg-[#d8dadf]' : 'border-white/10 bg-[#3a3b3c] hover:bg-[#4e4f50]'}`}><X size={16} />Cancelar</button>}
                  <button type="button" onClick={() => { if (editing) void handleSave(); else { setEditing(true); setActiveSection('information'); } }} disabled={saving} className="flex h-10 items-center gap-2 rounded-lg bg-[#FF4D88] px-5 text-xs font-black text-white transition-colors hover:bg-[#e93b78] disabled:opacity-50">{saving ? <Loader2 size={16} className="animate-spin" /> : editing ? <Save size={16} /> : <Edit3 size={16} />}{editing ? 'Guardar' : 'Editar perfil'}</button>
                </div>
              </div>
            </div>

            <div className={`mt-5 flex min-h-14 items-stretch justify-center gap-1 overflow-x-auto border-t sm:justify-start ${isLight ? 'border-black/10' : 'border-white/10'}`} aria-label="Secciones del perfil">
              <button type="button" onClick={() => setActiveSection('summary')} aria-current={activeSection === 'summary' ? 'page' : undefined} className={`flex shrink-0 items-center border-b-[3px] px-4 text-sm font-bold transition-colors ${activeSection === 'summary' ? 'border-[#FF4D88] text-[#FF4D88]' : `border-transparent ${muted} hover:text-[#FF4D88]`}`}>Resumen</button>
              <button type="button" onClick={() => setActiveSection('information')} aria-current={activeSection === 'information' ? 'page' : undefined} className={`flex shrink-0 items-center border-b-[3px] px-4 text-sm font-bold transition-colors ${activeSection === 'information' ? 'border-[#FF4D88] text-[#FF4D88]' : `border-transparent ${muted} hover:text-[#FF4D88]`}`}>Información</button>
              <button type="button" onClick={() => setActiveSection('friends')} aria-current={activeSection === 'friends' ? 'page' : undefined} className={`flex shrink-0 items-center border-b-[3px] px-4 text-sm font-bold transition-colors ${activeSection === 'friends' ? 'border-[#FF4D88] text-[#FF4D88]' : `border-transparent ${muted} hover:text-[#FF4D88]`}`}>Amigos <span className="ml-2 rounded-full bg-[#FF4D88]/10 px-2 py-0.5 text-[10px] text-[#FF4D88]">{friends.friends.length}</span></button>
            </div>
          </div>
        </div>
      </section>

      <div className="relative isolate min-h-[680px] overflow-hidden">
        <ProfileMotionBackdrop covers={backgroundCovers} isLight={isLight} />
        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        {notice && <p className={`mb-5 rounded-lg border px-4 py-3 text-xs font-semibold ${notice.type === 'success' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500' : 'border-red-500/20 bg-red-500/10 text-red-400'}`}>{notice.text}</p>}

        {activeSection === 'summary' && (
          <div className="mx-auto max-w-3xl">
            <div className="space-y-4">
            <section className={`rounded-xl border p-4 ${card}`} aria-labelledby="profile-composer-title">
              <h2 id="profile-composer-title" className="sr-only">Crear publicación</h2>
              <div className="flex items-start gap-3">
                <div className={`h-11 w-11 shrink-0 overflow-hidden rounded-full ${isLight ? 'bg-[#e4e6eb]' : 'bg-[#3a3b3c]'}`}>
                  {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center"><User size={19} className={muted} /></span>}
                </div>
                <textarea value={postText} maxLength={1500} onChange={(event) => setPostText(event.target.value)} placeholder={`¿Qué estás pensando, ${profile.username || 'lector'}?`} className={`min-h-11 w-full resize-none rounded-[22px] border-0 px-4 py-3 text-sm leading-5 outline-none ring-[#FF4D88]/40 transition focus:ring-2 ${isLight ? 'bg-[#f0f2f5] text-black placeholder:text-black/45' : 'bg-[#3a3b3c] text-white placeholder:text-white/50'}`} />
              </div>

              {postMedia && (
                <div className={`relative mt-4 overflow-hidden rounded-xl border ${isLight ? 'border-black/10 bg-black/[0.03]' : 'border-white/10 bg-black/20'}`}>
                  {postMedia.kind === 'image'
                    ? <img src={postMedia.url} alt="Vista previa de la publicación" className="max-h-[420px] w-full object-contain" />
                    : <video src={postMedia.url} controls preload="metadata" className="max-h-[420px] w-full bg-black object-contain" />}
                  <button type="button" onClick={clearPostMedia} aria-label="Quitar archivo" className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/65 text-white backdrop-blur-sm hover:bg-black"><X size={17} /></button>
                  <span className="absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)] truncate rounded-full bg-black/65 px-3 py-1 text-[9px] font-bold text-white backdrop-blur-sm">{postMedia.name}</span>
                </div>
              )}

              <input ref={postImageRef} type="file" accept="image/*" className="hidden" onChange={(event) => handlePostMedia(event, 'image')} />
              <input ref={postVideoRef} type="file" accept="video/*" className="hidden" onChange={(event) => handlePostMedia(event, 'video')} />

              <div className={`mt-4 grid grid-cols-[1fr_1fr_auto] items-center gap-1 border-t pt-3 ${isLight ? 'border-black/10' : 'border-white/10'}`}>
                <button type="button" onClick={() => postImageRef.current?.click()} className={`flex h-11 items-center justify-center gap-2 rounded-lg text-xs font-bold transition ${isLight ? 'hover:bg-[#f0f2f5]' : 'hover:bg-[#3a3b3c]'}`}><ImageIcon size={19} className="text-emerald-500" /> Foto</button>
                <button type="button" onClick={() => postVideoRef.current?.click()} className={`flex h-11 items-center justify-center gap-2 rounded-lg text-xs font-bold transition ${isLight ? 'hover:bg-[#f0f2f5]' : 'hover:bg-[#3a3b3c]'}`}><Video size={19} className="text-[#FF4D88]" /> Video</button>
                <button type="button" onClick={() => void publishPost()} disabled={publishing || (!postText.trim() && !postMedia)} className="flex h-10 items-center gap-2 rounded-lg bg-[#FF4D88] px-4 text-xs font-black text-white transition hover:bg-[#e93b78] disabled:cursor-not-allowed disabled:opacity-35">{publishing ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} <span className="hidden sm:inline">{publishing ? 'Publicando' : 'Publicar'}</span></button>
              </div>
            </section>

            {posts.map((post) => (
              <article key={post.id} className={`overflow-hidden rounded-xl border ${card}`}>
                <div className="flex items-center gap-3 p-4">
                  <div className={`h-11 w-11 shrink-0 overflow-hidden rounded-full ${isLight ? 'bg-[#e4e6eb]' : 'bg-[#3a3b3c]'}`}>
                    {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center"><User size={19} className={muted} /></span>}
                  </div>
                  <div><h3 className="text-sm font-black">{post.author?.username || profile.username}</h3><time dateTime={post.created_at} className={`text-[10px] ${muted}`}>{formatPostDate(post.created_at)} · Perfil Mukai</time></div>
                </div>
                {post.content && <p className="whitespace-pre-wrap px-4 pb-4 text-sm leading-6">{post.content}</p>}
                {post.media_url && (post.media_type === 'image'
                  ? <img src={post.media_url} alt="Contenido de la publicación" className="max-h-[620px] w-full border-t border-current/10 object-contain" />
                  : <video src={post.media_url} controls preload="metadata" className="max-h-[620px] w-full border-t border-current/10 bg-black object-contain" />)}
                <div className={`mx-4 flex h-10 items-center border-t text-[10px] font-semibold ${muted} ${isLight ? 'border-black/10' : 'border-white/10'}`}>Publicado en tu perfil</div>
              </article>
            ))}

            {posts.length === 0 && <div className={`rounded-xl border border-dashed py-12 text-center ${isLight ? 'border-black/15 bg-white/45' : 'border-white/15 bg-white/[0.025]'}`}><ImageIcon size={30} className={`mx-auto mb-3 ${isLight ? 'text-black/15' : 'text-white/15'}`} /><p className="text-sm font-bold">Comparte tu primera actualización</p><p className={`mt-1 text-xs ${muted}`}>Publica una idea, una imagen o un video para tu comunidad.</p></div>}
            </div>

          </div>
        )}

        {activeSection === 'information' && (
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]">
            <article className={`rounded-xl border p-5 ${card}`}>
              <h2 className="text-xl font-black tracking-tight">Presentación</h2>
              {editing ? <><input value={profile.location} maxLength={80} onChange={(event) => setProfile((current) => ({ ...current, location: event.target.value }))} placeholder="Ciudad o país" className={`mt-4 w-full rounded-lg border px-4 py-3 text-sm outline-none focus:border-[#FF4D88]/60 ${input}`} /><textarea value={profile.bio} maxLength={800} onChange={(event) => setProfile((current) => ({ ...current, bio: event.target.value }))} placeholder="Cuéntale a la comunidad qué mangas te gustan..." className={`mt-3 min-h-36 w-full resize-none rounded-lg border px-4 py-3 text-sm leading-6 outline-none focus:border-[#FF4D88]/60 ${input}`} /></> : <p className={`mt-3 whitespace-pre-wrap text-sm leading-6 ${isLight ? 'text-black/70' : 'text-white/70'}`}>{profile.bio || 'Añade una descripción para que otros lectores te conozcan.'}</p>}
              {!editing && profile.location && <p className={`mt-4 flex items-center gap-2 text-sm ${muted}`}><MapPin size={17} /> Vive en <strong className={isLight ? 'text-black' : 'text-white'}>{profile.location}</strong></p>}
            </article>

            <article className={`rounded-xl border p-5 ${card}`}>
              <div className="flex items-center justify-between"><h2 className="text-xl font-black tracking-tight">Redes sociales</h2><ExternalLink size={18} className="text-[#FF4D88]" /></div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {SOCIAL_FIELDS.map((field) => editing ? (
                  <label key={field.key} className="block"><span className={`mb-1.5 block text-[10px] font-bold ${muted}`}>{field.label}</span><input value={profile.social_links[field.key]} onChange={(event) => setProfile((current) => ({ ...current, social_links: { ...current.social_links, [field.key]: event.target.value } }))} placeholder={field.placeholder} className={`w-full rounded-lg border px-3 py-2.5 text-xs outline-none focus:border-[#FF4D88]/60 ${input}`} /></label>
                ) : profile.social_links[field.key] ? (
                  field.key === 'discord' && !profile.social_links[field.key].startsWith('http')
                    ? <span key={field.key} className={`rounded-lg px-3 py-2.5 text-xs font-bold ${isLight ? 'bg-[#f0f2f5]' : 'bg-[#3a3b3c]'}`}>{field.label}: {profile.social_links[field.key]}</span>
                    : <a key={field.key} href={profile.social_links[field.key]} target="_blank" rel="noreferrer" className={`rounded-lg px-3 py-2.5 text-xs font-bold transition-colors hover:text-[#FF4D88] ${isLight ? 'bg-[#f0f2f5]' : 'bg-[#3a3b3c]'}`}>{field.label}</a>
                ) : null)}
                {!editing && !Object.values(profile.social_links).some(Boolean) && <p className={`text-xs ${muted}`}>Todavía no agregaste redes sociales.</p>}
              </div>
            </article>

            <article className={`rounded-xl border p-5 lg:col-span-2 ${card}`}>
              <h2 className="text-xl font-black tracking-tight">Datos de registro</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className={`rounded-xl border p-4 ${isLight ? 'border-black/10 bg-[#f7f8fa]' : 'border-white/10 bg-black/20'}`}>
                  <div className="flex items-center gap-2"><Cake size={18} className="text-[#FF4D88]" /><h3 className="text-sm font-black">Fecha de nacimiento</h3></div>
                  {editing ? <input type="date" min="1900-01-01" max={new Date().toISOString().slice(0, 10)} value={profile.birth_date} onChange={(event) => setProfile((current) => ({ ...current, birth_date: event.target.value }))} className={`mt-3 h-11 w-full rounded-lg border px-3 text-sm outline-none focus:border-[#FF4D88]/60 ${input}`} /> : <div className="mt-3 flex items-center gap-2"><p className={`text-sm font-semibold ${profile.birth_date ? '' : muted}`}>{formatProfileDate(profile.birth_date)}</p>{profile.show_birth_date ? <Eye size={15} aria-label="Visible en el perfil" className="text-emerald-500" /> : <EyeOff size={15} aria-label="Oculto en el perfil" className={muted} />}</div>}
                  {editing && <button type="button" onClick={() => setProfile((current) => ({ ...current, show_birth_date: !current.show_birth_date }))} className={`mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors ${profile.show_birth_date ? 'bg-[#FF4D88] text-white' : isLight ? 'bg-[#e4e6eb] text-black hover:bg-[#d8dadf]' : 'bg-[#3a3b3c] text-white hover:bg-[#4e4f50]'}`}>{profile.show_birth_date ? <EyeOff size={14} /> : <Eye size={14} />}{profile.show_birth_date ? 'Ocultar del perfil' : 'Mostrar en perfil'}</button>}
                </div>

                <div className={`rounded-xl border p-4 ${isLight ? 'border-black/10 bg-[#f7f8fa]' : 'border-white/10 bg-black/20'}`}>
                  <div className="flex items-center gap-2"><Phone size={18} className="text-[#FF4D88]" /><h3 className="text-sm font-black">Teléfono</h3></div>
                  {editing ? <div className="mt-3 grid grid-cols-[82px_minmax(0,1fr)] gap-2"><input value={profile.country_code} maxLength={5} onChange={(event) => setProfile((current) => ({ ...current, country_code: event.target.value }))} aria-label="Código de país" className={`h-11 rounded-lg border px-3 text-sm outline-none focus:border-[#FF4D88]/60 ${input}`} /><input type="tel" inputMode="tel" value={profile.phone} maxLength={15} onChange={(event) => setProfile((current) => ({ ...current, phone: event.target.value.replace(/\D/g, '') }))} aria-label="Teléfono" className={`h-11 min-w-0 rounded-lg border px-3 text-sm outline-none focus:border-[#FF4D88]/60 ${input}`} /></div> : <div className="mt-3 flex items-center gap-2"><p className={`text-sm font-semibold ${profile.phone ? '' : muted}`}>{profile.phone ? `${profile.country_code} ${profile.phone}` : 'Sin configurar'}</p>{profile.show_phone ? <Eye size={15} aria-label="Visible en el perfil" className="text-emerald-500" /> : <EyeOff size={15} aria-label="Oculto en el perfil" className={muted} />}</div>}
                  {editing && <button type="button" onClick={() => setProfile((current) => ({ ...current, show_phone: !current.show_phone }))} className={`mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors ${profile.show_phone ? 'bg-[#FF4D88] text-white' : isLight ? 'bg-[#e4e6eb] text-black hover:bg-[#d8dadf]' : 'bg-[#3a3b3c] text-white hover:bg-[#4e4f50]'}`}>{profile.show_phone ? <EyeOff size={14} /> : <Eye size={14} />}{profile.show_phone ? 'Ocultar del perfil' : 'Mostrar en perfil'}</button>}
                </div>
              </div>
            </article>
          </div>
        )}

        {activeSection === 'friends' && (
          <section className={`mx-auto max-w-5xl rounded-xl border p-5 ${card}`} aria-labelledby="profile-friends-title">
              <div className="flex items-center justify-between"><div><h2 id="profile-friends-title" className="text-xl font-black tracking-tight">Amigos</h2><p className={`mt-0.5 text-xs ${muted}`}>Tu comunidad de lectura</p></div><span className="grid h-10 min-w-10 place-items-center rounded-full bg-[#FF4D88]/10 px-3 text-xs font-black text-[#FF4D88]">{friends.friends.length}</span></div>

              {friends.incoming.length > 0 && <div className="mt-5"><h3 className={`mb-2 text-[10px] font-black uppercase tracking-wider ${muted}`}>Solicitudes recibidas</h3><div className="space-y-2">{friends.incoming.map((entry) => <div key={entry.request_id} className={`flex items-center gap-3 rounded-lg p-2.5 ${isLight ? 'bg-[#f0f2f5]' : 'bg-[#3a3b3c]'}`}><Link to={`/usuarios/${entry.user.id}`}><UserAvatar entry={entry} /></Link><Link to={`/usuarios/${entry.user.id}`} className="min-w-0 flex-1 truncate text-sm font-bold hover:text-[#FF4D88]">{entry.user.username}</Link><button type="button" onClick={() => void handleRequest(entry.request_id, 'accept')} disabled={actionId === entry.request_id} aria-label="Aceptar" className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FF4D88] text-white"><Check size={15} /></button><button type="button" onClick={() => void handleRequest(entry.request_id, 'reject')} disabled={actionId === entry.request_id} aria-label="Rechazar" className={`flex h-9 w-9 items-center justify-center rounded-lg ${isLight ? 'bg-[#e4e6eb] text-black' : 'bg-[#4e4f50] text-white'}`}><X size={15} /></button></div>)}</div></div>}

              <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{friends.friends.map((entry) => <div key={entry.user.id} className={`group flex items-center gap-3 rounded-lg p-3 ${isLight ? 'bg-[#f0f2f5]' : 'bg-[#3a3b3c]'}`}><Link to={`/usuarios/${entry.user.id}`}><UserAvatar entry={entry} size="h-12 w-12" /></Link><Link to={`/usuarios/${entry.user.id}`} className="min-w-0 flex-1 truncate text-sm font-bold hover:text-[#FF4D88]">{entry.user.username}</Link><button type="button" onClick={() => openChat(entry.user)} aria-label={`Chatear con ${entry.user.username}`} className="flex h-8 w-8 items-center justify-center rounded-full text-[#FF4D88] hover:bg-[#FF4D88]/10"><MessageCircle size={16} /></button><button type="button" onClick={() => void handleRemove(entry)} disabled={actionId === entry.user.id} aria-label="Eliminar amistad" className={`flex h-8 w-8 items-center justify-center rounded-full opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 ${isLight ? 'text-black/35 hover:bg-red-500/10 hover:text-red-500' : 'text-white/30 hover:bg-red-500/10 hover:text-red-400'}`}><UserMinus size={14} /></button></div>)}</div>
              {friends.friends.length === 0 && <div className={`mt-5 rounded-xl border border-dashed py-16 text-center ${isLight ? 'border-black/15 bg-[#f7f8fa]' : 'border-white/15 bg-white/[0.025]'}`}><Users size={34} className={`mx-auto mb-3 ${isLight ? 'text-black/15' : 'text-white/15'}`} /><p className="text-sm font-bold">Tu lista está vacía</p><p className={`mx-auto mt-1 max-w-sm text-xs leading-relaxed ${muted}`}>Las solicitudes se envían desde el perfil público de cada lector.</p></div>}

              {friends.outgoing.length > 0 && <div className={`mt-5 border-t pt-4 ${isLight ? 'border-black/10' : 'border-white/10'}`}><h3 className={`mb-2 text-[10px] font-black uppercase tracking-wider ${muted}`}>Solicitudes enviadas</h3><div className="flex flex-wrap gap-2">{friends.outgoing.map((entry) => <Link key={entry.request_id} to={`/usuarios/${entry.user.id}`} className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-bold ${isLight ? 'bg-[#f0f2f5]' : 'bg-[#3a3b3c]'}`}><UserAvatar entry={entry} size="h-5 w-5" />{entry.user.username}</Link>)}</div></div>}
            </section>
        )}
        </div>
      </div>
    </main>
  );
};
