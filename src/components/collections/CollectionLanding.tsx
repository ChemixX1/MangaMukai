import { useEffect, useMemo, useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, Eye, Flame, LockKeyhole, Play, Star, Tag } from "lucide-react";
import { Link } from "react-router-dom";
import { MangaMetaBar } from "../common";
import { getLatestMenMangas, getPopularWomenByViews, getUltimosCapitulos } from "../../services/mangaService";
import type { MangaCapitulo } from "../../types/manga";

type CollectionVariant = "mono" | "adult";

interface CollectionLandingProps {
  variant: CollectionVariant;
}

const themes = {
  mono: {
    eyebrow: "Manga en blanco y negro",
    title: "MANGAS B&N",
    description: "Historias clásicas, acción y tinta pura en una colección pensada para lectores de manga tradicional.",
    accent: "#00C2FF",
    badge: "B&N",
    page: "bg-[#080b10]",
    glow: "from-cyan-500/15",
    button: "bg-[#00C2FF] text-black hover:bg-white",
    border: "border-cyan-400/30",
  },
  adult: {
    eyebrow: "Contenido exclusivo",
    title: "MANGAS +19",
    description: "Una selección madura con romance, drama y fantasía para lectores adultos.",
    accent: "#FF4D88",
    badge: "+19",
    page: "bg-[#0b0509]",
    glow: "from-pink-500/15",
    button: "bg-[#FF4D88] text-white hover:bg-white hover:text-black",
    border: "border-pink-400/30",
  },
} as const;

const adultPattern = /\+19|adult|ecchi|hentai|hot|er[oó]tico|maduro|harem|yuri/i;
const monoPattern = /b\/?n|blanco|negro|shounen|seinen|acci[oó]n|manga juvenil/i;

function belongsToCollection(manga: MangaCapitulo, variant: CollectionVariant) {
  const searchable = [manga.tipo, manga.genero, ...(manga.genres || [])].filter(Boolean).join(" ");
  return (variant === "adult" ? adultPattern : monoPattern).test(searchable);
}

