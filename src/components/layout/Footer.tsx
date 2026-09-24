import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';

import footerBackdrop from '../../assets/home/footer-backdrop.webp';
import mascotPeek from '../../assets/home/mascot-peek.webp';
import { DEVELOPER_URL, SOCIAL_LINKS } from '../../config/social';
import { useIsMobileViewport } from '../../hooks/useIsMobileViewport';
import { subscribeToNewsletter } from '../../services/newsletterService';
import {
  CheckMark,
  CodeIcon,
  DiscordMark,
  FacebookIcon,
  InstagramIcon,
  MailIcon,
  TelegramIcon,
  WhatsAppIcon,
  XIcon,
  YoutubeIcon,
} from '../ui';

/** Redes oficiales. El pie móvil muestra solo las marcadas con `compact`. */
export const FOOTER_SOCIALS = [
  { name: 'Facebook', href: SOCIAL_LINKS.facebook, Icon: FacebookIcon, size: 24, compact: true },
  { name: 'WhatsApp', href: SOCIAL_LINKS.whatsapp, Icon: WhatsAppIcon, size: 23, compact: false },
  { name: 'X', href: SOCIAL_LINKS.x, Icon: XIcon, size: 24, compact: true },
  { name: 'Telegram', href: SOCIAL_LINKS.telegram, Icon: TelegramIcon, size: 24, compact: false },
  { name: 'Instagram', href: SOCIAL_LINKS.instagram, Icon: InstagramIcon, size: 20, compact: true },
  { name: 'YouTube', href: SOCIAL_LINKS.youtube, Icon: YoutubeIcon, size: 31, compact: true },
  { name: 'Discord', href: SOCIAL_LINKS.discord, Icon: DiscordMark, size: 27, compact: false },
];

type FooterLink = { label: string; to?: string; href?: string };

const NAVIGATION_LINKS: FooterLink[] = [
  { label: 'Inicio', to: '/' },
  { label: 'Biblioteca', to: '/biblioteca' },
  { label: 'Sobre Nosotros', to: '/nosotros' },
  { label: 'Recibe ayuda', href: SOCIAL_LINKS.discord },
  { label: 'Contacto', to: '/contacto' },
];

const LEGAL_LINKS: FooterLink[] = [
  { label: 'Política de Privacidad', to: '/privacidad' },
  { label: 'Términos de Servicio', to: '/terminos' },
  { label: 'Normas de la Comunidad', to: '/normas-comunidad' },
  { label: 'Política de Cookies', to: '/cookies' },
  // Lleva al apartado de la política que explica cómo gestionarlas desde el navegador.
  { label: 'Cookie Settings', to: '/cookies#como-gestionarlas' },
  { label: 'DMCA', to: '/legal?tab=dmca' },
];

const MOBILE_PAGES: (FooterLink & { font: string })[] = [
  { label: 'Sobre Nosotros', to: '/nosotros', font: 'font-google' },
  { label: 'Recibe ayuda', href: SOCIAL_LINKS.discord, font: 'font-montserrat' },
  { label: 'Contacto', to: '/contacto', font: 'font-montserrat' },
];

/** Políticas del pie móvil: dos filas centradas; la primera cabe en una línea incluso a 360 px. */
const MOBILE_LEGAL_ROWS = [LEGAL_LINKS.slice(0, 3), LEGAL_LINKS.slice(3, 5)];

const DISCLAIMER = "All the comics on this website are only previews of the original comics. There may be many language errors, character names, and story lines. For the original version, please buy the comic if it's available in your city.";

const FooterAnchor = ({ link, className }: { link: FooterLink; className: string }) => (
  link.to
    ? <Link to={link.to} className={className}>{link.label}</Link>
    : <a href={link.href} target="_blank" rel="noopener noreferrer" className={className}>{link.label}</a>
);

const Wordmark = ({ className }: { className: string }) => (
  <Link to="/" aria-label="Volver al inicio de MangaMukai" className="block w-fit">
    <span className={`select-none whitespace-nowrap font-montserrat font-black uppercase italic leading-none tracking-tighter text-ink ${className}`}>
      Manga<span className="text-mukai-pink">Mukai</span>
    </span>
  </Link>
);

const DeveloperCredit = ({ className }: { className: string }) => (
  <a
    href={DEVELOPER_URL}
    target="_blank"
    rel="noopener noreferrer"
    className={`flex items-center gap-[3px] font-audiowide font-normal leading-none text-ink no-underline hover:no-underline ${className}`}
  >
    <CodeIcon size={9} />
    7osemanuelmejia
  </a>
);

