import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Camera,
  Check,
  Edit3,
  ExternalLink,
  Loader2,
  MapPin,
  MessageCircle,
  Save,
  User,
  UserMinus,
  Users,
  X,
} from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { getStoredToken, getStoredUser } from '../services/authService';
import {
  emptyFriendsOverview,
  getFriendsOverview,
  removeFriend,
  respondFriendRequest,
  type FriendEntry,
  type FriendsOverview,
} from '../services/friendsService';
import { openChat } from '../services/socialService';
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
  avatar_url: avatar,
  banner_url: '',
  banner_color: 'bg-[#FF4D88]',
  is_pro: false,
  created_at: new Date().toISOString(),
  social_links: emptySocialLinks(),
});

const UserAvatar = ({ entry, size = 'h-10 w-10' }: { entry: FriendEntry; size?: string }) => entry.user.avatar_url
  ? <img src={entry.user.avatar_url} alt="" className={`${size} shrink-0 rounded-full object-cover ring-2 ring-[#FF4D88]/25`} />
  : <span className={`${size} flex shrink-0 items-center justify-center rounded-full bg-[#FF4D88] text-sm font-black text-white`}>{entry.user.username.charAt(0).toUpperCase()}</span>;

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
  const avatarRef = useRef<HTMLInputElement>(null);
  const user = useMemo(() => getStoredUser(), []);

  useEffect(() => {
    if (!user || !getStoredToken()) {
      navigate('/auth/login', { replace: true, state: { returnTo: '/perfil' } });
      return;
    }
    let active = true;
    startGlobalLoading(12);
    Promise.all([
      getWordPressProfile(user),
      getFriendsOverview().catch(() => emptyFriendsOverview()),
    ]).then(([loadedProfile, loadedFriends]) => {
      if (!active) return;
      setProfile(loadedProfile);
      setFriends(loadedFriends);
    }).catch(() => {
      if (!active) return;
      setProfile(fallbackProfile(user.username, user.avatar || ''));
      setFriends(emptyFriendsOverview());
      setNotice({ type: 'error', text: 'No se pudo sincronizar el perfil.' });
    }).finally(() => {
      if (!active) return;
      setLoading(false);
      finishGlobalLoading();
    });
    return () => {
      active = false;
      finishGlobalLoading();
    };
  }, [navigate, user]);

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

  if (loading) return <main className={`min-h-screen ${isLight ? 'bg-white' : 'bg-black'}`} />;

  const muted = isLight ? 'text-black/50' : 'text-white/45';
  const input = isLight ? 'border-black/10 bg-zinc-50 text-black placeholder:text-black/30' : 'border-white/10 bg-white/[0.04] text-white placeholder:text-white/25';

  return (
    <main className={`min-h-screen pb-24 transition-colors ${isLight ? 'bg-white text-black' : 'bg-black text-white'}`}>
      <section className={`relative h-52 overflow-hidden md:h-72 ${profile.banner_color}`}>
        {editing && (
          <div
            className={`absolute bottom-5 right-5 flex max-w-[calc(100%-2.5rem)] flex-wrap justify-end gap-2 rounded-xl border p-2.5 shadow-xl backdrop-blur-md ${isLight ? 'border-black/10 bg-white/75' : 'border-white/10 bg-black/70'}`}
            aria-label="Colores de portada"
          >
            {BANNER_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label="Elegir color"
                onClick={() => setProfile((current) => ({ ...current, banner_color: color }))}
                className={`h-8 w-8 rounded-full border-2 transition-transform ${color} ${profile.banner_color === color ? 'scale-110 border-[#FF4D88]' : isLight ? 'border-black/10' : 'border-white/20'}`}
              />
            ))}
          </div>
        )}
      </section>

      <div className="relative z-10 mx-auto -mt-16 max-w-6xl px-5 md:-mt-12 md:px-6">
          <section className="mb-10 flex flex-col items-start gap-6 md:flex-row md:items-end">
            <div className="group relative">
              <div className={`h-32 w-32 overflow-hidden rounded-full border-[8px] shadow-xl md:h-36 md:w-36 ${isLight ? 'border-white bg-zinc-100' : 'border-black bg-zinc-900'}`}>
                {profile.avatar_url ? <img src={profile.avatar_url} alt="Tu avatar" className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center"><User size={52} className={isLight ? 'text-black/20' : 'text-white/20'} /></span>}
              </div>
              <button type="button" onClick={() => avatarRef.current?.click()} disabled={imageType === 'avatar'} aria-label="Cambiar foto de perfil" className="absolute inset-2 flex items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 disabled:opacity-100">{imageType === 'avatar' ? <Loader2 className="animate-spin" /> : <Camera size={25} />}</button>
              <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={(event) => void handleImage(event, 'avatar')} />
            </div>

            <div className="flex w-full min-w-0 flex-1 flex-col gap-5 pb-2 md:flex-row md:items-end md:justify-between">
              <div className="min-w-0">
                {editing ? <input value={profile.username} maxLength={60} onChange={(event) => setProfile((current) => ({ ...current, username: event.target.value }))} className={`w-full max-w-xl rounded-xl border px-4 py-3 text-2xl font-black uppercase italic outline-none focus:border-[#FF4D88]/60 ${input}`} /> : <div className="flex flex-wrap items-center gap-3"><h1 className="break-words text-4xl font-[1000] uppercase italic tracking-tighter md:text-5xl">{profile.username}</h1>{profile.is_pro && <span className="rounded bg-yellow-400 px-2 py-1 text-[9px] font-black text-black">MUKAI PRO</span>}</div>}
                <div className={`mt-2 flex flex-wrap items-center gap-3 text-xs font-semibold ${muted}`}>
                  <span className="rounded bg-[#FF4D88] px-2 py-1 text-[9px] font-black uppercase text-white">Perfil Mukai</span>
                  <span className="flex items-center gap-1.5"><MapPin size={14} className="text-[#FF4D88]" />{profile.location || 'Ubicación sin configurar'}</span>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                {editing && <button type="button" onClick={() => { setEditing(false); if (user) void getWordPressProfile(user).then(setProfile); }} className={`flex h-11 items-center gap-2 rounded-lg border px-4 text-xs font-black ${isLight ? 'border-black/10 bg-zinc-100 hover:bg-zinc-200' : 'border-white/10 bg-zinc-800 hover:bg-zinc-700'}`}><X size={16} />Cancelar</button>}
                <button type="button" onClick={() => editing ? void handleSave() : setEditing(true)} disabled={saving} className={`flex h-11 items-center gap-2 rounded-lg px-5 text-xs font-black text-white transition-colors disabled:opacity-50 ${editing ? 'bg-[#FF4D88] hover:bg-black' : 'bg-[#4E5058] hover:bg-[#6D6F78]'}`}>{saving ? <Loader2 size={16} className="animate-spin" /> : editing ? <Save size={16} /> : <Edit3 size={16} />}{editing ? 'Guardar' : 'Editar perfil'}</button>
              </div>
            </div>
          </section>

          {notice && <p className={`mb-6 rounded-xl border px-4 py-3 text-xs font-semibold ${notice.type === 'success' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500' : 'border-red-500/20 bg-red-500/10 text-red-400'}`}>{notice.text}</p>}

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(330px,0.9fr)]">
            <div className="space-y-5">
              <article className={`rounded-2xl border p-5 ${isLight ? 'border-black/10 bg-zinc-50' : 'border-white/10 bg-black'}`}>
                <h2 className="text-sm font-black">Tu presentación</h2>
                {editing ? <><input value={profile.location} maxLength={80} onChange={(event) => setProfile((current) => ({ ...current, location: event.target.value }))} placeholder="Ciudad o país" className={`mt-4 w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[#FF4D88]/60 ${input}`} /><textarea value={profile.bio} maxLength={800} onChange={(event) => setProfile((current) => ({ ...current, bio: event.target.value }))} placeholder="Cuéntale a la comunidad qué mangas te gustan..." className={`mt-3 min-h-36 w-full resize-none rounded-xl border px-4 py-3 text-sm leading-6 outline-none focus:border-[#FF4D88]/60 ${input}`} /></> : <p className={`mt-3 whitespace-pre-wrap text-sm leading-7 ${isLight ? 'text-black/65' : 'text-white/60'}`}>{profile.bio || 'Añade una descripción para que otros lectores te conozcan.'}</p>}
              </article>

              <article className={`rounded-2xl border p-5 ${isLight ? 'border-black/10 bg-zinc-50' : 'border-white/10 bg-black'}`}>
                <div className="flex items-center justify-between"><h2 className="text-sm font-black">Redes y enlaces</h2><ExternalLink size={16} className="text-[#FF4D88]" /></div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {SOCIAL_FIELDS.map((field) => editing ? (
                    <label key={field.key} className="block"><span className={`mb-1.5 block text-[10px] font-bold ${muted}`}>{field.label}</span><input value={profile.social_links[field.key]} onChange={(event) => setProfile((current) => ({ ...current, social_links: { ...current.social_links, [field.key]: event.target.value } }))} placeholder={field.placeholder} className={`w-full rounded-xl border px-3 py-2.5 text-xs outline-none focus:border-[#FF4D88]/60 ${input}`} /></label>
                  ) : profile.social_links[field.key] ? (
                    field.key === 'discord' && !profile.social_links[field.key].startsWith('http')
                      ? <span key={field.key} className={`rounded-xl border px-3 py-2.5 text-xs font-bold ${isLight ? 'border-black/10' : 'border-white/10'}`}>{field.label}: {profile.social_links[field.key]}</span>
                      : <a key={field.key} href={profile.social_links[field.key]} target="_blank" rel="noreferrer" className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition-colors hover:border-[#FF4D88] hover:text-[#FF4D88] ${isLight ? 'border-black/10' : 'border-white/10'}`}>{field.label}</a>
                  ) : null)}
                  {!editing && !Object.values(profile.social_links).some(Boolean) && <p className={`text-xs ${muted}`}>Todavía no agregaste enlaces públicos.</p>}
                </div>
              </article>
            </div>

            <aside className={`h-fit rounded-2xl border p-5 ${isLight ? 'border-black/10 bg-zinc-50' : 'border-white/10 bg-black'}`}>
              <div className="flex items-center justify-between"><h2 className="flex items-center gap-2 text-sm font-black"><Users size={18} className="text-[#FF4D88]" />Amigos</h2><span className="rounded-full bg-[#FF4D88]/10 px-2.5 py-1 text-[10px] font-black text-[#FF4D88]">{friends.friends.length}</span></div>

              {friends.incoming.length > 0 && <div className="mt-5"><h3 className={`mb-2 text-[10px] font-black ${muted}`}>Solicitudes recibidas</h3><div className="space-y-2">{friends.incoming.map((entry) => <div key={entry.request_id} className={`flex items-center gap-3 rounded-xl border p-2.5 ${isLight ? 'border-black/10 bg-white' : 'border-white/10 bg-white/[0.03]'}`}><Link to={`/usuarios/${entry.user.id}`}><UserAvatar entry={entry} /></Link><Link to={`/usuarios/${entry.user.id}`} className="min-w-0 flex-1 truncate text-xs font-bold hover:text-[#FF4D88]">{entry.user.username}</Link><button type="button" onClick={() => void handleRequest(entry.request_id, 'accept')} disabled={actionId === entry.request_id} aria-label="Aceptar" className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500"><Check size={14} /></button><button type="button" onClick={() => void handleRequest(entry.request_id, 'reject')} disabled={actionId === entry.request_id} aria-label="Rechazar" className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-red-400"><X size={14} /></button></div>)}</div></div>}

              <div className="mt-5 space-y-2">{friends.friends.map((entry) => <div key={entry.user.id} className={`group flex items-center gap-3 rounded-xl border p-2.5 ${isLight ? 'border-black/10 bg-white' : 'border-white/10 bg-white/[0.03]'}`}><Link to={`/usuarios/${entry.user.id}`}><UserAvatar entry={entry} /></Link><Link to={`/usuarios/${entry.user.id}`} className="min-w-0 flex-1 truncate text-xs font-bold hover:text-[#FF4D88]">{entry.user.username}</Link><button type="button" onClick={() => openChat(entry.user)} aria-label={`Chatear con ${entry.user.username}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-[#FF4D88] hover:bg-[#FF4D88]/10"><MessageCircle size={15} /></button><button type="button" onClick={() => void handleRemove(entry)} disabled={actionId === entry.user.id} aria-label="Eliminar amistad" className={`flex h-8 w-8 items-center justify-center rounded-lg opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 ${isLight ? 'text-black/35 hover:bg-red-500/10 hover:text-red-500' : 'text-white/30 hover:bg-red-500/10 hover:text-red-400'}`}><UserMinus size={14} /></button></div>)}</div>
              {friends.friends.length === 0 && <div className="py-10 text-center"><Users size={30} className={`mx-auto mb-3 ${isLight ? 'text-black/15' : 'text-white/15'}`} /><p className="text-sm font-bold">Tu lista está vacía</p><p className={`mt-1 text-xs leading-relaxed ${muted}`}>Las solicitudes se envían desde el perfil público de cada lector.</p></div>}

              {friends.outgoing.length > 0 && <div className={`mt-5 border-t pt-4 ${isLight ? 'border-black/10' : 'border-white/10'}`}><h3 className={`mb-2 text-[10px] font-black ${muted}`}>Solicitudes enviadas</h3><div className="flex flex-wrap gap-2">{friends.outgoing.map((entry) => <Link key={entry.request_id} to={`/usuarios/${entry.user.id}`} className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-bold ${isLight ? 'border-black/10' : 'border-white/10'}`}><UserAvatar entry={entry} size="h-5 w-5" />{entry.user.username}</Link>)}</div></div>}
            </aside>
          </div>
      </div>
    </main>
  );
};