function uniqueMangas(items: MangaCapitulo[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = String(item.eroSeri || item.id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function formatViews(value = 0) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

function AdultGate({ onAccept }: { onAccept: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] grid place-items-center bg-black/95 px-5 backdrop-blur-xl">
      <div className="w-full max-w-md border border-pink-500/30 bg-[#12070d] p-8 text-center shadow-[0_0_90px_rgba(255,77,136,0.2)]">
        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full border border-pink-500/30 bg-pink-500/10"><LockKeyhole className="text-[#FF4D88]" /></div>
        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.4em] text-[#FF4D88]">Contenido adulto</p>
        <h2 className="mb-4 text-3xl font-black uppercase italic text-white">+18 años</h2>
        <p className="mb-8 text-sm leading-relaxed text-white/60">Al continuar confirmas que tienes 18 años o más y que este contenido es legal en tu país.</p>
        <button onClick={onAccept} className="w-full bg-[#FF4D88] px-5 py-4 text-xs font-black uppercase tracking-widest text-white transition hover:bg-white hover:text-black">Tengo +18 años — Entrar</button>
        <Link to="/" className="mt-4 block text-[10px] font-bold uppercase tracking-widest text-white/30 hover:text-white">Salir</Link>
      </div>
    </div>
  );
}

export function CollectionLanding({ variant }: CollectionLandingProps) {
  const theme = themes[variant];
  const [mangas, setMangas] = useState<MangaCapitulo[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeGenre, setActiveGenre] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [adultAccepted, setAdultAccepted] = useState(() => variant !== "adult" || sessionStorage.getItem("mm_adult_ok") === "1");

  useEffect(() => {
    let mounted = true;
    Promise.all([getUltimosCapitulos(), getPopularWomenByViews("historical")])
      .then(([catalog, popular]) => {
        if (!mounted) return;
        const all = uniqueMangas([...catalog, ...popular]);
        const matching = all.filter((manga) => belongsToCollection(manga, variant));
        setMangas(matching.length >= 6 ? matching : all);
      })
      .finally(() => mounted && setLoading(false));

    getLatestMenMangas().then((latestMen) => {
      if (!mounted || latestMen.length === 0) return;
      setMangas((current) => {
        const all = uniqueMangas([...current, ...latestMen]);
        const matching = all.filter((manga) => belongsToCollection(manga, variant));
        return matching.length >= 6 ? matching : all;
      });
    });
    return () => { mounted = false; };
  }, [variant]);

  useEffect(() => {
    if (mangas.length < 2) return;
    const timer = window.setInterval(() => setActiveIndex((current) => (current + 1) % Math.min(mangas.length, 8)), 6000);
    return () => window.clearInterval(timer);
  }, [mangas.length]);

  const genres = useMemo(() => {
    const values = new Set<string>();
    mangas.forEach((manga) => manga.genres?.forEach((genre) => values.add(genre)));
    return [...values].sort((a, b) => a.localeCompare(b, "es")).slice(0, 8);
  }, [mangas]);

  const visibleMangas = useMemo(() => activeGenre
    ? mangas.filter((manga) => manga.genres?.some((genre) => genre.toLowerCase() === activeGenre.toLowerCase()))
    : mangas, [activeGenre, mangas]);

  const heroItems = mangas.slice(0, 8);
  const active = heroItems[activeIndex % Math.max(heroItems.length, 1)];

  const acceptAdult = () => {
    sessionStorage.setItem("mm_adult_ok", "1");
    setAdultAccepted(true);
  };

  return (
    <main className={`min-h-screen overflow-hidden text-white ${theme.page}`}>
      {variant === "adult" && !adultAccepted && <AdultGate onAccept={acceptAdult} />}
      <section className="relative min-h-[790px] overflow-hidden">
        {active?.portada && <img src={active.portada} alt="" className="absolute inset-0 h-full w-full scale-105 object-cover grayscale brightness-[0.28] blur-sm" />}
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#080b10] via-transparent to-black/30" />
        <div className="relative z-10 mx-auto flex min-h-[790px] max-w-[1500px] flex-col items-center gap-12 px-5 pb-20 pt-32 lg:flex-row lg:px-16">
          <div className="order-2 w-full lg:order-1 lg:w-[47%]">
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 text-[11px] font-black uppercase tracking-widest text-white" style={{ backgroundColor: theme.accent }}>{theme.badge}</span>
              <span className="flex items-center gap-1 border border-white/15 bg-black/30 px-3 py-1 text-[11px] font-black uppercase tracking-wider"><Eye size={12} /> {formatViews(active?.totalViews)}</span>
            </div>
            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.35em]" style={{ color: theme.accent }}>{theme.eyebrow}</p>
            <h1 className="mb-6 line-clamp-3 text-4xl font-black uppercase italic leading-[0.95] tracking-tighter sm:text-5xl lg:text-6xl">{active?.titulo || theme.title}</h1>
            <div className="mb-6 border border-white/10 bg-black/35 p-6 backdrop-blur" style={{ borderLeft: `4px solid ${theme.accent}` }}>
              <p className="line-clamp-5 text-sm font-medium leading-7 text-white/75 sm:text-base">{active?.descripcion || theme.description}</p>
            </div>
            <div className="mb-7 flex flex-wrap gap-2">{(active?.genres || [theme.badge]).slice(0, 4).map((genre) => <span key={genre} className="bg-white px-3 py-1 text-[10px] font-black uppercase text-black">{genre}</span>)}</div>
            <div className="flex flex-wrap gap-4">
              <Link to={active ? `/manga/${active.id}` : "/catalog"} className={`flex items-center gap-2 px-7 py-4 text-xs font-black uppercase tracking-widest transition ${theme.button}`}><Play size={15} fill="currentColor" /> Leer ahora</Link>
              <Link to="/saved" className="flex items-center gap-2 border border-white/25 bg-black/30 px-7 py-4 text-xs font-black uppercase tracking-widest transition hover:bg-white hover:text-black"><BookOpen size={15} /> Guardar</Link>
            </div>
          </div>
          <div className="order-1 flex h-[430px] w-full items-center justify-center lg:order-2 lg:w-[53%]">
            {heroItems.length > 0 ? (
              <div className="relative flex h-full w-full max-w-[650px] items-center justify-center">
                {[activeIndex - 1, activeIndex, activeIndex + 1].map((index, position) => {
                  const item = heroItems[(index + heroItems.length) % heroItems.length];
                  return <img key={`${item.id}-${position}`} src={item.portada} alt={item.titulo} className={`absolute h-[330px] w-[220px] rounded-xl object-cover shadow-2xl transition-all duration-500 sm:h-[420px] sm:w-[280px] ${position === 1 ? "z-20 scale-100" : position === 0 ? "z-10 -translate-x-[55%] -rotate-6 scale-90 opacity-90" : "z-10 translate-x-[55%] rotate-6 scale-90 opacity-90"}`} />;
                })}
                <button onClick={() => setActiveIndex((activeIndex - 1 + heroItems.length) % heroItems.length)} className="absolute left-0 z-30 rounded-full border border-white/15 bg-black/60 p-3 hover:bg-white hover:text-black"><ChevronLeft /></button>
                <button onClick={() => setActiveIndex((activeIndex + 1) % heroItems.length)} className="absolute right-0 z-30 rounded-full border border-white/15 bg-black/60 p-3 hover:bg-white hover:text-black"><ChevronRight /></button>
              </div>
            ) : <div className="h-[420px] w-[280px] animate-pulse rounded-xl bg-white/5" />}
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-[1400px] px-5 py-16 lg:px-16">
        <div className="mb-8 flex items-end justify-between gap-5">
          <div><p className="mb-2 text-[10px] font-black uppercase tracking-[0.35em]" style={{ color: theme.accent }}>Explora la colección</p><h2 className="text-3xl font-black uppercase italic tracking-tight sm:text-4xl">{theme.title}</h2></div>
          <span className="text-xs font-bold text-white/40">{visibleMangas.length} títulos</span>
        </div>
        <div className="mb-12 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {genres.map((genre) => <button key={genre} onClick={() => setActiveGenre(activeGenre === genre ? null : genre)} className={`flex items-center gap-2 border p-4 text-left text-[10px] font-black uppercase tracking-wider transition ${activeGenre === genre ? `${theme.border} bg-white/10 text-white` : "border-white/10 text-white/50 hover:border-white/25 hover:text-white"}`}><Tag size={14} style={{ color: theme.accent }} /> {genre}</button>)}
        </div>
        {loading ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">{Array.from({ length: 12 }).map((_, index) => <div key={index} className="aspect-[3/4.6] animate-pulse rounded-xl bg-white/5" />)}</div> : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {visibleMangas.slice(0, 24).map((manga, index) => (
              <Link key={`${manga.id}-${index}`} to={`/manga/${manga.id}`} className="group overflow-hidden rounded-xl border border-white/10 bg-[#111318] shadow-xl transition hover:-translate-y-2 hover:border-white/25">
                <div className="relative aspect-[3/4.2] overflow-hidden">
                  <img src={manga.portada} alt={manga.titulo} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <span className="absolute bottom-2 right-2 px-2 py-1 text-[9px] font-black uppercase" style={{ backgroundColor: theme.accent }}>{manga.tipo || theme.badge}</span>
                  <span className="absolute right-2 top-2 flex items-center gap-1 bg-yellow-400 px-2 py-1 text-[9px] font-black text-black"><Star size={9} fill="currentColor" /> 9.{index % 8}</span>
                </div>
                <div className="flex h-[3rem] items-center justify-center px-3">
                  <h3 className="line-clamp-2 text-center text-[12px] font-black uppercase leading-tight transition" style={{ color: theme.accent }}>{manga.titulo}</h3>
                </div>
                <div className="space-y-px">{manga.capitulosRecientes.slice(0, 2).map((chapter) => (
                  <MangaMetaBar
                    key={chapter.id}
                    chapter={chapter.numero}
                    isFree={chapter.esGratis}
                    date={chapter.fecha}
                    accentClassName={variant === "adult" ? "text-[#FF4D88]" : "text-[#00C2FF]"}
                  />
                ))}</div>
              </Link>
            ))}
          </div>
        )}
      </section>
      <section className={`bg-gradient-to-b ${theme.glow} to-transparent py-16 text-center`}>
        <Flame className="mx-auto mb-4" style={{ color: theme.accent }} />
        <h2 className="mb-3 text-3xl font-black uppercase italic">¿Buscas algo diferente?</h2>
        <Link to="/catalog" className="text-xs font-black uppercase tracking-[0.25em] text-white/60 hover:text-white">Ver catálogo completo</Link>
      </section>
    </main>
  );
}
