import { useDeferredValue, useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  BookOpen,
  ChevronDown,
  Clock,
  Mars,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Star,
  Venus,
  X,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Footer } from "../components/layout";
import { PaginationControls } from "../components/common";
import { useTheme } from "../hooks/useTheme";
import { getUltimosCapitulos } from "../services/mangaService";
import { preloadImages } from "../utils/preloadImages";
import type { MangaCapitulo } from "../types/manga";

const ITEMS_PER_PAGE = 30;
type Audience = "Hombre" | "Mujer";

const normalizeSearchValue = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("es")
  .trim();

const getAudience = (value: unknown): Audience | null => {
  if (typeof value !== "string") return null;
  const normalized = normalizeSearchValue(value);
  if (["hombre", "masculino", "men"].includes(normalized)) return "Hombre";
  if (["mujer", "femenino", "women"].includes(normalized)) return "Mujer";
  return null;
};

type IdleWindow = Window & typeof globalThis & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

type NetworkNavigator = Navigator & {
  connection?: { saveData?: boolean; effectiveType?: string };
};

type FlipClockTileProps = {
  isLight: boolean;
  label: string;
  previousValue: string;
  value: string;
};

const FlipClockTile = ({ isLight, label, previousValue, value }: FlipClockTileProps) => {
  const hasChanged = previousValue !== value;
  const digitClassName = `absolute inset-x-0 flex h-[200%] items-center justify-center font-mono text-[clamp(1.55rem,8vw,2.25rem)] font-black leading-none tracking-[-0.1em] lg:text-[1.95rem] ${isLight ? "text-zinc-950" : "text-white"}`;
  const topFace = isLight ? "bg-white" : "bg-[#303034]";
  const bottomFace = isLight ? "bg-[#d9d9dc]" : "bg-[#202024]";

  return (
    <div
      role="img"
      aria-label={`${label}: ${value}`}
      className={`library-flip-tile relative aspect-[1.25] min-w-0 overflow-hidden rounded-[10px] border transition-colors duration-300 ${isLight ? "border-black/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_5px_10px_rgba(15,23,42,.1)]" : "border-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,.11),0_6px_12px_rgba(0,0,0,.28)]"}`}
    >
      <span aria-hidden="true" className={`absolute inset-x-0 top-0 h-1/2 overflow-hidden ${topFace}`}>
        <span className={`${digitClassName} top-0`}>{value}</span>
      </span>
      <span aria-hidden="true" className={`absolute inset-x-0 bottom-0 h-1/2 overflow-hidden ${bottomFace}`}>
        <span className={`${digitClassName} bottom-0`}>{value}</span>
      </span>

      {hasChanged && (
        <>
          <span aria-hidden="true" className={`library-flip-old-bottom absolute inset-x-0 bottom-0 h-1/2 overflow-hidden ${bottomFace}`}>
            <span className={`${digitClassName} bottom-0`}>{previousValue}</span>
          </span>
          <span key={`top-${label}-${value}`} aria-hidden="true" className={`library-flip-top-out absolute inset-x-0 top-0 h-1/2 overflow-hidden ${topFace}`}>
            <span className={`${digitClassName} top-0`}>{previousValue}</span>
            <span className="library-flip-top-shadow absolute inset-0" />
          </span>
          <span key={`bottom-${label}-${value}`} aria-hidden="true" className={`library-flip-bottom-in absolute inset-x-0 bottom-0 h-1/2 overflow-hidden ${bottomFace}`}>
            <span className={`${digitClassName} bottom-0`}>{value}</span>
            <span className="library-flip-bottom-shadow absolute inset-0" />
          </span>
        </>
      )}

      <span aria-hidden="true" className={`absolute inset-x-0 top-1/2 z-10 h-px ${isLight ? "bg-black/20 shadow-[0_1px_0_rgba(255,255,255,.65)]" : "bg-black/70 shadow-[0_1px_0_rgba(255,255,255,.05)]"}`} />
    </div>
  );
};

