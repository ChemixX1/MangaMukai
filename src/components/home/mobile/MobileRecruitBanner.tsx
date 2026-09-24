import recruitPoster from '../../../assets/home/recruit-poster.webp';
import { SOCIAL_LINKS } from '../../../config/social';
import { DiscordBubble, DiscordMark, PaperPlaneIcon, SendSparkIcon, TelegramBubble } from '../../ui';

/**
 * Bloque blanco de novedades: el cartel "Buscamos traductor de inglés y
 * cleaner" con el botón "+ Información" (convocatoria en Discord), y debajo
 * las tarjetas-bocadillo de Discord y Telegram.
 */
export const MobileRecruitBanner = () => (
  <section className="relative mt-[31px] bg-ink pb-8 text-surface" aria-label="Novedades y comunidad">
    {/* Cartel */}
    <div className="relative">
      <img
        src={recruitPoster}
        alt="Buscamos traductor de inglés y cleaner para el equipo de MangaMukai"
        loading="lazy"
        decoding="async"
        className="block w-full border border-ink shadow-[0_4px_4px_rgba(0,0,0,0.25)]"
      />

      {/* Marca sobre el cartel */}
      <div className="absolute bottom-[77px] left-1/2 flex h-12 w-80 max-w-[calc(100%-2rem)] -translate-x-1/2 items-center justify-center bg-surface/30">
        <span className="select-none font-montserrat text-[26px] font-black uppercase italic leading-none tracking-tighter text-ink drop-shadow-[0_2px_4px_rgb(var(--mm-surface)/0.6)]">
          Manga<span className="text-[#db2777]">Mukai</span>
        </span>
      </div>

      <a
        href={SOCIAL_LINKS.discordRecruit}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute -bottom-7 left-1/2 flex h-14 w-44 -translate-x-1/2 items-center justify-center gap-2 rounded-2xl border border-ink bg-surface px-3 font-montserrat text-[15px] font-semibold text-ink shadow-[1px_4px_4px_rgba(0,0,0,0.64)] transition-transform active:scale-95"
      >
        + Información
        <SendSparkIcon size={30} className="shrink-0 text-[#db2777]" />
      </a>
    </div>

    {/* Discord */}
    <a
      href={SOCIAL_LINKS.discord}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Discord: únete a la comunidad"
      className="relative ml-8 mt-[46px] block h-20 w-[296px] max-w-[calc(100%-2.5rem)]"
    >
      <DiscordBubble className="absolute left-0 top-0 z-10 h-16 w-[57px]" />
      <div className="absolute left-[56px] right-0 top-2 drop-shadow-[0_4px_2px_rgba(0,0,0,0.25)]">
        <div className="relative flex h-14 items-center overflow-hidden border border-[color:var(--mm-inverse-line)] bg-[color:var(--mm-inverse-card)] pl-[14px] [clip-path:polygon(0_0,100%_0,100%_100%,7px_100%,0_calc(100%_-_10px))]">
          <div className="relative z-10 min-w-0">
            <p className="flex items-center gap-1.5 font-montserrat text-sm font-black italic leading-none text-surface">
              DISCORD <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-green-500" />
            </p>
            <p className="mt-1 font-montserrat text-xs leading-none text-surface">Únete A La Comunidad</p>
          </div>
          <DiscordMark size={78} className="absolute -right-2 top-1/2 -translate-y-1/2 text-zinc-400/20" />
        </div>
      </div>
    </a>

    {/* Telegram */}
    <a
      href={SOCIAL_LINKS.telegram}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Telegram: alertas y novedades"
      className="relative ml-auto mr-12 mt-[17px] block h-20 w-[296px] max-w-[calc(100%-2.5rem)]"
    >
      <div className="absolute left-0 right-[56px] top-2 drop-shadow-[0_4px_2px_rgba(0,0,0,0.25)]">
        <div className="relative flex h-14 items-center justify-end overflow-hidden border border-[color:var(--mm-inverse-line)] bg-[color:var(--mm-inverse-card)] pr-[14px] [clip-path:polygon(0_0,100%_0,100%_calc(100%_-_10px),calc(100%_-_7px)_100%,0_100%)]">
          <PaperPlaneIcon size={62} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400/20" />
          <div className="relative z-10 min-w-0 text-right">
            <p className="flex items-center justify-end gap-1.5 font-montserrat text-sm font-black italic leading-none text-surface">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-green-500" /> TELEGRAM
            </p>
            <p className="mt-1 font-montserrat text-xs leading-none text-surface">Alertas &amp; Novedades</p>
          </div>
        </div>
      </div>
      <TelegramBubble className="absolute right-0 top-0 z-10 h-16 w-[57px]" />
    </a>
  </section>
);
