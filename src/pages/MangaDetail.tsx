import { useParams, useNavigate, Link } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import {
  ArrowLeft, BookOpen, Star, Clock, CheckCircle, Loader2,
  Play, Bookmark, BookMarked, Eye, Flame
} from "lucide-react";
import { motion } from "framer-motion";

import { getMangaById, getChaptersBySeries, trackChapterView, getRelatedMangas } from "../services/mangaService";
import type { MangaCapitulo } from "../types/manga";
import type { SeriesChapter, RelatedManga } from "../services/mangaService";
import { ChapterList } from "../components/manga";
import { getStoredUser, getStoredToken, getUnlockedChapters, refreshUser } from "../services/authService";

const getTypeColor = (type: string) => {
  const t = type?.toLowerCase() || "";
  if (t.includes("manhwa")) return "bg-purple-600";
  if (t.includes("manhua")) return "bg-green-600";
  if (t.includes("novel")) return "bg-blue-600";
  return "bg-[#FF4D88]";
};

// ── Componente: Lecturas Relacionadas ─────────────────────────────────────────
function RelatedSection({ related, currentId }: { related: RelatedManga[]; currentId: number | string }) {
  return (
    <div className="pt-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 border-l-4 border-[#FF4D88] pl-4 mb-6">
        <h2 className="text-xl md:text-2xl font-[900] text-white uppercase italic tracking-tighter flex items-center gap-2">
          <BookOpen size={20} className="text-[#FF4D88]" strokeWidth={3} />
          LECTURAS <span className="text-[#FF4D88]">RELACIONADAS</span>
        </h2>
      </div>

      {/* Carrusel horizontal */}
      <div className="relative">
        {/* Fades laterales */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#0a0a0a] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#0a0a0a] to-transparent z-10 pointer-events-none" />

        <div
          className="flex gap-3 overflow-x-auto pb-3 scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {related
            .filter(r => String(r.id) !== String(currentId))
            .map((manga, i) => (
              <RelatedCard key={manga.id} manga={manga} delay={i * 0.04} />
            ))}
        </div>
      </div>
    </div>
  );
}

