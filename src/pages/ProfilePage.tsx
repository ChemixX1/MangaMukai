import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Camera, MapPin, Edit3, Save, X, User, 
  BookOpen, Clock, Facebook, Instagram, 
  Crown, Medal, Award, Check, Github, Youtube
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { getStoredToken, getStoredUser } from "../services/authService";
import { getInteractions } from "../services/interactionsService";
import { getMangaById } from "../services/mangaService";
import {
  emptySocialLinks,
  getWordPressProfile,
  saveWordPressProfile,
  uploadWordPressProfileImage,
} from "../services/wordpressService";
import { wordpressUrl } from "../config/api";

// --- ICONOS PERSONALIZADOS ---
const WhatsAppIcon = ({ size = 18, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);

const TelegramIcon = ({ size = 18, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

const DiscordIcon = ({ size = 18, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
  </svg>
);

const XIcon = ({ size = 18, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/>
  </svg>
);

// Colores para el banner (Rosa por defecto)
const BANNER_COLORS = [
  "bg-[#FF4D88]", // Default (Rosa)
  "bg-zinc-800",  // Dark
  "bg-[#5865F2]", // Blurple
  "bg-[#EB459E]", // Pink
  "bg-[#ED4245]", // Red
  "bg-[#57F287]", // Green
  "bg-[#FEE75C]", // Yellow
  "bg-[#23A559]", // Brand Green
  "bg-black"
];

// Tipos
interface HistoryItem {
  manga_id: string;
  last_read_at: string;
  mangas: {
    title: string;
    cover_url: string;
    id: string;
  };
}



export const ProfilePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  
  const [readingHistory, setReadingHistory] = useState<HistoryItem[]>([]);

  const [profile, setProfile] = useState({
    username: "",
    bio: "",
    location: "",
    avatar_url: "",
    banner_url: "",
    banner_color: "bg-[#FF4D88]", // Default Rosa
    is_pro: false, // Estado PRO
    created_at: "",
    social_links: {
      facebook: "",
      twitter: "",
      instagram: "",
      discord: "",
      whatsapp: "",
      telegram: "",
      youtube: "",
      github: ""
    }
  });

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // --- LÓGICA DE NIVELES Y RANGOS ---
  const mangasReadCount = readingHistory.length;
  const currentLevel = Math.floor(mangasReadCount / 20) + 1;
  const nextLevelProgress = mangasReadCount % 20;

  // 2. MODIFICADO: El badge de nivel vuelve a ser normal, sin el diamante PRO
  const getLevelBadge = () => {
    if (currentLevel >= 50) return <Crown size={28} className="text-yellow-500 fill-yellow-500 animate-pulse" />;
    if (currentLevel >= 20) return <Crown size={28} className="text-purple-500" />;
    if (currentLevel >= 10) return <Medal size={28} className="text-yellow-400" />;
    if (currentLevel >= 5) return <Medal size={28} className="text-gray-400" />;
    return <Award size={28} className="text-orange-400" />;
  };

  // 3. Mantiene el nombre de rango supremo si es PRO
  const getRankName = () => {
    if (profile.is_pro) return "Mukai Kami"; // RANGO SUPREMO PRO

    if (currentLevel >= 50) return "Mangaka Legendario";
    if (currentLevel >= 20) return "Sensei";
    if (currentLevel >= 10) return "Senpai";
    if (currentLevel >= 5) return "Otaku";
    return "Kouhai"; // Novato
  };

  // --- CARGAR DATOS ---
  useEffect(() => {
    const fetchData = async () => {
      const currentUser = getStoredUser();
      if (!currentUser || !getStoredToken()) { navigate("/"); return; }
      setUserId(String(currentUser.id));

      const profileData = await getWordPressProfile(currentUser);
      setProfile({
        username: profileData.username || currentUser.username,
        bio: profileData.bio || "",
        location: profileData.location || "",
        avatar_url: profileData.avatar_url || currentUser.avatar || "",
        banner_url: profileData.banner_url || "",
        banner_color: profileData.banner_color || "bg-[#FF4D88]",
        is_pro: profileData.is_pro || false,
        created_at: profileData.created_at || new Date().toISOString(),
        social_links: profileData.social_links || emptySocialLinks(),
      });

      // Obtener el historial desde WP
      const interactions = await getInteractions();
      if (interactions && interactions.history) {
          const formattedHistory: HistoryItem[] = [];
          for (const item of interactions.history) {
              const manga = await getMangaById(item.manga_id);
              if (manga) {
                  formattedHistory.push({
                      manga_id: String(item.manga_id),
                      last_read_at: new Date(item.time * 1000).toISOString(),
                      mangas: { title: manga.titulo, cover_url: manga.portada, id: String(manga.id) }
                  });
              }
          }
          setReadingHistory(formattedHistory);
      }
      setLoading(false);
    };
    fetchData();
  }, [navigate]);

  // --- SUBIR IMÁGENES ---
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    if (!event.target.files || !event.target.files[0] || !userId) return;
    const file = event.target.files[0];

    setSaving(true);
    try {
      const result = await uploadWordPressProfileImage(file, type);
      if (!result.success) throw new Error(result.message);
      const field = type === 'avatar' ? 'avatar_url' : 'banner_url';
      setProfile(prev => ({ ...prev, [field]: result.url }));
    } catch (error) { console.error("Error imagen:", error); } 
    finally { setSaving(false); }
  };

  // --- GUARDAR ---
  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const result = await saveWordPressProfile(profile);
      if (!result.success) throw new Error(result.message);
      setIsEditing(false);
    } catch (error) { console.error("Error guardar:", error); } 
    finally { setSaving(false); }
  };

  if (loading) return <div className="min-h-screen bg-zinc-900 flex items-center justify-center text-white font-bold">Cargando perfil...</div>;

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100 pb-20 relative">
      
      {/* Fondo estilo Discord - sin grid */}
      <div className="absolute inset-0 bg-zinc-900"></div>

      {/* --- PORTADA --- */}
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className={`relative h-48 md:h-64 w-full group overflow-hidden ${profile.banner_url ? '' : profile.banner_color}`}
      >
        {profile.banner_url ? (
           <img src={profile.banner_url} alt="Banner" className="w-full h-full object-cover" />
        ) : (
           <div className="w-full h-full"></div>
        )}
        
        {isEditing && !profile.banner_url && (
            <div className="absolute bottom-6 right-6 flex gap-2 bg-[#2B2D31]/95 p-2 rounded-xl backdrop-blur-md shadow-lg z-20 border border-[#1E1F22]">
                {BANNER_COLORS.map(color => (
                    <button 
                        key={color}
                        onClick={() => setProfile({...profile, banner_color: color})}
                        className={`w-6 h-6 rounded-full border-2 ${color} ${profile.banner_color === color ? 'border-white scale-110' : 'border-transparent hover:scale-110'} transition-all`}
                    />
                ))}
            </div>
        )}

        <button 
            onClick={() => bannerInputRef.current?.click()}
            className="absolute top-6 right-6 bg-[#1E1F22]/80 hover:bg-[#5865F2] hover:text-white text-[#B5BAC1] p-2.5 rounded-full backdrop-blur-md transition-all shadow-lg opacity-0 group-hover:opacity-100"
        >
            <Camera size={20} />
        </button>
        
        {isEditing && profile.banner_url && (
            <button 
                onClick={() => setProfile({...profile, banner_url: ""})}
                className="absolute top-16 right-6 bg-[#DA373C]/80 hover:bg-[#A12D30] text-white p-2.5 rounded-full backdrop-blur-md transition-all shadow-lg text-xs font-bold"
            >
                <X size={20} />
            </button>
        )}
        <input type="file" ref={bannerInputRef} onChange={(e) => handleImageUpload(e, 'banner')} className="hidden" accept="image/*" />
      </motion.div>

      {/* Margen ajustado para PC (-mt-12) */}
      <div className="max-w-6xl mx-auto px-6 relative z-10 -mt-16 md:-mt-12">
        
        {/* --- HEADER --- */}
        <div className="flex flex-col md:flex-row items-start md:items-end gap-6 mb-10">
            {/* AVATAR */}
            <div className="relative group">
                <div className={`w-32 h-32 md:w-36 md:h-36 rounded-full border-[8px] ${profile.is_pro ? 'border-yellow-500/50' : 'border-zinc-900 shadow-xl'} bg-zinc-800 overflow-hidden relative transition-all`}>
                    {profile.avatar_url ? (
                        <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#4E5058] bg-[#1E1F22]"><User size={60} /></div>
                    )}
                    <div onClick={() => avatarInputRef.current?.click()} className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-[2px]">
                        <Camera size={28} className="text-white" />
                    </div>
                </div>
                <input type="file" ref={avatarInputRef} onChange={(e) => handleImageUpload(e, 'avatar')} className="hidden" accept="image/*" />
            </div>

            {/* INFO */}
            <div className="flex-1 w-full md:w-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-2">
                <div>
                   <div className="flex items-center gap-3">
                       {isEditing ? (
                         <input 
                           type="text" value={profile.username}
                           onChange={(e) => setProfile({...profile, username: e.target.value})}
                           className="bg-zinc-800 border-2 border-zinc-600 text-3xl font-[1000] text-white uppercase italic px-3 py-1 rounded-lg focus:border-[#FF4D88] outline-none w-full shadow-sm"
                         />
                       ) : (
                         <h1 className="text-4xl md:text-5xl font-[1000] uppercase italic tracking-tighter text-white flex items-center gap-3">
                            {profile.username || "Usuario"}
                            
                            {/* MODIFICADO: INSIGNIA PRO (Corona Dorada Plana) - Sin fondo, sin blur, sin shadow */}
                            {profile.is_pro && (
                                <span title="Usuario PRO" className="flex items-center cursor-help">
                                    <Crown
                                        size={24}
                                        className="text-yellow-400 fill-yellow-400 ml-1"
                                />
                            </span>
                            )}
                            
                            {/* BADGE DE RANGO NORMAL */}
                            <span className="opacity-80 drop-shadow-md">{getLevelBadge()}</span>
                         </h1>
                       )}
                   </div>
                   <div className="flex items-center gap-3 mt-2">
                        {/* MODIFICADO: Etiqueta de rango dorada plana si es PRO */}
                        <span className={`text-white text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider ${profile.is_pro ? 'bg-yellow-500 text-black' : 'bg-[#FF4D88]'}`}>
                            {getRankName()}
                        </span>
                        <p className="text-[#B5BAC1] font-bold text-xs uppercase tracking-wide">
                            Miembro desde {new Date(profile.created_at).toLocaleDateString()}
                        </p>
                   </div>
                </div>

                <div className="flex items-center gap-3">
                    {isEditing ? (
                        <>
                            <button onClick={() => setIsEditing(false)} className="px-5 py-3 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white font-bold transition-colors flex items-center gap-2 text-xs uppercase tracking-wider">
                                <X size={16} strokeWidth={3} /> Cancelar
                            </button>
                            <button onClick={handleSave} disabled={saving} className="px-5 py-3 rounded-lg bg-[#FF4D88] hover:bg-black text-white font-bold transition-colors flex items-center gap-2 shadow-lg text-xs uppercase tracking-wider">
                                {saving ? "Guardando..." : "Guardar"}
                                {!saving && <Save size={16} strokeWidth={3} />}
                            </button>
                        </>
                    ) : (
                        <button onClick={() => setIsEditing(true)} className="px-5 py-3 rounded-lg bg-[#4E5058] hover:bg-[#6D6F78] text-white font-bold transition-all flex items-center gap-2 shadow-sm text-xs uppercase tracking-wider">
                            <Edit3 size={16} strokeWidth={3} /> Editar Perfil
                        </button>
                    )}
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* COLUMNA IZQUIERDA */}
            <div className="space-y-6">
                
                {/* BIO CARD */}
                <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-8 shadow-sm">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-4">Sobre Mí</h3>
                    {isEditing ? (
                        <textarea 
                            value={profile.bio} onChange={(e) => setProfile({...profile, bio: e.target.value})}
                            className="w-full bg-zinc-900 border-2 border-zinc-600 rounded-lg p-3 text-sm text-white focus:border-[#FF4D88] outline-none resize-none h-32"
                            placeholder="Escribe algo sobre ti..."
                        />
                    ) : (
                        <p className="text-[#DBDEE1] text-sm leading-relaxed font-medium">
                            {profile.bio || "Este usuario prefiere mantener el misterio..."}
                        </p>
                    )}

                    <div className="mt-6 flex flex-col gap-4">
                         <div className="flex items-center gap-3 text-sm font-semibold text-[#DBDEE1]">
                             <MapPin size={16} className="text-[#FF4D88]" />
                             {isEditing ? (
                                <input type="text" value={profile.location} onChange={(e) => setProfile({...profile, location: e.target.value})} placeholder="Ubicación" className="bg-zinc-900 border border-zinc-600 rounded px-2 py-1 text-white w-full text-xs" />
                             ) : (
                                <span>{profile.location || "Ubicación desconocida"}</span>
                             )}
                         </div>
                    </div>
                </div>

                {/* REDES SOCIALES */}
                {(isEditing || Object.values(profile.social_links).some(link => link)) && (
                    <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-8 shadow-sm">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-4">Conexiones</h3>
                        <div className="flex flex-col gap-3">
                            {/* FACEBOOK */}
                            {(isEditing || profile.social_links.facebook) && (
                                <div className="flex items-center gap-3 bg-zinc-900 p-3 rounded-lg hover:bg-black transition-colors">
                                    <Facebook size={18} className="text-[#1877F2]" />
                                    {isEditing ? (
                                        <input type="text" placeholder="URL Facebook" value={profile.social_links.facebook} onChange={e => setProfile({...profile, social_links: {...profile.social_links, facebook: e.target.value}})} className="w-full text-xs bg-transparent text-white border-none outline-none" />
                                    ) : (
                                        <a href={profile.social_links.facebook} target="_blank" rel="noreferrer" className="text-sm font-bold text-zinc-300 hover:text-[#1877F2] truncate">Facebook</a>
                                    )}
                                </div>
                            )}
                            {/* WHATSAPP */}
                            {(isEditing || profile.social_links.whatsapp) && (
                                <div className="flex items-center gap-3 bg-zinc-900 p-3 rounded-lg hover:bg-black transition-colors">
                                    <WhatsAppIcon size={18} className="text-[#25D366]" />
                                    {isEditing ? (
                                        <input type="text" placeholder="URL WhatsApp" value={profile.social_links.whatsapp} onChange={e => setProfile({...profile, social_links: {...profile.social_links, whatsapp: e.target.value}})} className="w-full text-xs bg-transparent text-white border-none outline-none" />
                                    ) : (
                                        <a href={profile.social_links.whatsapp} target="_blank" rel="noreferrer" className="text-sm font-bold text-zinc-300 hover:text-[#25D366] truncate">WhatsApp</a>
                                    )}
                                </div>
                            )}
                            {/* TWITTER */}
                            {(isEditing || profile.social_links.twitter) && (
                                <div className="flex items-center gap-3 bg-zinc-900 p-3 rounded-lg hover:bg-black transition-colors">
                                    <XIcon size={18} className="text-white" />
                                    {isEditing ? (
                                        <input type="text" placeholder="URL X/Twitter" value={profile.social_links.twitter} onChange={e => setProfile({...profile, social_links: {...profile.social_links, twitter: e.target.value}})} className="w-full text-xs bg-transparent text-white border-none outline-none" />
                                    ) : (
                                        <a href={profile.social_links.twitter} target="_blank" rel="noreferrer" className="text-sm font-bold text-zinc-300 hover:text-white truncate">X (Twitter)</a>
                                    )}
                                </div>
                            )}
                            {/* INSTAGRAM */}
                            {(isEditing || profile.social_links.instagram) && (
                                <div className="flex items-center gap-3 bg-zinc-900 p-3 rounded-lg hover:bg-black transition-colors">
                                    <Instagram size={18} className="text-[#E4405F]" />
                                    {isEditing ? (
                                        <input type="text" placeholder="URL Instagram" value={profile.social_links.instagram} onChange={e => setProfile({...profile, social_links: {...profile.social_links, instagram: e.target.value}})} className="w-full text-xs bg-transparent text-white border-none outline-none" />
                                    ) : (
                                        <a href={profile.social_links.instagram} target="_blank" rel="noreferrer" className="text-sm font-bold text-zinc-300 hover:text-[#E4405F] truncate">Instagram</a>
                                    )}
                                </div>
                            )}
                            {/* YOUTUBE */}
                            {(isEditing || profile.social_links.youtube) && (
                                <div className="flex items-center gap-3 bg-zinc-900 p-3 rounded-lg hover:bg-black transition-colors">
                                    <Youtube size={18} className="text-[#FF0000]" />
                                    {isEditing ? (
                                        <input type="text" placeholder="URL YouTube" value={profile.social_links.youtube} onChange={e => setProfile({...profile, social_links: {...profile.social_links, youtube: e.target.value}})} className="w-full text-xs bg-transparent text-white border-none outline-none" />
                                    ) : (
                                        <a href={profile.social_links.youtube} target="_blank" rel="noreferrer" className="text-sm font-bold text-zinc-300 hover:text-[#FF0000] truncate">YouTube</a>
                                    )}
                                </div>
                            )}
                            {/* DISCORD */}
                            {(isEditing || profile.social_links.discord) && (
                                <div className="flex items-center gap-3 bg-zinc-900 p-3 rounded-lg hover:bg-black transition-colors">
                                    <DiscordIcon size={18} className="text-[#5865F2]" />
                                    {isEditing ? (
                                        <input type="text" placeholder="Usuario Discord" value={profile.social_links.discord} onChange={e => setProfile({...profile, social_links: {...profile.social_links, discord: e.target.value}})} className="w-full text-xs bg-transparent text-white border-none outline-none" />
                                    ) : (
                                        <span className="text-sm font-bold text-zinc-300">{profile.social_links.discord}</span>
                                    )}
                                </div>
                            )}
                            {/* TELEGRAM */}
                            {(isEditing || profile.social_links.telegram) && (
                                <div className="flex items-center gap-3 bg-zinc-900 p-3 rounded-lg hover:bg-black transition-colors">
                                    <TelegramIcon size={18} className="text-[#0088cc]" />
                                    {isEditing ? (
                                        <input type="text" placeholder="URL Telegram" value={profile.social_links.telegram} onChange={e => setProfile({...profile, social_links: {...profile.social_links, telegram: e.target.value}})} className="w-full text-xs bg-transparent text-white border-none outline-none" />
                                    ) : (
                                        <a href={profile.social_links.telegram} target="_blank" rel="noreferrer" className="text-sm font-bold text-zinc-300 hover:text-[#0088cc] truncate">Telegram</a>
                                    )}
                                </div>
                            )}
                            {/* GITHUB */}
                            {(isEditing || profile.social_links.github) && (
                                <div className="flex items-center gap-3 bg-zinc-900 p-3 rounded-lg hover:bg-black transition-colors">
                                    <Github size={18} className="text-white" />
                                    {isEditing ? (
                                        <input type="text" placeholder="URL GitHub" value={profile.social_links.github} onChange={e => setProfile({...profile, social_links: {...profile.social_links, github: e.target.value}})} className="w-full text-xs bg-transparent text-white border-none outline-none" />
                                    ) : (
                                        <a href={profile.social_links.github} target="_blank" rel="noreferrer" className="text-sm font-bold text-zinc-300 hover:text-white truncate">GitHub</a>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ACCESO RÁPIDO — WORDPRESS */}
                <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-4">Mi Cuenta</h3>
                    <div className="flex flex-col gap-2">
                        <a
                            href={wordpressUrl('account')}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-3 bg-zinc-900 p-3 rounded-lg hover:bg-black transition-colors text-zinc-300 hover:text-white text-sm font-bold"
                        >
                            <User size={16} className="text-[#FF4D88]" /> Perfil
                        </a>
                        <a
                            href={wordpressUrl('canjear-cupon')}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-3 bg-zinc-900 p-3 rounded-lg hover:bg-black transition-colors text-zinc-300 hover:text-white text-sm font-bold"
                        >
                            <Award size={16} className="text-yellow-400" /> Monedas
                        </a>
                        <a
                            href={wordpressUrl('my-library')}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-3 bg-zinc-900 p-3 rounded-lg hover:bg-black transition-colors text-zinc-300 hover:text-white text-sm font-bold"
                        >
                            <BookOpen size={16} className="text-blue-400" /> Biblioteca
                        </a>
                    </div>
                </div>

                {/* PROGRESO DE NIVEL */}
                <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-8 shadow-sm flex flex-col gap-5">
                     <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Progreso</h3>
                     
                     <div className="flex items-center justify-between p-4 bg-zinc-900 rounded-xl border border-zinc-700">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-purple-500/20 rounded-xl text-purple-400">{getLevelBadge()}</div>
                            <div className="flex flex-col">
                                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Nivel Actual</span>
                                <span className="text-xl font-[1000] text-white">{currentLevel}</span>
                            </div>
                        </div>
                     </div>

                     <div className="px-1">
                        <div className="flex justify-between text-xs font-bold mb-2">
                            <span className="text-zinc-400">XP Actual</span>
                            <span className="text-white">{nextLevelProgress} / 20</span>
                        </div>
                        <div className="w-full bg-zinc-900 rounded-full h-3 overflow-hidden">
                            <div 
                                className="bg-[#FF4D88] h-full rounded-full transition-all duration-1000 ease-out" 
                                style={{ width: `${(nextLevelProgress / 20) * 100}%` }}
                            ></div>
                        </div>
                        <p className="text-[10px] text-zinc-400 mt-2 text-center font-medium">Lee {20 - nextLevelProgress} mangas más para subir de nivel</p>
                     </div>
                </div>

            </div>

            {/* COLUMNA DERECHA: Historial */}
            <div className="lg:col-span-2">
                 <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-8 shadow-sm min-h-[500px]">
                     <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xl font-[1000] uppercase italic tracking-tighter flex items-center gap-2 text-white">
                            <BookOpen className="text-[#FF4D88]" /> Mangas Leídos <span className="text-zinc-500 text-lg">({mangasReadCount})</span>
                        </h3>
                     </div>

                     {readingHistory.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {readingHistory.map((item, index) => (
                                <Link to={`/manga/${item.manga_id}`} key={index} className="group block relative aspect-[2/3] rounded-xl overflow-hidden bg-zinc-900 shadow-md hover:shadow-xl transition-all">
                                    <img 
                                        src={item.mangas.cover_url} 
                                        alt={item.mangas.title} 
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                                        <p className="text-white font-bold text-sm line-clamp-2">{item.mangas.title}</p>
                                        <div className="flex items-center gap-1 text-zinc-300 text-[10px] mt-1">
                                            <Clock size={10} /> 
                                            {new Date(item.last_read_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full shadow-lg">
                                        <Check size={12} strokeWidth={4} />
                                    </div>
                                </Link>
                            ))}
                        </div>
                     ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-24 h-24 bg-zinc-900 rounded-full flex items-center justify-center mb-4 border border-zinc-700">
                                <BookOpen size={40} className="text-zinc-500" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Tu historia comienza aquí</h3>
                            <p className="text-zinc-400 max-w-sm mb-8 font-medium">
                                Aún no has leído ningún manga. ¡Explora nuestro catálogo y empieza a leer para subir de nivel!
                            </p>
                            <button 
                                onClick={() => navigate('/catalog')} 
                                className="px-8 py-4 bg-white text-black font-[1000] uppercase text-xs tracking-[0.2em] rounded-xl hover:bg-[#FF4D88] hover:text-white transition-all shadow-lg"
                            >
                                Ir al Catálogo
                            </button>
                        </div>
                     )}
                 </div>
            </div>

        </div>
      </div>
    </div>
  );
};