const BibliotecaClock = ({ isLight }: { isLight: boolean }) => {
  const [clockTime, setClockTime] = useState(() => {
    const initialTime = new Date();
    return { current: initialTime, previous: initialTime };
  });

  useEffect(() => {
    let timer = 0;
    const tick = () => {
      setClockTime(({ current }) => ({ current: new Date(), previous: current }));
      timer = window.setTimeout(tick, 1000 - (Date.now() % 1000));
    };

    timer = window.setTimeout(tick, 1000 - (Date.now() % 1000));
    return () => window.clearTimeout(timer);
  }, []);

  const timeParts = [
    {
      label: "Horas",
      previousValue: clockTime.previous.getHours().toString().padStart(2, "0"),
      value: clockTime.current.getHours().toString().padStart(2, "0"),
    },
    {
      label: "Minutos",
      previousValue: clockTime.previous.getMinutes().toString().padStart(2, "0"),
      value: clockTime.current.getMinutes().toString().padStart(2, "0"),
    },
    {
      label: "Segundos",
      previousValue: clockTime.previous.getSeconds().toString().padStart(2, "0"),
      value: clockTime.current.getSeconds().toString().padStart(2, "0"),
    },
  ];
  const dateLabel = clockTime.current.toLocaleDateString("es-PE", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className={`rounded-[18px] border p-2 transition-colors duration-300 ${isLight ? "border-black/10 bg-[#f1f1f3] shadow-[0_0_0_2px_rgba(251,146,60,.12),0_12px_26px_rgba(15,23,42,.11)]" : "border-white/10 bg-[#050505] shadow-[0_0_0_2px_rgba(251,146,60,.18),0_14px_30px_rgba(0,0,0,.3)]"}`}>
      <div className="grid grid-cols-3 gap-1.5">
        {timeParts.map((part) => (
          <FlipClockTile key={part.label} {...part} isLight={isLight} />
        ))}
      </div>
      <p className={`anta-library-date mt-2 text-center text-[10px] capitalize sm:text-[11px] ${isLight ? "text-zinc-700" : "text-white/80"}`}>
        {dateLabel}
      </p>
    </div>
  );
};

