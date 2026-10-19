import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';

import footerBackdrop from '../../assets/home/footer-backdrop.webp';
import footerBackdropPc from '../../assets/home/FooterPC.png';
import mascotPeek from '../../assets/home/mascot-peek.webp';
import { DEVELOPER_URL, SOCIAL_LINKS } from '../../config/social';
import { useIsMobileViewport } from '../../hooks/useIsMobileViewport';
import { subscribeToNewsletter } from '../../services/newsletterService';
import {
  CheckMark,
  CodeIcon,
  DiscordMark,
  FacebookIcon,
  FOOTER_SOCIAL_GLYPHS,
  FOOTER_SOCIAL_ROW_HEIGHT,
  FooterSocialGlyph,
  InstagramIcon,
  PlusIcon,
  TelegramIcon,
  WhatsAppIcon,
  XIcon,
  YoutubeIcon,
  type FooterSocialNetwork,
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

const LEGAL_LINKS: FooterLink[] = [
  { label: 'Política de Privacidad', to: '/privacidad' },
  { label: 'Términos de Servicio', to: '/terminos' },
  { label: 'Normas de la Comunidad', to: '/normas-comunidad' },
  { label: 'Política de Cookies', to: '/cookies' },
  // Lleva al apartado de la política que explica cómo gestionarlas desde el navegador.
  { label: 'Cookie Settings', to: '/cookies#como-gestionarlas' },
  { label: 'DMCA', to: '/legal?tab=dmca' },
];

/** Páginas del pie (móvil y PC). */
const FOOTER_PAGES: (FooterLink & { font: string })[] = [
  { label: 'Sobre Nosotros', to: '/nosotros', font: 'font-google' },
  { label: 'Recibe ayuda', href: SOCIAL_LINKS.discord, font: 'font-montserrat' },
  { label: 'Contacto', to: '/contacto', font: 'font-montserrat' },
];

/** Políticas del pie en dos filas; en móvil la primera cabe en una línea incluso a 360 px (con menos separación). */
const FOOTER_LEGAL_ROWS = [LEGAL_LINKS.slice(0, 3), LEGAL_LINKS.slice(3, 5)];

const FooterAnchor = ({ link, className }: { link: FooterLink; className: string }) => (
  link.to
    ? <Link to={link.to} className={className}>{link.label}</Link>
    : <a href={link.href} target="_blank" rel="noopener noreferrer" className={className}>{link.label}</a>
);

const Wordmark = ({ className }: { className: string }) => (
  <Link to="/" aria-label="Volver al inicio de MangaMukai" className="mx-auto block w-fit">
    <span className={`block select-none whitespace-nowrap font-montserrat font-black uppercase italic leading-none text-ink ${className}`}>
      Manga<span className="text-mukai-magenta">Mukai</span>
    </span>
  </Link>
);

const DeveloperCredit = ({ className }: { className: string }) => (
  <a
    href={DEVELOPER_URL}
    target="_blank"
    rel="noopener noreferrer"
    className={`flex items-center gap-[2px] font-audiowide font-normal leading-none text-ink no-underline hover:no-underline ${className}`}
  >
    <CodeIcon size={8} />
    7osemanuelmejia
  </a>
);

type NewsletterStatus = 'idle' | 'sending' | 'done';
const CHECK_VISIBLE_MS = 1300;

/**
 * Medidas del boletín. Móvil: barra translúcida con el botón de tinta y el "+".
 * PC: barra oscura translúcida con el botón blanco, el "+" y el gato más grande.
 */
const NEWSLETTER_VARIANTS = {
  mobile: {
    mascot: 'pointer-events-none absolute -top-[68px] right-3 z-20 h-[75px] w-[189px] object-contain object-bottom',
    form: 'relative z-10 flex h-12 items-center rounded-xl border border-ink/30 bg-surface/50 pl-[19px] pr-1 dark:bg-black/50',
    input: 'h-full min-w-0 flex-1 bg-transparent font-poppins text-xs font-medium text-ink outline-none placeholder:text-ink/40',
    button: 'flex h-10 w-28 shrink-0 items-center justify-center rounded-lg bg-ink font-goldman text-xs font-bold text-surface disabled:opacity-80',
    check: { background: 'rgb(var(--mm-surface))', ink: 'rgb(var(--mm-ink))' },
  },
  desktop: {
    mascot: 'pointer-events-none absolute -top-[99px] left-[148px] z-20 h-[112px] w-[280px] object-contain object-bottom',
    form: 'relative z-10 flex h-[74px] w-[579px] items-center rounded-[11px] border border-[rgba(234,234,234,0.34)] bg-black/[.49] pl-7 pr-[5px]',
    input: 'h-full min-w-0 flex-1 bg-transparent font-poppins text-xs font-medium text-white outline-none placeholder:text-white/[.41]',
    button: 'flex h-[61px] w-[168px] shrink-0 items-center justify-center rounded-lg bg-white font-goldman text-base font-bold text-black disabled:opacity-80',
    check: { background: '#000', ink: '#fff' },
  },
} as const;

/**
 * Boletín: UNIRME envía el correo; al confirmarse muestra el check un instante y
 * el botón vuelve a "UNIRME" con el campo vacío. Con un correo inválido o un
 * fallo no se muestra nada: el campo se queda como está. El gato se asoma sobre
 * el botón.
 */
const NewsletterForm = ({ inputId, variant = 'mobile' }: { inputId: string; variant?: keyof typeof NEWSLETTER_VARIANTS }) => {
  const styles = NEWSLETTER_VARIANTS[variant];
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
        className={styles.mascot}
      />
      <form onSubmit={handleSubscribe} noValidate className={styles.form}>
        <label htmlFor={inputId} className="sr-only">Correo para recibir novedades</label>
        <input
          id={inputId}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="MatenteAlDia@mangamukai.com"
          className={styles.input}
        />
        <motion.button
          type="submit"
          disabled={status === 'sending'}
          aria-label={status === 'done' ? 'Suscripción confirmada' : 'Unirme al boletín'}
          whileTap={{ scale: 0.95 }}
          className={styles.button}
        >
          <AnimatePresence initial={false} mode="wait">
            {status === 'done' ? (
              <CheckMark key="check" background={styles.check.background} ink={styles.check.ink} size={26} />
            ) : variant === 'desktop' ? (
              <motion.span
                key="label"
                className="flex items-center"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
              >
                <PlusIcon size={25.32} className="shrink-0" />
                <span className="ml-1 w-[83px] text-center">{status === 'sending' ? 'ENVIANDO' : 'UNIRME'}</span>
              </motion.span>
            ) : (
              <motion.span
                key="label"
                className="flex items-center gap-1"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
              >
                <PlusIcon size={16} className="shrink-0" />
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
  <div className="relative z-10 px-[25px] pb-[34px] pt-1.5">
    <Wordmark className="text-[28px]" />

    <ul className="mt-[21px] flex items-center justify-center gap-4 pl-[7px]">
      {FOOTER_SOCIALS.filter((social) => social.compact).map(({ name, href, Icon, size }) => (
        <li key={name} className="flex">
          <a href={href} target="_blank" rel="noopener noreferrer" aria-label={name} title={name} className="flex h-8 items-center justify-center text-ink transition-opacity hover:opacity-70">
            <Icon size={size} />
          </a>
        </li>
      ))}
    </ul>

    <ul className="mt-[34px] flex flex-col gap-[21px]">
      {FOOTER_PAGES.map((page) => (
        <li key={page.label} className="flex">
          <FooterAnchor link={page} className={`${page.font} text-sm font-semibold leading-4 text-ink`} />
        </li>
      ))}
    </ul>

    <div className="mt-[46px]">
      <NewsletterForm inputId="footer-newsletter-email" />
    </div>

    <div className="-mx-3 mt-[23px] flex flex-col gap-4">
      {FOOTER_LEGAL_ROWS.map((row, rowIndex) => (
        <ul key={rowIndex} className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-2 whitespace-nowrap min-[400px]:gap-x-[27px]">
          {row.map((item) => (
            <li key={item.label} className="flex">
              <FooterAnchor link={item} className="font-montserrat text-[9px] font-medium leading-none text-[color:var(--mm-legal-ink)] transition-colors hover:text-ink" />
            </li>
          ))}
        </ul>
      ))}
    </div>

    <DeveloperCredit className="mt-[65px] justify-center text-[6px]" />
  </div>
);

/** Fila de redes del pie de PC: "redes footer iconos" (219×42) a 190 px de ancho. */
const DESKTOP_SOCIAL_ROW_HEIGHT = 36.49;
const DESKTOP_SOCIAL_SCALE = DESKTOP_SOCIAL_ROW_HEIGHT / FOOTER_SOCIAL_ROW_HEIGHT;

const DESKTOP_SOCIALS: { name: string; href: string; network: FooterSocialNetwork }[] = [
  { name: 'Facebook', href: SOCIAL_LINKS.facebook, network: 'facebook' },
  { name: 'X', href: SOCIAL_LINKS.x, network: 'x' },
  { name: 'Instagram', href: SOCIAL_LINKS.instagram, network: 'instagram' },
  { name: 'YouTube', href: SOCIAL_LINKS.youtube, network: 'youtube' },
];

/** Altura de cada fila de políticas del pie de PC. */
const DESKTOP_LEGAL_ROW_TOPS = [398, 437];

const fromCenter = (offset: number) => ({ left: `calc(50% + ${offset}px)` });

/** El fondo se ancla arriba para que los recortes afecten solo al bosque inferior. */
const DesktopFooter = ({ className }: { className: string }) => (
  <footer className={`relative bg-surface pt-[7px] text-ink ${className}`}>
    <div className="relative aspect-[1983/725] min-h-[524px] w-full">
      <img src={footerBackdropPc} alt="" aria-hidden="true" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover object-top" />
      <div aria-hidden="true" className="absolute inset-0 bg-surface/60" />

      <Link to="/" aria-label="Volver al inicio de MangaMukai" className="absolute top-[-4.5px] w-[384px] text-center" style={fromCenter(-212)}>
        <span className="block select-none whitespace-nowrap font-montserrat text-[43.2px] font-black uppercase italic leading-[45px] text-ink">
          Manga<span className="text-mukai-magenta">Mukai</span>
        </span>
      </Link>

      <ul className="absolute top-[66px] h-[36.49px] w-[190.27px]" style={fromCenter(-99)}>
        {DESKTOP_SOCIALS.map(({ name, href, network }) => (
          <li key={name} className="absolute top-0 flex" style={{ left: FOOTER_SOCIAL_GLYPHS[network].x * DESKTOP_SOCIAL_SCALE }}>
            <a href={href} target="_blank" rel="noopener noreferrer" aria-label={name} title={name} className="flex text-ink transition-opacity hover:opacity-70">
              <FooterSocialGlyph network={network} height={DESKTOP_SOCIAL_ROW_HEIGHT} />
            </a>
          </li>
        ))}
      </ul>

      <ul className="absolute left-1/2 top-[139px] flex -translate-x-1/2 gap-10 whitespace-nowrap">
        {FOOTER_PAGES.map((page) => (
          <li key={page.label} className="flex">
            <FooterAnchor link={page} className={`${page.font} text-lg font-semibold leading-6 text-ink`} />
          </li>
        ))}
      </ul>

      <div className="absolute top-[290px]" style={fromCenter(-284)}>
        <NewsletterForm inputId="footer-newsletter-email" variant="desktop" />
      </div>

      {FOOTER_LEGAL_ROWS.map((row, rowIndex) => (
        <ul key={rowIndex} className="absolute left-1/2 flex -translate-x-1/2 gap-8 whitespace-nowrap" style={{ top: DESKTOP_LEGAL_ROW_TOPS[rowIndex] }}>
          {row.map((item) => (
            <li key={item.label} className="flex">
              <FooterAnchor link={item} className="font-montserrat text-sm font-medium leading-[normal] text-ink/90 transition-colors hover:text-ink" />
            </li>
          ))}
        </ul>
      ))}

      <a
        href={DEVELOPER_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute top-[490px] flex items-center gap-[3px] font-audiowide text-[10px] font-normal leading-[13px] text-mukai-magenta no-underline hover:no-underline"
        style={fromCenter(-66)}
      >
        <CodeIcon size={12} />
        7osemanuelmejia
      </a>
    </div>
  </footer>
);


export const Footer = ({ className = '', homeDesign = false }: { className?: string; homeDesign?: boolean }) => {
  const isMobile = useIsMobileViewport();
  if (homeDesign) return (
    <footer className={`home-design-footer ${className}`}>
      <div className="home-footer-content">
        <Wordmark className="text-4xl" />
        <ul className="home-footer-socials">
          {DESKTOP_SOCIALS.map(({ name, href, network }) => (
            <li key={name}><a href={href} target="_blank" rel="noopener noreferrer" aria-label={name}><FooterSocialGlyph network={network} height={28} /></a></li>
          ))}
        </ul>
        <div className="home-footer-newsletter"><NewsletterForm inputId="footer-newsletter-email" variant={isMobile ? 'mobile' : 'desktop'} /></div>
        {FOOTER_LEGAL_ROWS.map((row, index) => (
          <ul key={index} className="home-footer-legal">
            {row.map((link) => <li key={link.label}><FooterAnchor link={link} className="font-montserrat text-sm font-medium text-ink/90" /></li>)}
          </ul>
        ))}
        <p className="home-footer-copyright">© 2026 All Rights Reserved<br /><span>v2.0.0</span></p>
        <DeveloperCredit className="home-footer-credit" />
      </div>
    </footer>
  );
  if (!isMobile) return <DesktopFooter className={className} />;
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
      <MobileFooterContent />
    </footer>
  );
};
