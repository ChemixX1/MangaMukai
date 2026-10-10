import { useDeferredValue, useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link, useLocation } from "react-router-dom";
import { SearchEyeIcon } from "../components/layout/SearchIcons";
import { searchGenres } from "../config/searchAppearance";
import "../styles/search.css";
import { useTheme } from "../hooks/useTheme";
import { setSearchTerm, useSearchFilter, useSearchTerm, type SearchFilter } from "../hooks/useSearchTerm";
import { getCachedSearchCatalog, loadSearchCatalog } from "../services/searchCatalog";
import { displayViews } from "../utils/seriesViews";
import { toTitleCase } from "../utils/titleCase";
import { hasBlackWhiteTag, hasHotTag } from "../utils/womenBlackWhite";
import type { MangaCapitulo } from "../types/manga";

const RESULTS_PAGE_SIZE = 30;
const TOP_SEARCHED_COUNT = 4;
/* "Nuevos lanzamientos": uno grande y tres debajo. */
const NEW_RELEASES_COUNT = 4;
const DAY_MS = 86_400_000;

const normalizeSearchValue = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("es")
  .trim();

const filterCatalog = (catalog: MangaCapitulo[], term: string) => {
  const terms = normalizeSearchValue(term).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];
  return catalog.filter((manga) => {
    const haystack = normalizeSearchValue([manga.titulo, manga.tipo, ...(manga.genres || [])].filter(Boolean).join(" "));
    return terms.every((word) => haystack.includes(word));
  });
};

/** Pestaña activa bajo el buscador: todo, solo B&N o solo HOT. */
const matchesFilter = (manga: MangaCapitulo, filter: SearchFilter) =>
  filter === "todos" ? true : filter === "bn" ? hasBlackWhiteTag(manga) : hasHotTag(manga);

const formatViews = (views = 0) => {
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(views >= 10_000_000 ? 0 : 1).replace(/\.0$/, "")}M`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(views >= 10_000 ? 0 : 1).replace(/\.0$/, "")}K`;
  return String(views);
};

// Las fechas llegan como "2026-09-09 13:52:03"; Safari solo entiende la forma con "T".
const parseDate = (value?: string) => (value ? Date.parse(value.replace(" ", "T")) : Number.NaN);

/** NEW si la serie es reciente; UP si tuvo capítulo esta semana. */
const getFreshness = (manga: MangaCapitulo): "NEW" | "UP" | null => {
  const now = Date.now();
  const published = parseDate(manga.publishedAt);
  if (!Number.isNaN(published) && now - published < 14 * DAY_MS) return "NEW";
  const updated = parseDate(manga.rawFecha);
  if (!Number.isNaN(updated) && now - updated < 7 * DAY_MS) return "UP";
  return null;
};

const FreshnessBadge = ({ manga, className = "" }: { manga: MangaCapitulo; className?: string }) => {
  const freshness = getFreshness(manga);
  if (!freshness) return null;
  return (
    <span className={`inline-flex items-center px-1.5 py-[3px] text-[9px] font-black leading-none tracking-wide text-white ${freshness === "NEW" ? "bg-[#ff5c2b]" : "bg-[#ff2e4c]"} ${className}`}>
      {freshness}
    </span>
  );
};

/** Fecha de lanzamiento de la serie (o de su última subida si no la trae). */
const releaseTime = (manga: MangaCapitulo) => {
  const published = parseDate(manga.publishedAt);
  return Number.isNaN(published) ? parseDate(manga.rawFecha) || 0 : published;
};

/**
 * Biblioteca (móvil primero): el campo de búsqueda vive en el navbar; aquí van
 * los cuatro más buscados, las tarjetas por género, los últimos lanzamientos y,
 * al escribir, los resultados sobre el catálogo. Con `embedded` se pinta dentro
 * de la ventana del buscador (SearchOverlay), que ya trae el campo y las pestañas.
 */