export const Biblioteca = () => {
  const [allItems, setAllItems] = useState<MangaCapitulo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAudience, setSelectedAudience] = useState<Audience | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const location = useLocation();
  const { theme } = useTheme();
  const isLight = theme === "light";
  const isMasculine = selectedAudience === "Hombre";
  const accentColor = isMasculine ? "#00C2FF" : "#FF4D88";
  const deferredSearchTerm = useDeferredValue(searchTerm);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Biblioteca Mukai — MangaMukai";
    return () => { document.title = previousTitle; };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const audienceFromUrl = getAudience(params.get("audience"));
    const genreFromUrl = params.get("genre");
    const searchFromNavigation = location.state?.searchTerm;
    const filterFromNavigation = location.state?.filterCategory;
    const audienceFromNavigation = getAudience(filterFromNavigation);
    const audienceFromGenre = getAudience(genreFromUrl);

    setSearchTerm(typeof searchFromNavigation === "string" ? searchFromNavigation : "");
    setSelectedAudience(audienceFromUrl || audienceFromNavigation || audienceFromGenre);

    if (typeof filterFromNavigation === "string" && !audienceFromNavigation) {
      setSelectedTag(filterFromNavigation);
    } else if (genreFromUrl && !audienceFromGenre) {
      setSelectedTag(genreFromUrl);
    } else {
      setSelectedTag(null);
    }

    setCurrentPage(1);
    window.history.replaceState({}, document.title);
  }, [location.key, location.search, location.state]);

  useEffect(() => {
    let cancelled = false;

    const loadLibrary = async () => {
      setLoading(true);
      const data = await getUltimosCapitulos();
      if (cancelled) return;

      setAllItems(data);
      const tags = new Set<string>();
      data.forEach((manga) => {
        (manga.genres || []).forEach((genre) => { if (genre) tags.add(genre); });
        if (manga.tipo) tags.add(manga.tipo);
      });
      setAvailableTags(Array.from(tags).sort((a, b) => a.localeCompare(b, "es")));
      setLoading(false);
    };

    void loadLibrary();
    return () => { cancelled = true; };
  }, []);

  const items = useMemo(() => {
    let filtered = allItems;

    if (deferredSearchTerm.trim()) {
      const terms = normalizeSearchValue(deferredSearchTerm).split(/\s+/).filter(Boolean);
      filtered = filtered.filter((manga) => {
        const searchableMetadata = normalizeSearchValue([
          manga.titulo,
          manga.tipo,
          manga.genero,
          ...(manga.genres || []),
        ].filter(Boolean).join(" "));

        return terms.every((term) => searchableMetadata.includes(term));
      });
    }

    if (selectedAudience) {
      filtered = filtered.filter((manga) => manga.genero === selectedAudience);
    }

    if (selectedTag) {
      filtered = filtered.filter((manga) => (
        (manga.genres || []).includes(selectedTag) || manga.tipo === selectedTag
      ));
    }

    return filtered;
  }, [allItems, deferredSearchTerm, selectedAudience, selectedTag]);

  const totalPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));
  const pageStart = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageItems = items.slice(pageStart, pageStart + ITEMS_PER_PAGE);
  const sortedTags = availableTags.filter((tag) => !getAudience(tag));
  const hasFilters = Boolean(searchTerm || selectedAudience || selectedTag);
  const resultsTitle = selectedTag
    || (selectedAudience === "Mujer" ? "Mangas para mujeres" : null)
    || (selectedAudience === "Hombre" ? "Mangas para hombres" : null)
    || (searchTerm ? "Resultados" : "Todos los mangas");

  useEffect(() => {
    if (loading || items.length <= currentPage * ITEMS_PER_PAGE) return;

    const connection = (navigator as NetworkNavigator).connection;
    if (connection?.saveData || connection?.effectiveType?.includes("2g")) return;

    const nextPageStart = currentPage * ITEMS_PER_PAGE;
    const followingPageStart = (currentPage + 1) * ITEMS_PER_PAGE;
    const sources = [
      ...items.slice(nextPageStart, nextPageStart + 6),
      ...items.slice(followingPageStart, followingPageStart + 4),
    ].map((manga) => manga.portada).filter(Boolean);

    if (sources.length === 0) return;

    let cancelled = false;
    let timeoutId: number | undefined;
    let idleId: number | undefined;
    const idleWindow = window as IdleWindow;
    const warmNextPages = () => {
      if (!cancelled) void preloadImages(sources);
    };

    if (idleWindow.requestIdleCallback) {
      idleId = idleWindow.requestIdleCallback(warmNextPages, { timeout: 1600 });
    } else {
      timeoutId = window.setTimeout(warmNextPages, 700);
    }

    return () => {
      cancelled = true;
      if (idleId !== undefined) idleWindow.cancelIdleCallback?.(idleId);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [currentPage, items, loading]);

  const selectAudience = (audience: Audience) => {
    setSelectedAudience((current) => current === audience ? null : audience);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedAudience(null);
    setSelectedTag(null);
    setCurrentPage(1);
  };

  return (
    <div className={`relative flex min-h-screen flex-col overflow-x-clip font-sans transition-colors duration-300 ${isLight ? "bg-white text-zinc-950" : "bg-black text-gray-100"}`}>
      <section
        className="relative transition-colors duration-300"
        style={{
          backgroundImage: isLight
            ? `radial-gradient(circle at 50% -20%, ${isMasculine ? "rgba(0,194,255,.15)" : "rgba(255,77,136,.13)"}, transparent 40%)`
            : `radial-gradient(circle at 50% -20%, ${isMasculine ? "rgba(0,194,255,.16)" : "rgba(255,77,136,.15)"}, transparent 40%)`,
        }}
      >
        <div className="desktop-content-shell relative mx-auto w-full px-4 pb-7 pt-28 text-center sm:px-8 sm:pb-8 sm:pt-36 lg:px-16">
          <div className={`mb-5 inline-flex items-center rounded-full border px-4 py-2 font-['Poppins'] text-xs font-[800] normal-case tracking-normal sm:text-sm ${isLight ? "border-black/10 bg-white/75 text-black/65 shadow-sm" : "border-white/10 bg-white/[0.04] text-white/70"}`}>
            Todo lo mejor para ti
          </div>
          <h1 className={`mx-auto flex max-w-full flex-wrap items-baseline justify-center gap-x-[0.2em] text-[clamp(1.85rem,8.2vw,2.45rem)] font-[1000] uppercase italic leading-[0.92] tracking-[-0.065em] drop-shadow-lg sm:text-[clamp(3rem,7vw,5.35rem)] ${isLight ? "text-zinc-950" : "text-white"}`}>
            <span>Biblioteca</span>
            <span className={isMasculine ? "pr-[0.08em] text-[#00C2FF]" : "pr-[0.08em] text-[#FF4D88]"}>Mukai</span>
          </h1>
          <p className={`mx-auto mt-5 max-w-2xl text-sm leading-relaxed sm:text-base ${isLight ? "text-zinc-600" : "text-zinc-400"}`}>
            Busca por título, explora géneros y encuentra tu próxima historia en un solo lugar
          </p>
        </div>
      </section>

      <div className="desktop-content-shell mx-auto grid w-full flex-1 gap-7 px-4 pb-16 pt-4 sm:px-8 lg:grid-cols-[270px_minmax(0,1fr)] lg:gap-9 lg:px-16 lg:pt-6">
        <aside id="filtros" className="scroll-mt-24 lg:self-start">
          <div className={`space-y-5 rounded-3xl border p-4 transition-colors duration-300 sm:p-5 lg:sticky lg:top-6 ${isLight ? "border-black/[0.09] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.09)]" : "border-white/[0.08] bg-[#0b0b0e] shadow-[0_24px_70px_rgba(0,0,0,0.28)]"}`}>
            <div className={`flex items-center justify-between border-b pb-4 ${isLight ? "border-black/[0.08]" : "border-white/[0.07]"}`}>
              <h2 className={`audiowide-library text-xl leading-tight ${isLight ? "text-zinc-950" : "text-white"}`}>Busca tu manga favorito</h2>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border" style={{ color: accentColor, borderColor: `${accentColor}40`, backgroundColor: `${accentColor}16` }}>
                <Clock size={18} />
              </div>
            </div>

            <BibliotecaClock isLight={isLight} />

            <label className="group relative block">
              <span className="sr-only">Buscar manga</span>
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors group-focus-within:text-[var(--accent)]" size={18} style={{ "--accent": accentColor } as CSSProperties} />
              <input
                type="search"
                placeholder="Buscar manga..."
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setCurrentPage(1);
                }}
                className={`w-full rounded-2xl border py-3.5 pl-11 pr-10 text-sm outline-none transition caret-[var(--accent)] selection:bg-[var(--accent)] selection:text-white focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)] placeholder:text-zinc-500 ${isLight ? "border-black/10 bg-zinc-50 text-black" : "border-white/10 bg-black/35 text-white"}`}
                style={{ "--accent": accentColor, "--accent-ring": `${accentColor}26` } as CSSProperties}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => { setSearchTerm(""); setCurrentPage(1); }}
                  aria-label="Borrar búsqueda"
                  className={`absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 transition ${isLight ? "text-black/40 hover:bg-black/5 hover:text-black" : "text-white/35 hover:bg-white/10 hover:text-white"}`}
                >
                  <X size={14} />
                </button>
              )}
            </label>

            <div>
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setFiltersOpen((open) => !open)}
                  aria-expanded={filtersOpen}
                  aria-controls="biblioteca-filter-options"
                  className={`open-sans-library-filters flex min-h-11 flex-1 items-center justify-between rounded-xl border px-3 text-sm font-bold normal-case tracking-normal transition ${isLight ? "border-black/[0.09] bg-zinc-50 text-zinc-700 hover:bg-zinc-100" : "border-white/[0.08] bg-white/[0.035] text-zinc-300 hover:border-white/20 hover:text-white"}`}
                >
                  <span className="flex items-center gap-2"><SlidersHorizontal size={16} style={{ color: accentColor }} /> Filtros</span>
                  <ChevronDown size={15} className={`transition-transform duration-200 ${filtersOpen ? "rotate-180" : ""}`} />
                </button>
                <button
                  type="button"
                  onClick={clearFilters}
                  disabled={!hasFilters}
                  aria-label="Limpiar filtros"
                  title="Limpiar filtros"
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition disabled:cursor-not-allowed disabled:opacity-25 ${isLight ? "border-black/[0.09] bg-zinc-50 text-zinc-600 hover:bg-zinc-100" : "border-white/[0.08] bg-white/[0.035] text-zinc-300 hover:bg-white/[0.08]"}`}
                >
                  <RotateCcw size={16} strokeWidth={2.6} />
                </button>
              </div>

              {filtersOpen && (
                <div id="biblioteca-filter-options" className={`mt-4 max-h-[320px] space-y-5 overflow-y-auto overscroll-contain border-t pr-1 pt-4 [scrollbar-width:thin] sm:max-h-[380px] lg:max-h-[430px] ${isLight ? "border-black/[0.08]" : "border-white/[0.07]"}`}>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { audience: "Hombre" as const, label: "Masculino", icon: Mars, color: "#00C2FF" },
                      { audience: "Mujer" as const, label: "Femenino", icon: Venus, color: "#FF4D88" },
                    ]).map(({ audience, label, icon: AudienceIcon, color }) => {
                      const isActive = selectedAudience === audience;
                      return (
                        <button
                          key={audience}
                          type="button"
                          aria-label={label}
                          title={label}
                          aria-pressed={isActive}
                          onClick={() => selectAudience(audience)}
                          className="flex min-h-12 items-center justify-center rounded-xl border transition duration-200 hover:-translate-y-0.5"
                          style={isActive
                            ? {
                              borderColor: color,
                              backgroundColor: isLight ? "#111216" : "#ffffff",
                              color: isLight ? "#ffffff" : "#111216",
                              boxShadow: `0 0 0 2px ${color}45, 0 9px 22px ${color}2e`,
                            }
                            : {
                              borderColor: `${color}70`,
                              backgroundColor: `${color}${isLight ? "16" : "20"}`,
                              color,
                            }}
                        >
                          <AudienceIcon size={22} strokeWidth={3.5} />
                        </button>
                      );
                    })}
                  </div>

                  {availableTags.length > 0 && (
                    <div>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
                        {sortedTags.map((tag) => {
                          const isActive = selectedTag === tag;
                          return (
                            <button
                              key={tag}
                              type="button"
                              aria-pressed={isActive}
                              onClick={() => {
                                setSelectedTag(isActive ? null : tag);
                                setCurrentPage(1);
                              }}
                              className={`open-sans-library-filters flex min-h-11 items-center justify-center rounded-lg border px-2 py-2 text-center text-xs font-bold normal-case leading-tight tracking-normal transition ${isActive ? "" : isLight ? "border-black/[0.09] bg-zinc-50 text-zinc-600 hover:border-black/20 hover:text-black" : "border-white/[0.08] bg-white/[0.035] text-zinc-400 hover:border-white/20 hover:text-white"}`}
                              style={isActive ? { borderColor: accentColor, backgroundColor: accentColor, color: isMasculine ? "#001018" : "#fff", boxShadow: `0 8px 24px ${accentColor}30` } : undefined}
                            >
                              {tag}
                            </button>
                          );
                        })}
                      </div>

                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </aside>

        <main id="biblioteca-anchor" className="min-w-0 scroll-mt-24">
          <div className={`mb-5 border-b pb-5 text-center ${isLight ? "border-black/[0.08]" : "border-white/[0.08]"}`}>
            <h2 className={`google-sans-library text-2xl font-black uppercase tracking-tight sm:text-3xl ${isLight ? "text-zinc-950" : "text-white"}`}>
              {resultsTitle}
            </h2>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 xl:grid-cols-5">
              {Array.from({ length: 10 }).map((_, index) => (
                <div key={index} className={`aspect-[2/3] animate-pulse rounded-2xl ${isLight ? "bg-black/[0.06]" : "bg-white/[0.06]"}`} />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className={`flex min-h-[420px] flex-col items-center justify-center gap-4 rounded-3xl border border-dashed px-6 text-center ${isLight ? "border-black/10 bg-zinc-50" : "border-white/10 bg-white/[0.02]"}`}>
              <div className={`flex h-16 w-16 items-center justify-center rounded-2xl border ${isLight ? "border-black/10 bg-white" : "border-white/10 bg-white/[0.04]"}`}>
                <BookOpen size={28} className={isLight ? "text-black/30" : "text-white/25"} />
              </div>
              <div>
                <h3 className={`text-lg font-black ${isLight ? "text-zinc-950" : "text-white"}`}>No encontramos coincidencias</h3>
                <p className="mt-1 text-sm text-zinc-500">Prueba otro título o elimina los filtros activos</p>
              </div>
              <button onClick={clearFilters} className={`rounded-full px-5 py-2.5 text-[10px] font-black uppercase tracking-wider transition ${isLight ? "bg-black text-white hover:bg-zinc-800" : "bg-white text-black hover:bg-zinc-200"}`}>
                Ver toda la biblioteca
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 xl:grid-cols-5">
                {pageItems.map((manga, index) => (
                  <Link
                    to={`/manga/${manga.id}`}
                    key={manga.id}
                    className={`group relative block min-w-0 overflow-hidden rounded-2xl border shadow-[0_14px_34px_rgba(0,0,0,0.18)] transition duration-300 hover:-translate-y-1 ${isLight ? "border-black/10 bg-white" : "border-white/[0.09] bg-[#0d0d11]"}`}
                    style={{ "--card-accent": accentColor } as CSSProperties}
                  >
                    <div className="relative aspect-[2/3] w-full overflow-hidden bg-zinc-900">
                      <img
                        src={manga.portada}
                        alt={manga.titulo}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
                        loading={index < 6 ? "eager" : "lazy"}
                        decoding="async"
                      />
                      <div className={isLight ? "absolute inset-x-0 bottom-0 h-[36%] bg-gradient-to-t from-white via-white/85 to-transparent" : "absolute inset-0 bg-gradient-to-t from-black via-black/65 to-transparent opacity-90 transition-opacity duration-300"} />
                      <div className={`absolute left-2 top-2 flex items-center gap-1 rounded-md border px-1.5 py-1 text-[8px] font-black shadow-lg backdrop-blur-md sm:left-2.5 sm:top-2.5 sm:text-[9px] ${isLight ? "border-black/10 bg-white/85 text-zinc-950" : "border-white/15 bg-black/70 text-white"}`}>
                        <Star size={10} className="fill-yellow-400 text-yellow-400" /> 10
                      </div>
                      {manga.tipo && (
                        <span className={`absolute right-2 top-2 max-w-[48%] truncate rounded-md border px-1.5 py-1 text-[8px] font-black uppercase shadow-lg backdrop-blur-md sm:right-2.5 sm:top-2.5 sm:text-[9px] ${isLight ? "border-black/10 bg-white/85 text-zinc-950" : "border-white/15 bg-black/70 text-white"}`}>
                          {manga.tipo}
                        </span>
                      )}
                      <div className="absolute inset-x-0 bottom-0 px-3 pb-3 pt-12 sm:px-4 sm:pb-4">
                        <h3 className={`line-clamp-2 text-center text-[11px] font-[900] uppercase leading-snug tracking-tight transition-colors group-hover:text-[var(--card-accent)] sm:text-xs ${isLight ? "text-zinc-950 [text-shadow:0_1px_10px_rgba(255,255,255,.95)]" : "text-white [text-shadow:0_2px_12px_rgba(0,0,0,.95)]"}`}>
                          {manga.titulo}
                        </h3>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {totalPages > 1 && (
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  accent={isMasculine ? "blue" : "pink"}
                  scrollTargetId="biblioteca-anchor"
                  theme={isLight ? "light" : "dark"}
                />
              )}
            </>
          )}
        </main>
      </div>

      <Footer />
    </div>
  );
};
