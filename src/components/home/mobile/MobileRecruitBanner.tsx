import recruitPoster from '../../../assets/home/recruit-poster.webp';
import { DiscordBubble, DiscordMark, PaperPlaneIcon, SendSparkIcon, TelegramBubble } from './icons';

export const DISCORD_INVITE = 'https://discord.gg/ZXt4SUxH';
/** Convocatoria de traductores y cleaners (botón "+ Información" del cartel). */
const RECRUIT_INVITE = 'https://discord.com/invite/E8ZqB5nXA';
export const TELEGRAM_INVITE = 'https://t.me/+J6TE0l401vRhZTYx';

/**
 * Bloque blanco de novedades: el cartel "Buscamos traductor de inglés y
 * cleaner" con el botón "+ Información" (convocatoria en Discord), y debajo
 * las tarjetas-bocadillo de Discord y Telegram.
 */
export const MobileRecruitBanner = () => (
  <section className="mh-recruit relative mt-[31px] mh-inverse pb-8" aria-label="Novedades y comunidad">
    {/* Cartel */}
    <div className="relative">
      <img
        src={recruitPoster}
        alt="Buscamos traductor de inglés y cleaner para el equipo de MangaMukai"
        loading="lazy"
        decoding="async"
        className="block w-full border mh-border-strong shadow-[0_4px_4px_rgba(0,0,0,0.25)]"
      />

      {/* Marca sobre el cartel */}
      <div className="absolute bottom-[77px] left-1/2 flex h-12 w-80 max-w-[calc(100%-2rem)] -translate-x-1/2 items-center justify-center mh-recruit-brand">
        <span className="mh-font-montserrat select-none text-[26px] font-black uppercase italic leading-none tracking-tighter mh-text mh-recruit-wordmark">
          Manga<span className="text-[#db2777]">Mukai</span>
        </span>
      </div>

      <a
        href={RECRUIT_INVITE}
        target="_blank"
        rel="noopener noreferrer"
        className="mh-font-montserrat absolute -bottom-7 left-1/2 flex h-14 w-44 -translate-x-1/2 items-center justify-center gap-2 rounded-2xl border mh-border-strong mh-surface px-3 text-[15px] font-semibold mh-text shadow-[1px_4px_4px_rgba(0,0,0,0.64)] transition-transform active:scale-95"
      >
        + Información
        <SendSparkIcon size={30} className="shrink-0 text-[#db2777]" />
      </a>
    </div>

    {/* Discord */}
    <a
      href={DISCORD_INVITE}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Discord: únete a la comunidad"
      className="relative ml-8 mt-[46px] block h-20 w-[296px] max-w-[calc(100%-2.5rem)]"
    >
      <DiscordBubble className="absolute left-0 top-0 z-10 h-16 w-[57px]" />
      <div className="mh-social-card-shadow absolute left-[56px] top-2 right-0">
        <div className="mh-social-card-discord relative flex h-14 items-center overflow-hidden border pl-[14px]">
          <div className="relative z-10 min-w-0">
            <p className="mh-font-montserrat flex items-center gap-1.5 text-sm font-black italic leading-none mh-inverse-text">
              DISCORD <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-green-500" />
            </p>
            <p className="mh-font-montserrat mt-1 text-xs leading-none mh-inverse-text">Únete A La Comunidad</p>
          </div>
          <DiscordMark size={78} className="absolute -right-2 top-1/2 -translate-y-1/2 text-zinc-400/20" />
        </div>
      </div>
    </a>

    {/* Telegram */}
    <a
      href={TELEGRAM_INVITE}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Telegram: alertas y novedades"
      className="relative ml-auto mr-12 mt-[17px] block h-20 w-[296px] max-w-[calc(100%-2.5rem)]"
    >
      <div className="mh-social-card-shadow absolute left-0 top-2 right-[56px]">
        <div className="mh-social-card-telegram relative flex h-14 items-center justify-end overflow-hidden border pr-[14px]">
          <PaperPlaneIcon size={62} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400/20" />
          <div className="relative z-10 min-w-0 text-right">
            <p className="mh-font-montserrat flex items-center justify-end gap-1.5 text-sm font-black italic leading-none mh-inverse-text">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-green-500" /> TELEGRAM
            </p>
            <p className="mh-font-montserrat mt-1 text-xs leading-none mh-inverse-text">Alertas &amp; Novedades</p>
          </div>
        </div>
      </div>
      <TelegramBubble className="absolute right-0 top-0 z-10 h-16 w-[57px]" />
    </a>
  </section>
);