type NewsletterStatus = 'idle' | 'sending' | 'done';
const CHECK_VISIBLE_MS = 1300;

/**
 * Boletín: UNIRME envía el correo; al confirmarse muestra el check un instante y
 * el botón vuelve a "UNIRME" con el campo vacío. Con un correo inválido o un
 * fallo no se muestra nada: el campo se queda como está. El gato se asoma sobre
 * el botón.
 */
const NewsletterForm = ({ inputId }: { inputId: string }) => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<NewsletterStatus>('idle');
  const resetTimer = useRef<number | null>(null);

  useEffect(() => () => { if (resetTimer.current !== null) window.clearTimeout(resetTimer.current); }, []);

  const handleSubscribe = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status !== 'idle') return;
    setStatus('sending');
    const outcome = await subscribeToNewsletter(email);
    if (outcome !== 'added' && outcome !== 'exists') {
      setStatus('idle');
      return;
    }
    setEmail('');
    setStatus('done');
    if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setStatus('idle'), CHECK_VISIBLE_MS);
  };

  return (
    <div className="relative">
      <img
        src={mascotPeek}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        className="pointer-events-none absolute -top-[68px] right-3 z-20 h-[75px] w-[189px] object-contain object-bottom"
      />
      <form onSubmit={handleSubscribe} noValidate className="relative z-10 flex h-12 items-center rounded-xl border border-ink/30 bg-surface/50 pl-[19px] pr-1">
        <label htmlFor={inputId} className="sr-only">Correo para recibir novedades</label>
        <input
          id={inputId}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="MatenteAlDia@mangamukai.com"
          className="h-full min-w-0 flex-1 bg-transparent font-poppins text-xs font-medium text-ink outline-none placeholder:text-ink/55"
        />
        <motion.button
          type="submit"
          disabled={status === 'sending'}
          aria-label={status === 'done' ? 'Suscripción confirmada' : 'Unirme al boletín'}
          whileTap={{ scale: 0.95 }}
          className="flex h-10 w-28 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-ink font-goldman text-xs font-bold text-surface disabled:opacity-80"
        >
          <AnimatePresence initial={false} mode="wait">
            {status === 'done' ? (
              <CheckMark key="check" background="rgb(var(--mm-surface))" ink="rgb(var(--mm-ink))" size={26} />
            ) : (
              <motion.span
                key="label"
                className="flex items-center gap-1.5"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
              >
                <MailIcon size={16} />
                {status === 'sending' ? 'ENVIANDO' : 'UNIRME'}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </form>
    </div>
  );
};

/** Pie móvil (< lg): marca, redes, enlaces, boletín con el gato y políticas, sobre las montañas. */
const MobileFooterContent = () => (
  <div className="relative z-10 px-[25px] pb-7 pt-[235px]">
    <Wordmark className="mx-auto block text-[28px]" />

    <ul className="mt-6 flex items-center justify-center gap-4">
      {FOOTER_SOCIALS.filter((social) => social.compact).map(({ name, href, Icon, size }) => (
        <li key={name} className="flex">
          <a href={href} target="_blank" rel="noopener noreferrer" aria-label={name} title={name} className="flex h-8 w-8 items-center justify-center text-ink transition-opacity hover:opacity-70">
            <Icon size={size} />
          </a>
        </li>
      ))}
    </ul>

    <ul className="mt-[35px] flex flex-col gap-[21px]">
      {MOBILE_PAGES.map((page) => (
        <li key={page.label}>
          <FooterAnchor link={page} className={`${page.font} text-sm font-semibold leading-4 text-ink`} />
        </li>
      ))}
    </ul>

    <div className="mt-12">
      <NewsletterForm inputId="footer-newsletter-email" />
    </div>

    <div className="-mx-3 mt-[22px] flex flex-col gap-2">
      {MOBILE_LEGAL_ROWS.map((row, rowIndex) => (
        <ul key={rowIndex} className="flex flex-wrap items-center justify-center gap-x-[14px] gap-y-2 whitespace-nowrap">
          {row.map((item) => (
            <li key={item.label}>
              <FooterAnchor link={item} className="font-montserrat text-[8.5px] font-medium leading-none text-[color:var(--mm-legal-ink)] transition-colors hover:text-ink" />
            </li>
          ))}
        </ul>
      ))}
    </div>

    <DeveloperCredit className="mt-9 justify-center text-[7px]" />
  </div>
);

const FooterHeading = ({ children }: { children: string }) => (
  <h4 className="flex items-center gap-2 font-montserrat text-xs font-black uppercase tracking-[0.2em] text-ink">
    <span aria-hidden="true" className="h-1.5 w-1.5 animate-blink rounded-full bg-mukai-pink motion-reduce:animate-none" />
    {children}
  </h4>
);

/** Pie de escritorio (lg+): la composición de PC (tres columnas, redes, aviso y crédito) con el estilo del móvil. */
const DesktopFooterContent = () => (
  <div className="relative z-10 mx-auto max-w-7xl px-8">
    <div className="grid grid-cols-12 gap-16 pb-16 pt-24">
      <div className="col-span-4 flex flex-col gap-6">
        <Wordmark className="text-[32px]" />
        <p className="max-w-sm font-montserrat text-sm font-medium leading-relaxed text-ink/80">
          Tu plataforma de lectura digital optimizada. Disfruta de la mejor experiencia con calidad premium, velocidad warp y diseño de vanguardia.
        </p>
        <div className="flex flex-wrap gap-2">
          {['Disfruta', 'Imagina'].map((tag) => (
            <span key={tag} className="flex h-5 items-center border border-line bg-surface px-[7px] font-anta text-[10px] font-normal leading-5 text-ink">{tag}</span>
          ))}
        </div>
      </div>

      <div className="col-span-4 grid grid-cols-2 gap-8">
        {([['Navegación', NAVIGATION_LINKS], ['Legal', LEGAL_LINKS]] as const).map(([title, links]) => (
          <div key={title} className="flex flex-col gap-6">
            <FooterHeading>{title}</FooterHeading>
            <ul className="flex flex-col gap-3">
              {links.map((link) => (
                <li key={link.label}>
                  <FooterAnchor link={link} className="font-montserrat text-sm font-semibold leading-4 text-ink/80 transition-colors hover:text-mukai-pink" />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="col-span-4 flex flex-col gap-6">
        <FooterHeading>Mantente al día</FooterHeading>
        <p className="font-montserrat text-xs font-medium leading-relaxed text-muted">
          Recibe las últimas actualizaciones y capítulos directamente en tu correo.
        </p>
        <div className="mt-14">
          <NewsletterForm inputId="footer-newsletter-email" />
        </div>
      </div>
    </div>

    <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 border-t border-line py-10">
      {FOOTER_SOCIALS.map(({ name, href, Icon, size }) => (
        <li key={name}>
          <a href={href} target="_blank" rel="noopener noreferrer" aria-label={name} title={name} className="flex h-8 items-center gap-2.5 text-ink transition-opacity hover:opacity-70">
            <span className="flex h-8 w-8 items-center justify-center"><Icon size={size} /></span>
            <span className="font-montserrat text-xs font-bold uppercase tracking-wider">{name}</span>
          </a>
        </li>
      ))}
    </ul>

    <div className="border-t border-line py-10">
      <p className="mx-auto max-w-4xl rounded-[5px] border border-line bg-ink/10 px-8 py-5 text-center font-inter text-[13px] leading-[18px] text-ink/85">
        {DISCLAIMER}
      </p>
    </div>

    <div className="flex items-center justify-between border-t border-line py-6">
      <DeveloperCredit className="text-[10px]" />
      <span className="font-montserrat text-[10px] font-medium text-[color:var(--mm-legal-ink)]">© {new Date().getFullYear()} MangaMukai</span>
    </div>
  </div>
);

/**
 * Pie de página de todo el sitio, con el diseño móvil (montañas rosas al fondo,
 * marca, boletín con el gato) en ambas versiones: en móvil su composición
 * propia y en escritorio la distribución clásica de PC.
 */
export const Footer = ({ className = '' }: { className?: string }) => {
  const isMobile = useIsMobileViewport();
  return (
    <footer className={`relative overflow-hidden bg-surface text-ink ${className}`}>
      <img
        src={footerBackdrop}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover object-bottom lg:object-[center_42%]"
      />
      <div aria-hidden="true" className="absolute inset-0 bg-surface/[var(--mm-footer-scrim)]" />
      {isMobile ? <MobileFooterContent /> : <DesktopFooterContent />}
    </footer>
  );
};