export const Biblioteca = ({ embedded = false }: { embedded?: boolean }) => {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const location = useLocation();
  const searchTerm = useSearchTerm();
  const searchFilter = useSearchFilter();
  const deferredSearchTerm = useDeferredValue(searchTerm);

  const [allCatalog, setAllCatalog] = useState<MangaCapitulo[]>(() => getCachedSearchCatalog() ?? []);
  const [loading, setLoading] = useState(() => getCachedSearchCatalog() === null);
  const [visibleResults, setVisibleResults] = useState(RESULTS_PAGE_SIZE);

  // ?buscar= permite compartir una búsqueda (y es el destino del SearchAction del
  // JSON-LD); la portada llega con state.filterCategory al tocar un género.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const fromUrl = params.get("buscar") || params.get("q") || "";
    const category = location.state?.filterCategory;
    const fromState = typeof category === "string" && !["Mujer", "Hombre", "Todos"].includes(category) ? category : "";
    const seed = fromState || fromUrl;
    if (seed) setSearchTerm(seed);
    if (location.state) window.history.replaceState({ ...window.history.state, usr: null }, document.title);
  }, [location.key, location.search, location.state]);

  useEffect(() => {
    let cancelled = false;
    // El catálogo llega sin vistas: se completan con las de los rankings históricos.
    loadSearchCatalog()
      .then((catalogData) => {
        if (cancelled) return;
        setAllCatalog(catalogData);
      })
      .catch((error) => console.error("Biblioteca load error:", error))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => { setVisibleResults(RESULTS_PAGE_SIZE); }, [deferredSearchTerm, searchFilter]);

  const catalog = useMemo(() => allCatalog.filter((manga) => matchesFilter(manga, searchFilter)), [allCatalog, searchFilter]);
  // "+ Buscados": las cuatro series con más vistas de la pestaña activa, de mayor a menor
  // (con la cifra que se muestra, para que el orden coincida con lo que se lee).
  const topSearched = useMemo(() => [...catalog].sort((a, b) => displayViews(b) - displayViews(a)).slice(0, TOP_SEARCHED_COUNT), [catalog]);
  // "Nuevos lanzamientos": las series publicadas más recientemente, de la más nueva a la más antigua.
  const newReleases = useMemo(() => [...catalog].sort((a, b) => releaseTime(b) - releaseTime(a)).slice(0, NEW_RELEASES_COUNT), [catalog]);

  const genreTiles = searchGenres;
  const results = useMemo(() => filterCatalog(catalog, deferredSearchTerm), [catalog, deferredSearchTerm]);
  const isSearching = deferredSearchTerm.trim().length > 0;

  // Al pasar de explorar a resultados (o volver) se empieza desde arriba.
  useEffect(() => { if (!embedded) window.scrollTo({ top: 0, behavior: "auto" }); }, [embedded, isSearching]);

  const skeleton = isLight ? "bg-black/[0.06]" : "bg-white/[0.08]";

  return (
    <div className={`biblioteca-page ${embedded ? "search-library" : ""} min-h-screen transition-colors duration-300 ${isLight ? "bg-white text-zinc-950" : "bg-black text-gray-100"}`}>
      <div className={`search-library-inner mx-auto w-full max-w-lg px-4 pb-10 ${embedded ? "pt-5" : "pt-[140px]"}`}>
        {isSearching ? (
          <section aria-label="Resultados de búsqueda">
            {loading ? (
              <div className="grid grid-cols-2 gap-2.5">
                {Array.from({ length: 6 }).map((_, index) => <div key={index} className={`aspect-[3/4] animate-pulse rounded-xl ${skeleton}`} />)}
              </div>
            ) : results.length === 0 ? <p role="status" className="py-8 text-center text-sm">No encontramos títulos para esta búsqueda.</p> : (
              <>
                <div className="grid grid-cols-2 gap-2.5">
                  {results.slice(0, visibleResults).map((manga) => <MangaCard key={manga.id} manga={manga} isLight={isLight} />)}
                </div>
                {results.length > visibleResults && (
                  <button
                    type="button"
                    onClick={() => setVisibleResults((count) => count + RESULTS_PAGE_SIZE)}
                    className={`mt-5 flex h-11 w-full items-center justify-center rounded-full text-[11px] font-black uppercase tracking-wider transition ${isLight ? "bg-black text-white hover:bg-zinc-800" : "bg-white text-black hover:bg-zinc-200"}`}
                  >
                    Ver más
                  </button>
                )}
              </>
            )}
          </section>
        ) : (
          <>
            {/* "+ Buscados": cuatro filas ordenadas por vistas, con portada pequeña,
                título, etiqueta rosa con el tipo y contador negro con el ojo. */}
            <section aria-label="Más buscados">
              <h2 className="mb-3 font-[Montserrat] text-lg font-bold leading-tight">+ Buscados</h2>
              {loading ? (
                <div className="space-y-1">
                  {Array.from({ length: TOP_SEARCHED_COUNT }).map((_, index) => <div key={index} className={`h-[84px] animate-pulse rounded-xl ${skeleton}`} />)}
                </div>
              ) : (
                <ol className="space-y-1">
                  {topSearched.map((manga) => (
                    <li key={manga.id}>
                      <Link to={`/manga/${manga.id}`} className={`search-top-row group flex items-center gap-3 rounded-xl p-1.5 transition-colors ${isLight ? "hover:bg-black/[0.04]" : "hover:bg-white/[0.06]"}`}>
                        <img src={manga.portada} alt={`Portada del manga ${manga.titulo}`} className="h-[72px] w-[68px] shrink-0 rounded-lg object-cover object-top bg-zinc-900" loading="lazy" decoding="async" />
                        <div className="min-w-0 flex-1">
                          <h3 className="line-clamp-2 font-[Montserrat] text-[13px] font-normal leading-snug">{toTitleCase(manga.titulo)}</h3>
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <span style={{ backgroundColor: hasHotTag(manga) ? "#FB5937" : hasBlackWhiteTag(manga) ? "#4C4C4C" : "#DB2777" }} className="search-type rounded-md bg-[#FF4D88] px-2 py-1 font-[Montserrat] text-[10px] font-bold uppercase leading-none tracking-wide text-white">{manga.tipo || "Manga"}</span>
                            {/* Vistas reales (suma de capítulos por serie) y, mientras no lleguen a 1K, la cifra provisional de displayViews. */}
                            <span className={`search-views flex items-center gap-1 rounded-md px-2 py-1 font-[Montserrat] text-[10px] font-bold leading-none text-white ${isLight ? "bg-black" : "border border-white/10 bg-[#1c1c21]"}`}>
                              <SearchEyeIcon />
                              <span className="tabular-nums">{formatViews(displayViews(manga))}</span>
                              <span className="sr-only">vistas</span>
                            </span>
                          </div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            {/* Tarjetas por género: portada de un manga del género con un tinte de color y la etiqueta abajo. */}
            <section aria-label="Explorar por género" className="search-genres mt-7">
              <h2 className="mb-3 font-[Montserrat] text-lg font-bold leading-tight">Explorar por género</h2>
              <div className="grid grid-cols-2 gap-2.5">
                {loading
                  ? Array.from({ length: 6 }).map((_, index) => <div key={index} className={`aspect-[2/1] animate-pulse rounded-2xl ${skeleton}`} />)
                  : genreTiles.map((tile) => (
                    <button
                      key={tile.genre}
                      type="button"
                      onClick={() => setSearchTerm(tile.genre)}
                      className="search-genre group relative aspect-[2/1] overflow-hidden rounded-2xl text-left shadow-[0_6px_18px_rgba(0,0,0,0.12)] transition-transform duration-300 active:scale-[0.97]"
                      style={{ backgroundColor: tile.color }}
                    >
                      {tile.cover && <img src={tile.cover} alt="" className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105" loading="lazy" decoding="async" />}
                      <span
                        aria-hidden="true"
                        className="absolute inset-0"
                        style={{ "--tint": tile.color, backgroundImage: "linear-gradient(to top, var(--tint) 0%, color-mix(in srgb, var(--tint) 55%, transparent) 45%, transparent 100%)" } as CSSProperties}
                      />
                      <span className="absolute bottom-2.5 left-3 text-[15px] font-[800] leading-none text-white [text-shadow:0_1px_6px_rgba(0,0,0,.25)]">{tile.genre}</span>
                    </button>
                  ))}
              </div>
            </section>

            {/* "Nuevos lanzamientos": el más reciente en grande y los tres siguientes debajo. */}
            <section aria-label="Nuevos lanzamientos" className="search-releases mt-7">
              <h2 className="mb-3 font-[Montserrat] text-lg font-bold leading-tight">Nuevos lanzamientos</h2>
              {loading || newReleases.length === 0 ? (
                <>
                  <div className={`aspect-[4/5] animate-pulse rounded-2xl ${skeleton}`} />
                  <div className="search-release-grid mt-3 grid grid-cols-3 gap-2">
                    {Array.from({ length: 3 }).map((_, index) => <div key={index} className={`aspect-[3/4] animate-pulse rounded-xl ${skeleton}`} />)}
                  </div>
                </>
              ) : (
                <>
                  <Link to={`/manga/${newReleases[0].id}`} className="group block">
                    <div className="search-featured relative aspect-[4/5] overflow-hidden rounded-2xl bg-zinc-900 shadow-[0_14px_34px_rgba(0,0,0,0.18)]">
                      <img src={newReleases[0].portada} alt={`Portada del manga ${newReleases[0].titulo}`} className="h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.04]" loading="lazy" decoding="async" />
                      <FreshnessBadge manga={newReleases[0]} className="absolute left-0 top-0 rounded-br-lg px-2.5 py-1.5 text-[11px]" />
                      <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 px-4 pb-4">
                        <h3 className="cover-display-title line-clamp-2 text-[30px] leading-[1] text-white [text-shadow:0_2px_14px_rgba(0,0,0,.6)]">
                          {newReleases[0].titulo}
                        </h3>
                      </div>
                    </div>
                  </Link>
                  <div className="search-release-grid mt-3 grid grid-cols-3 gap-2">
                    {newReleases.slice(1).map((manga) => <MangaCard key={manga.id} manga={manga} isLight={isLight} tall />)}
                  </div>
                </>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
};

/** Tarjeta vertical: portada con el título encima. `tall` la alarga (fila de lanzamientos). */
const MangaCard = ({ manga, isLight, tall = false }: { manga: MangaCapitulo; isLight: boolean; tall?: boolean }) => (
  <Link to={`/manga/${manga.id}`} className={`group block overflow-hidden rounded-xl ${isLight ? "bg-zinc-100" : "bg-[#141416]"}`}>
    <div className={`relative overflow-hidden bg-zinc-900 ${tall ? "aspect-[3/5]" : "aspect-[3/4]"}`}>
      <img src={manga.portada} alt={`Portada del manga ${manga.titulo}`} className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105" loading="lazy" decoding="async" />
      <FreshnessBadge manga={manga} className="absolute left-0 top-0 rounded-br-md" />
      <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/90 via-black/45 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 px-2 pb-2">
        <h4 className="cover-display-title line-clamp-2 text-[15px] leading-[1.05] text-white [text-shadow:0_1px_8px_rgba(0,0,0,.7)]">
          {manga.titulo}
        </h4>
      </div>
    </div>
  </Link>
);
