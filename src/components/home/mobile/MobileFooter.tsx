import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';

import footerBackdrop from '../../../assets/home/footer-backdrop.webp';
import mascotPeek from '../../../assets/home/mascot-peek.webp';
import { subscribeToNewsletter } from '../../../services/newsletterService';
import { CheckMark } from './CheckMark';
import { CodeIcon, FacebookIcon, InstagramIcon, MailIcon, XIcon, YoutubeIcon } from './icons';
import { DISCORD_INVITE } from './MobileRecruitBanner';

const SOCIALS = [
  { name: 'Facebook', href: 'https://www.facebook.com/MangaAyanokouji/', Icon: FacebookIcon, size: 24 },
  { name: 'X', href: 'https://x.com/MangaMukai', Icon: XIcon, size: 24 },
  { name: 'Instagram', href: 'https://www.instagram.com/mangamukai/', Icon: InstagramIcon, size: 20 },
  { name: 'YouTube', href: 'https://www.youtube.com/@MangaMukai-b3g', Icon: YoutubeIcon, size: 31 },
];

const PAGES = [
  { label: 'Sobre Nosotros', to: '/nosotros', font: 'mh-font-google-sans' },
  { label: 'Recibe ayuda', href: DISCORD_INVITE, font: 'mh-font-montserrat' },
  { label: 'Contacto', to: '/contacto', font: 'mh-font-montserrat' },
];

const LEGAL_ROWS = [
  [
    { label: 'Política de Privacidad', to: '/privacidad' },
    { label: 'Términos de Servicio', to: '/terminos' },
    { label: 'Normas de la Comunidad', to: '/normas-comunidad' },
  ],
  [
    { label: 'Política de Cookies', to: '/cookies' },
    // Lleva al apartado de la política que explica cómo gestionarlas desde el navegador.
    { label: 'Cookie Settings', to: '/cookies#como-gestionarlas' },
  ],
];

type NewsletterStatus = 'idle' | 'sending' | 'done';
const CHECK_VISIBLE_MS = 1300;

/**
 * Footer móvil: montañas rosas al fondo, marca, redes, enlaces, el gato
 * asomándose sobre el boletín y las políticas.
 */
export const MobileFooter = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<NewsletterStatus>('idle');
  const resetTimer = useRef<number | null>(null);

  useEffect(() => () => { if (resetTimer.current !== null) window.clearTimeout(resetTimer.current); }, []);

  // UNIRME: envía el correo al boletín; al confirmarse muestra el check un
  // instante y el botón vuelve a "UNIRME" con el campo vacío. Con un correo
  // inválido o un fallo no se muestra nada: el campo se queda como está.
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
    <footer className="mh-footer relative -mt-6 overflow-hidden mh-surface mh-text">
      <img src={footerBackdrop} alt="" aria-hidden="true" loading="lazy" decoding="async" className="mh-footer-backdrop" />
      <div aria-hidden="true" className="mh-footer-scrim" />

      <div className="mh-footer-inner relative z-10 px-[25px] pt-[235px]">
        {/* Marca */}
        <Link to="/" aria-label="Volver al inicio de MangaMukai" className="mx-auto block w-fit">
          <span className="mh-font-montserrat select-none whitespace-nowrap text-[28px] font-black uppercase italic leading-none tracking-tighter mh-text">
            Manga<span className="text-[#db2777]">Mukai</span>
          </span>
        </Link>

        {/* Redes */}
        <ul className="mt-6 flex items-center justify-center gap-4">
          {SOCIALS.map(({ name, href, Icon, size }) => (
            <li key={name} className="flex">
              <a href={href} target="_blank" rel="noopener noreferrer" aria-label={name} title={name} className="flex h-8 w-8 items-center justify-center mh-text transition-opacity hover:opacity-70">
                <Icon size={size} />
              </a>
            </li>
          ))}
        </ul>

        {/* Enlaces */}
        <ul className="mt-[35px] flex flex-col gap-[21px]">
          {PAGES.map((page) => (
            <li key={page.label}>
              {page.to ? (
                <Link to={page.to} className={`${page.font} text-sm font-semibold leading-4 mh-text`}>{page.label}</Link>
              ) : (
                <a href={page.href} target="_blank" rel="noopener noreferrer" className={`${page.font} text-sm font-semibold leading-4 mh-text`}>{page.label}</a>
              )}
            </li>
          ))}
        </ul>

        {/* Boletín con el gato asomándose sobre el botón */}
        <div className="relative mt-12">
          <img
            src={mascotPeek}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            className="pointer-events-none absolute -top-[68px] right-3 z-20 h-[75px] w-[189px] object-contain object-bottom"
          />
          <form onSubmit={handleSubscribe} noValidate className="relative z-10 flex h-12 items-center rounded-xl border mh-newsletter pl-[19px] pr-1">
            <label htmlFor="mh-newsletter-email" className="sr-only">Correo para recibir novedades</label>
            <input
              id="mh-newsletter-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="MatenteAlDia@mangamukai.com"
              className="mh-font-poppins h-full min-w-0 flex-1 bg-transparent text-xs font-medium mh-text outline-none mh-newsletter-input"
            />
            <motion.button
              type="submit"
              disabled={status === 'sending'}
              aria-label={status === 'done' ? 'Suscripción confirmada' : 'Unirme al boletín'}
              whileTap={{ scale: 0.95 }}
              className="mh-font-goldman flex h-10 w-28 shrink-0 items-center justify-center gap-1.5 rounded-lg mh-inverse text-xs font-bold disabled:opacity-80"
            >
              <AnimatePresence initial={false} mode="wait">
                {status === 'done' ? (
                  <CheckMark key="check" background="var(--mh-surface)" ink="var(--mh-ink)" size={26} />
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

        {/* Políticas: dos filas centradas; la primera cabe en una línea incluso en pantallas de 360 px. */}
        <div className="-mx-3 mt-[22px] flex flex-col gap-2">
          {LEGAL_ROWS.map((row, rowIndex) => (
            <ul key={rowIndex} className="flex flex-wrap items-center justify-center gap-x-[14px] gap-y-2 whitespace-nowrap">
              {row.map((item) => (
                <li key={item.label}>
                  <Link to={item.to} className="mh-font-montserrat text-[8.5px] font-medium leading-none mh-legal-link transition-colors">{item.label}</Link>
                </li>
              ))}
            </ul>
          ))}
        </div>

        {/* Crédito */}
        <a
          href="https://chemixx7.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="mh-font-audiowide mt-9 flex items-center justify-center gap-[3px] text-[7px] leading-none mh-text no-underline hover:no-underline"
        >
          <CodeIcon size={9} />
          7osemanuelmejia
        </a>
      </div>
    </footer>
  );
};