function RelatedCard({ manga, delay }: { manga: RelatedManga; delay: number }) {
  const sharedLabel = manga.sharedGenres > 1
    ? `${manga.sharedGenres} géneros en común`
    : "1 género en común";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      className="flex-shrink-0 w-[130px] sm:w-[148px] group"
    >
      <Link to={`/manga/${manga.id}`} className="block">
        {/* Portada */}
        <div className="relative aspect-[3/4.2] rounded-lg overflow-hidden mb-2 border border-white/5 bg-[#111] shadow-lg group-hover:shadow-[#FF4D88]/20 group-hover:shadow-xl transition-all duration-300 group-hover:-translate-y-1">
          <img
            src={manga.portada}
            alt={manga.titulo}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {/* Overlay oscuro en hover */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />

          {/* Badge tipo */}
          <div className="absolute top-1.5 right-1.5">
            <span className={`${getTypeColor(manga.tipo)} text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shadow`}>
              {manga.tipo}
            </span>
          </div>

          {/* Badge géneros en común */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2 pt-4 pb-1.5 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
            <p className="text-[8px] text-[#FF4D88] font-bold uppercase tracking-wider leading-tight">
              {sharedLabel}
            </p>
          </div>
        </div>

        {/* Título */}
        <p className="text-[11px] sm:text-[12px] font-[700] text-white/80 group-hover:text-[#FF4D88] transition-colors leading-snug line-clamp-2 uppercase tracking-tight text-center px-0.5">
          {manga.titulo}
        </p>

        {/* Géneros principales */}
        {(manga.genres ?? []).slice(0, 2).map((g, i) => (
          <span
            key={i}
            className="inline-block text-[9px] text-white/30 bg-white/5 px-1.5 py-0.5 rounded mr-1 mt-1"
          >
            {g}
          </span>
        ))}
      </Link>
    </motion.div>
  );
}

const getStatusLabel = (status: string) => {
  const s = status?.toLowerCase() || "";
  if (s.includes("complet") || s === "finished") return { label: "Completado", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" };
  if (s.includes("cancel") || s.includes("drop")) return { label: "Cancelado", color: "text-red-400 bg-red-400/10 border-red-400/20" };
  return { label: "En Curso", color: "text-blue-400 bg-blue-400/10 border-blue-400/20" };
};

export const MangaDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [manga, setManga] = useState<MangaCapitulo | null>(null);
  const [chapters, setChapters] = useState<SeriesChapter[]>([]);
  const [related, setRelated] = useState<RelatedManga[]>([]);
  const [loading, setLoading] = useState(true);
  const [chaptersLoading, setChaptersLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auth
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());
  const [userCoins, setUserCoins] = useState(0);
  const [userInfo, setUserInfo] = useState<{ id: string; username: string }>({ id: "", username: "" });
  const [isBookmarked, setIsBookmarked] = useState(false);

  const loadUser = useCallback(async () => {
    const stored = getStoredUser();
    const token = getStoredToken();
    if (stored && token) {
      setUserInfo({ id: String(stored.id), username: stored.username });
      setUserCoins(stored.coins || 0);
    } else {
      setUserInfo({ id: "", username: "" });
      setUserCoins(0);
    }
    if (token) {
      const [fresh, unlocked] = await Promise.all([refreshUser(), getUnlockedChapters()]);
      if (fresh) {
        setUserInfo({ id: String(fresh.id), username: fresh.username });
        setUserCoins(fresh.coins || 0);
      } else if (!getStoredToken()) {
        setUserInfo({ id: "", username: "" });
        setUserCoins(0);
        setPurchasedIds(new Set<string>());
        return;
      }
      setPurchasedIds(unlocked);
    } else {
      setPurchasedIds(new Set<string>());
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setChapters([]);
    setRelated([]);

    const fetchData = async () => {
      try {
        const mangaData = await getMangaById(id);
        if (!mangaData) {
          setError("Manga no encontrado.");
          setLoading(false);
          setChaptersLoading(false);
          return;
        }
        setManga(mangaData);
        setLoading(false);

        const mangaPostId = mangaData.eroSeri || mangaData.id;

        // Capítulos + relacionados en paralelo
        setChaptersLoading(true);
        const [chapterData, relatedData] = await Promise.all([
          getChaptersBySeries(mangaPostId),
          getRelatedMangas(mangaPostId, 12),
        ]);
        setChapters(chapterData);
        setRelated(relatedData);
      } catch (err) {
        console.error("Error MangaDetail:", err);
        setError("No se pudo cargar el manga.");
        setLoading(false);
      } finally {
        setChaptersLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleReadFirst = () => {
    if (chapters.length === 0) return;
    const first = chapters[0];
    if (manga?.id && first?.id) {
      trackChapterView(first.id, manga.id);
    }
    navigate(`/read/${chapters[0].id}`);
  };

  const handlePurchaseSuccess = useCallback(() => {
    loadUser();
  }, [loadUser]);

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <Loader2 className="w-10 h-10 text-[#FF4D88] animate-spin" />
    </div>
  );

  if (error || !manga) return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-4 text-white px-4">
      <BookOpen size={48} className="text-white/20" />
      <p className="text-white/60 text-sm">{error || "Manga no encontrado."}</p>
      <button onClick={() => navigate(-1)} className="px-6 py-2 bg-[#FF4D88] text-white font-bold rounded-lg text-sm">
        Volver
      </button>
    </div>
  );

  const statusConfig = getStatusLabel(manga.status || "");
  const totalCh   = chapters.length;
  const now       = new Date();
  const freeCh    = chapters.filter(c => !c.is_paid || (!!c.free_at && new Date(c.free_at) <= now)).length;
  const paidCh    = totalCh - freeCh;
  const genres    = manga.genres || [];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">

      {/* ── HERO BANNER ──────────────────────────────────────────────────────── */}
      <div className="relative w-full h-[520px] lg:h-[560px] overflow-hidden">
        {/* Fondo borroso */}
        <div className="absolute inset-0 z-0">
          <img
            src={manga.portada}
            alt=""
            className="w-full h-full object-cover grayscale brightness-[0.3] blur-sm scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/80 via-transparent to-transparent hidden lg:block" />
        </div>

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-24 left-4 lg:left-10 z-30 w-10 h-10 rounded-full bg-black/60 backdrop-blur border border-white/10 flex items-center justify-center hover:bg-[#FF4D88] transition-colors"
        >
          <ArrowLeft size={18} />
        </button>

        {/* Contenido hero */}
        <div className="absolute inset-0 z-20 flex items-end">
          <div className="desktop-content-shell w-full max-w-[1400px] mx-auto px-4 lg:px-10 pb-8 flex flex-col lg:flex-row items-end gap-6">

            {/* Portada */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="hidden lg:block shrink-0 w-[160px] h-[240px] xl:w-[200px] xl:h-[290px] rounded-xl overflow-hidden shadow-2xl border-2 border-white/20"
            >
              <img src={manga.portada} alt={manga.titulo} className="w-full h-full object-cover" />
            </motion.div>

            {/* Info */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="flex-1 space-y-3"
            >
              {/* Badges tipo + status */}
              <div className="flex flex-wrap gap-2">
                <span className={`${getTypeColor(manga.tipo)} text-white text-[10px] font-black px-2.5 py-1 rounded uppercase tracking-wider`}>
                  {manga.tipo}
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded border uppercase tracking-wider ${statusConfig.color}`}>
                  {statusConfig.label}
                </span>
                {(manga.totalViews ?? 0) > 0 && (
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded border border-white/10 bg-white/5 text-white/60 uppercase">
                    <Eye size={10} /> {manga.totalViews?.toLocaleString()} vistas
                  </span>
                )}
              </div>

              {/* Título */}
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-[900] italic uppercase tracking-tighter leading-tight text-white drop-shadow-lg line-clamp-3">
                {manga.titulo}
              </h1>

              {/* Géneros */}
              {genres.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {genres.slice(0, 8).map((g, i) => (
                    <span key={i} className="text-[10px] font-semibold text-white/60 bg-white/5 border border-white/10 px-2 py-0.5 rounded">
                      {g}
                    </span>
                  ))}
                </div>
              )}

              {/* Estadísticas rápidas */}
              <div className="flex flex-wrap gap-3 text-[11px] font-bold text-white/50 uppercase tracking-wider">
                <span className="flex items-center gap-1"><BookOpen size={12} /> {totalCh} Capítulos</span>
                <span className="flex items-center gap-1 text-emerald-400"><CheckCircle size={12} /> {freeCh} Gratis</span>
                {paidCh > 0 && <span className="flex items-center gap-1 text-yellow-400"><Star size={12} /> {paidCh} Premium</span>}
                <span className="flex items-center gap-1"><Clock size={12} /> {manga.fecha}</span>
              </div>

              {/* Botones */}
              <div className="flex flex-wrap gap-3 pt-1">
                <button
                  onClick={handleReadFirst}
                  disabled={chaptersLoading || chapters.length === 0}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#FF4D88] hover:bg-pink-600 text-white font-black uppercase tracking-wider text-sm rounded-lg transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-[#FF4D88]/20"
                >
                  <Play size={16} fill="currentColor" /> Leer Ahora
                </button>
                <button
                  onClick={() => setIsBookmarked(p => !p)}
                  className={`flex items-center gap-2 px-5 py-2.5 font-black uppercase tracking-wider text-sm rounded-lg border transition-all active:scale-95 ${isBookmarked ? 'bg-white/10 border-white text-white' : 'bg-transparent border-white/20 text-white/70 hover:bg-white/5'}`}
                >
                  {isBookmarked ? <BookMarked size={16} /> : <Bookmark size={16} />}
                  {isBookmarked ? "Guardado" : "Guardar"}
                </button>
              </div>
            </motion.div>

          </div>
        </div>
      </div>

      {/* ── CUERPO ─────────────────────────────────────────────────────────── */}
      <div className="desktop-content-shell w-full max-w-[1400px] mx-auto px-4 lg:px-10 py-8 space-y-8">

        {/* Portada móvil */}
        <div className="flex lg:hidden justify-center -mt-16 relative z-20">
          <div className="w-[130px] h-[190px] rounded-xl overflow-hidden shadow-2xl border-2 border-white/20">
            <img src={manga.portada} alt={manga.titulo} className="w-full h-full object-cover" />
          </div>
        </div>

        {/* Sinopsis */}
        {manga.descripcion && (
          <div className="border-l-4 border-[#FF4D88] pl-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-[#FF4D88] mb-2">Sinopsis</h2>
            <p className="text-white/70 text-[14px] leading-relaxed">{manga.descripcion}</p>
          </div>
        )}

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: <BookOpen size={16} />, label: "Total", value: `${totalCh} Cap.`, color: "text-white" },
            { icon: <CheckCircle size={16} />, label: "Gratis", value: `${freeCh}`, color: "text-emerald-400" },
            { icon: <Star size={16} />, label: "Premium", value: `${paidCh}`, color: "text-yellow-400" },
            { icon: <Flame size={16} />, label: "Estado", value: statusConfig.label, color: "text-blue-400" },
          ].map((stat, i) => (
            <div key={i} className="bg-[#111] border border-white/5 rounded-xl px-4 py-3 flex items-center gap-3">
              <span className={`${stat.color} opacity-70`}>{stat.icon}</span>
              <div>
                <p className="text-[10px] text-white/30 uppercase tracking-wider font-bold">{stat.label}</p>
                <p className={`text-sm font-black ${stat.color}`}>{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Géneros expandidos */}
        {genres.length > 0 && (
          <div>
            <h2 className="text-xs font-black uppercase tracking-widest text-white/40 mb-3">Géneros</h2>
            <div className="flex flex-wrap gap-2">
              {genres.map((g, i) => (
                <Link
                  key={i}
                  to={`/biblioteca?genre=${encodeURIComponent(g)}`}
                  className="text-[11px] font-semibold text-[#FF4D88] bg-[#FF4D88]/10 border border-[#FF4D88]/20 px-3 py-1 rounded-full hover:bg-[#FF4D88]/20 transition-colors"
                >
                  {g}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Lista de capítulos */}
        {chaptersLoading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-white/30">
            <Loader2 className="animate-spin" size={20} />
            <span className="text-sm font-bold uppercase tracking-widest">Cargando capítulos...</span>
          </div>
        ) : chapters.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-white/30">
            <BookOpen size={36} />
            <p className="text-sm font-bold uppercase tracking-widest">Sin capítulos disponibles</p>
          </div>
        ) : (
          <ChapterList
            chapters={chapters}
            purchasedChapterIds={purchasedIds}
            userCoins={userCoins}
            userInfo={userInfo}
            onPurchaseSuccess={handlePurchaseSuccess}
          />
        )}

        {/* ── LECTURAS RELACIONADAS ──────────────────────────────────────── */}
        {related.length > 0 && (
          <RelatedSection related={related} currentId={manga.id} />
        )}

      </div>
    </div>
  );
};
