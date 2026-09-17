import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, ChevronLeft, Loader2, User as UserIcon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { getStoredToken, getStoredUser, type MMUser } from '../services/authService';
import { getPublicProfile } from '../services/socialService';
import {
  emptySocialLinks,
  getWordPressProfile,
  isPlaceholderAvatar,
  saveWordPressProfile,
  uploadWordPressProfileImage,
  type WordPressProfile,
} from '../services/wordpressService';
import { readerRankProgress } from '../utils/readerRank';
import defaultBanner from '../assets/banners/illustration-anime-character-rain.jpg';

const BIO_MAX_LENGTH = 160;

const fallbackProfile = (user: MMUser): WordPressProfile => ({
  username: user.display_name || user.username,
  bio: '',
  location: '',
  birth_date: '',
  country_code: '+51',
  phone: '',
  show_birth_date: false,
  show_phone: false,
  // El avatar de la sesión puede ser el Gravatar genérico: se trata como "sin foto" para no parpadear.
  avatar_url: isPlaceholderAvatar(user.avatar || '') ? '' : (user.avatar || ''),
  banner_url: '',
  banner_color: 'bg-[#FF4D88]',
  is_pro: false,
  created_at: new Date().toISOString(),
  social_links: emptySocialLinks(),
});

/**
 * Edición rápida del perfil (desde el lápiz de "Más"): foto, portada, nombre y
 * descripción, más la barra de progreso de rango. Se abre al instante: el
 * GlobalLoader la deja pasar y no bloquea mientras carga los datos. Sin navbar
 * ni barra inferior en móvil.
 */
const EditProfilePage = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [user] = useState<MMUser | null>(() => (getStoredToken() ? getStoredUser() : null));
  const [profile, setProfile] = useState<WordPressProfile | null>(() => (user ? fallbackProfile(user) : null));
  const [chaptersRead, setChaptersRead] = useState(0);
  const [uploading, setUploading] = useState<'avatar' | 'banner' | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const avatarRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  useDocumentTitle('Editar perfil');

  useEffect(() => {
    if (!user) {
      navigate('/auth/login', { replace: true, state: { returnTo: '/perfil/editar' } });
      return;
    }
    let active = true;
    void getWordPressProfile(user).then((loaded) => { if (active) setProfile(loaded); }).catch(() => undefined);
    void getPublicProfile(user.id).then((social) => { if (active) setChaptersRead(social.chapters_read_count ?? 0); }).catch(() => undefined);
    return () => { active = false; };
  }, [navigate, user]);

  const goBack = () => {
    if (((window.history.state as { idx?: number } | null)?.idx ?? 0) > 0) navigate(-1);
    else navigate('/mas');
  };

  const handleImage = async (event: ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !profile) return;
    const field = type === 'avatar' ? 'avatar_url' : 'banner_url';
    const previous = profile[field];
    const preview = URL.createObjectURL(file);
    setProfile((current) => (current ? { ...current, [field]: preview } : current));
    setUploading(type);
    setNotice(null);
    try {
      const result = await uploadWordPressProfileImage(file, type);
      if (!result.success) throw new Error(result.message);
      setProfile((current) => (current ? { ...current, [field]: result.url } : current));
      setNotice({ type: 'success', text: type === 'avatar' ? 'Foto actualizada.' : 'Portada actualizada.' });
    } catch (caught) {
      setProfile((current) => (current ? { ...current, [field]: previous } : current));
      setNotice({ type: 'error', text: caught instanceof Error ? caught.message : 'No se pudo subir la imagen.' });
    } finally {
      URL.revokeObjectURL(preview);
      setUploading(null);
    }
  };

  const handleSave = async () => {
    if (!profile || saving) return;
    setSaving(true);
    setNotice(null);
    try {
      const result = await saveWordPressProfile({ ...profile, username: profile.username.trim(), bio: profile.bio.trim() });
      if (!result.success) throw new Error(result.message);
      setNotice({ type: 'success', text: 'Perfil guardado.' });
    } catch (caught) {
      setNotice({ type: 'error', text: caught instanceof Error ? caught.message : 'No se pudo guardar el perfil.' });
    } finally {
      setSaving(false);
    }
  };

  if (!user || !profile) return null;

  const progress = readerRankProgress(chaptersRead);
  const muted = isLight ? 'text-black/45' : 'text-white/45';
  // Campos un punto más oscuros que el fondo; etiquetas en negro/blanco puro.
  const input = isLight
    ? 'border-transparent bg-[#d9d9de] text-black placeholder:text-black/45'
    : 'border-transparent bg-[#151519] text-white placeholder:text-white/40';
  const label = `font-[Montserrat] text-[12px] font-medium uppercase tracking-wide ${isLight ? 'text-black' : 'text-white'}`;
  // Mismo color sólido en las dos cámaras (sobre la portada y sobre el fondo de la página).
  const cameraButton = 'flex h-9 items-center gap-1.5 rounded-lg bg-[#333338] px-3 font-[Montserrat] text-[11px] font-bold text-white transition-colors hover:bg-[#45454b] disabled:opacity-60';

  return (
    <main className={`min-h-screen transition-colors lg:pt-24 ${isLight ? 'bg-[#f4f4f5] text-black' : 'bg-black text-white'}`}>
      <div className="mx-auto w-full max-w-2xl px-4 pb-10">
        {/* Cabecera propia (en móvil no hay navbar en esta página). */}
        <div className="flex h-14 items-center gap-2 pt-[env(safe-area-inset-top)]">
          <button
            type="button"
            onClick={goBack}
            aria-label="Volver"
            className={`-ml-2 flex h-10 w-10 items-center justify-center rounded-full transition-colors ${isLight ? 'hover:bg-black/5' : 'hover:bg-white/10'}`}
          >
            <ChevronLeft size={24} strokeWidth={2.4} />
          </button>
          <h1 className="font-[Montserrat] text-[18px] font-bold">Editar perfil</h1>
        </div>

        {/* Portada (con la imagen de "Más" por defecto) y foto, cada una con su cámara. */}
        <section aria-label="Imágenes del perfil" className="mt-2">
          <div className="relative h-40 overflow-hidden rounded-2xl bg-black">
            <img src={profile.banner_url || defaultBanner} alt="" className="absolute inset-0 h-full w-full object-cover object-[center_30%]" />
            {/* Mismo velo que en "Más" para que la portada se vea igual en las dos páginas. */}
            <div className={`absolute inset-0 bg-gradient-to-b from-black/10 via-transparent ${isLight ? 'to-[#f4f4f5]/70' : 'to-black/70'}`} aria-hidden="true" />
            <button type="button" onClick={() => bannerRef.current?.click()} disabled={uploading === 'banner'} className={`absolute right-3 top-3 ${cameraButton}`}>
              {uploading === 'banner' ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />} Portada
            </button>
            <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={(event) => void handleImage(event, 'banner')} />
          </div>
          <div className="relative -mt-10 flex items-end px-4">
            <span className={`block shrink-0 rounded-full p-[3px] ${isLight ? 'bg-[#f4f4f5]' : 'bg-black'}`}>
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt="" className="h-20 w-20 rounded-full object-cover" />
                : <span className={`flex h-20 w-20 items-center justify-center rounded-full ${isLight ? 'bg-black/[0.08] text-black/60' : 'bg-white/10 text-white/70'}`}><UserIcon size={32} /></span>}
            </span>
            <button type="button" onClick={() => avatarRef.current?.click()} disabled={uploading === 'avatar'} className={`-ml-3 mb-1 ${cameraButton}`}>
              {uploading === 'avatar' ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />} Perfil
            </button>
            <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={(event) => void handleImage(event, 'avatar')} />
          </div>
        </section>

        {/* Nombre y descripción */}
        <section aria-label="Datos del perfil" className="mt-6">
          <label className="block">
            <span className={label}>Nombre</span>
            <input
              value={profile.username}
              maxLength={40}
              onChange={(event) => setProfile((current) => (current ? { ...current, username: event.target.value } : current))}
              placeholder="Tu nombre"
              className={`mt-1.5 w-full rounded-lg border px-3.5 py-3 font-[Montserrat] text-[14px] font-semibold outline-none focus:border-[#FF4D88]/60 ${input}`}
            />
          </label>
          <label className="mt-5 block">
            <span className={`flex items-center justify-between ${label}`}>
              Descripción
              <span className="normal-case tracking-normal tabular-nums">{profile.bio.length}/{BIO_MAX_LENGTH}</span>
            </span>
            <textarea
              value={profile.bio}
              maxLength={BIO_MAX_LENGTH}
              onChange={(event) => setProfile((current) => (current ? { ...current, bio: event.target.value } : current))}
              placeholder="Cuéntale a la comunidad un poco sobre ti"
              className={`mt-1.5 min-h-24 w-full resize-none rounded-lg border px-3.5 py-3 font-[Montserrat] text-[14px] font-normal leading-snug outline-none focus:border-[#FF4D88]/60 ${input}`}
            />
          </label>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="mx-auto mt-5 flex h-11 w-[55%] min-w-[180px] items-center justify-center gap-2 rounded-xl bg-[#FF4D88] font-[Montserrat] text-[13px] font-bold text-white transition-colors hover:bg-[#ff347b] disabled:opacity-60"
          >
            {saving && <Loader2 size={15} className="animate-spin" />} Guardar cambios
          </button>
          {notice && (
            <p className={`mt-2.5 text-center font-[Montserrat] text-[12px] font-semibold ${notice.type === 'error' ? 'text-red-500' : 'text-emerald-500'}`}>{notice.text}</p>
          )}
        </section>

        {/* Progreso de rango, tipo barra de nivel */}
        <section aria-label="Progreso de rango" className="mt-7">
          <div className="flex items-baseline justify-between">
            <p className="font-[Montserrat] text-[14px] font-semibold">{progress.name}</p>
            <p className={`font-[Montserrat] text-[12px] font-medium tabular-nums ${muted}`}>
              {progress.next ? `${progress.current}/${progress.needed} capítulos` : 'Rango máximo'}
            </p>
          </div>
          <div className={`mt-2 h-2 overflow-hidden rounded-full ${isLight ? 'bg-black/[0.08]' : 'bg-white/10'}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent} aria-label={`Progreso hacia ${progress.next ?? 'el rango máximo'}`}>
            <div className="h-full rounded-full bg-gradient-to-r from-[#FF4D88] to-[#ff8fb3] transition-[width] duration-500" style={{ width: `${progress.percent}%` }} />
          </div>
          <p className={`mt-2 font-[Montserrat] text-[12px] font-normal ${muted}`}>
            {progress.next ? `Lee capítulos para subir a ${progress.next}` : 'Has alcanzado el rango más alto'}
          </p>
        </section>
      </div>
    </main>
  );
};

export default EditProfilePage;
