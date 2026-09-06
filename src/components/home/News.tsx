import { useState, useEffect, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, Heart, X, Check, ChevronRight, ChevronLeft, Gamepad2, ShieldAlert } from "lucide-react";

// Assets
import donationBackdrop from '../../assets/modals/auth-login.jpg';
import { openSubscriptionModal } from '../../utils/subscriptionModal';
import {
  AUTH_CHANGED_EVENT,
  AUTH_SESSION_EXPIRED_EVENT,
  getStoredToken,
} from '../../services/authService';
import { fetchHomeBanners, getCachedHomeBanners, type HomeBanner } from '../../services/bannerService';
import { useTheme } from '../../hooks/useTheme';
import { lockPageScroll } from '../../utils/scrollLock';

const PAYPAL_LOGO_URL = "https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg";
let donationSuccessClaimed = false;

/** Identidad del listado, para no repintar el carrusel cuando llega lo mismo. */
const bannersSignature = (banners: HomeBanner[]) =>
  banners.map((banner) => `${banner.id}:${banner.image}:${banner.imageMobile}`).join('|');

const PayPalLogo = ({ className = "h-5 w-auto" }: { className?: string }) => (
  <img
    src={PAYPAL_LOGO_URL}
    alt="PayPal"
    className={className}
    loading="lazy"
    decoding="async"
  />
);

const DiscordLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 127.14 96.36" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.11,77.11,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22c.63-23.28-18.68-56.56-18.9-56.61ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z" /></svg>
);

const TelegramLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" /></svg>
);

const supportThemes = [
  {
    accent: "#FF4D88",
    paymentText: "#ffffff",
    borderStart: "#FF4D88",
    borderMiddle: "#ff3d7d",
    borderEnd: "#d92562",
    surface: "#17070f",
    surfaceHover: "#210914",
    accentSoft: "rgba(255, 77, 136, 0.10)",
    accentBorder: "rgba(255, 77, 136, 0.50)",
    glow: "rgba(255, 77, 136, 0.28)"
  }
];

type NewsProps = {
  variant?: "default" | "youth";
};

export default function News({ variant = "default" }: NewsProps) {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isYouthNews = variant === "youth";
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(getStoredToken()));
  const [donationAmount, setDonationAmount] = useState("5.00");
  const [customAmount, setCustomAmount] = useState("");
  const [donationError, setDonationError] = useState("");

  // Banners publicados en WordPress (Banners Home) para este bloque. Al volver a
  // la portada se arranca con lo ya conocido, así el carrusel se pinta en el
  // primer fotograma en lugar de mostrar el hueco negro mientras llega la API.
  const [banners, setBanners] = useState<HomeBanner[]>(
    () => getCachedHomeBanners(isYouthNews ? 'youth' : 'home') ?? [],
  );
  const [currentSlide, setCurrentSlide] = useState(0);


  // Mantiene las acciones privadas sincronizadas con la sesión actual.
  useEffect(() => {
    const updateAuth = () => {
      setIsAuthenticated(Boolean(getStoredToken()));
    };
    window.addEventListener(AUTH_CHANGED_EVENT, updateAuth);
    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, updateAuth);
    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, updateAuth);
      window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, updateAuth);
    };
  }, []);

  // Banners administrados desde WordPress. Si lo que llega es idéntico a lo que
  // ya se está mostrando no se toca el estado: así no se reinicia la diapositiva
  // activa ni se vuelven a montar las imágenes.
  useEffect(() => {
    let active = true;
    void fetchHomeBanners(isYouthNews ? 'youth' : 'home').then((list) => {
      if (!active) return;
      setBanners((current) => (bannersSignature(current) === bannersSignature(list) ? current : list));
    });
    return () => { active = false; };
  }, [isYouthNews]);

  // Solo se vuelve al primer banner si el que estaba activo ya no existe.
  useEffect(() => {
    setCurrentSlide((slide) => (slide < banners.length ? slide : 0));
  }, [banners.length]);

  // Auto-play slider
  useEffect(() => {
    if (banners.length < 2) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev === banners.length - 1 ? 0 : prev + 1));
    }, 6000);
    return () => clearInterval(timer);
  }, [banners.length]);

  useEffect(() => {
    if (donationSuccessClaimed) return;

    const currentUrl = new URL(window.location.href);
    if (currentUrl.searchParams.get("donation") !== "success") return;

    donationSuccessClaimed = true;
    setShowSuccessModal(true);
    currentUrl.searchParams.delete("donation");
    window.history.replaceState(
      window.history.state,
      "",
      `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`
    );
  }, []);

  useEffect(() => {
    if (!showDonateModal && !showSuccessModal) return;

    const releaseScroll = lockPageScroll();
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setShowDonateModal(false);
      setShowSuccessModal(false);
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      releaseScroll();
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showDonateModal, showSuccessModal]);

  const handleAmountChange = (amount: string) => {
    setDonationAmount(amount);
    setCustomAmount("");
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomAmount(val);
    setDonationAmount(val);
  };

  const handleDonation = () => {
    try {
      setDonationError("");
      const returnUrl = `${window.location.origin}/?donation=success`;
      const paypalParams = new URLSearchParams({
        cmd: '_xclick',
        business: '25tumanhuaerick12@gmail.com',
        item_name: 'Donación al Servidor MangaMukai',
        amount: parsedDonationAmount.toFixed(2),
        currency_code: 'USD',
        return: returnUrl,
        cancel_return: window.location.origin,
        rm: '2'
      });

      const paypalWindow = window.open(`https://www.paypal.com/cgi-bin/webscr?${paypalParams.toString()}`, '_blank');
      if (!paypalWindow) {
        setDonationError("No se pudo abrir PayPal. Permite las ventanas emergentes e inténtalo otra vez.");
        return;
      }

      try {
        paypalWindow.opener = null;
      } catch {
        // Algunos navegadores aíslan la ventana externa automáticamente.
      }
      setShowDonateModal(false);
    } catch (error) {
      console.error(error);
      setDonationError("Hubo un error al conectar con PayPal. Inténtalo nuevamente.");
    }
  };

  /**
   * El enlace del banner lo define WordPress: acciones internas (#vip, #donar),
   * rutas de la propia web (/biblioteca) o URLs externas.
   */
  const handleBannerClick = (banner: HomeBanner) => {
    const link = banner.link.trim();
    if (!link) return;

    if (link === "#vip" || link === "#donar" || link === "#donate") {
      const needsAuth = link === "#vip";
      if (needsAuth && !isAuthenticated) {
        navigate('/auth/login', {
          state: { returnTo: `${window.location.pathname}${window.location.search}` },
        });
        return;
      }
      if (link === "#vip") {
        openSubscriptionModal();
      } else {
        setDonationError("");
        setShowDonateModal(true);
      }
      return;
    }

    if (link.startsWith('/')) {
      navigate(link, { state: { returnTo: `${window.location.pathname}${window.location.search}` } });
      return;
    }

    window.open(link, banner.newTab ? "_blank" : "_self", "noopener,noreferrer");
  };

  const currentSupportTheme = supportThemes[0];
  const supportThemeVariables = {
    "--support-accent": currentSupportTheme.accent,
    "--support-border-start": currentSupportTheme.borderStart,
    "--support-border-middle": currentSupportTheme.borderMiddle,
    "--support-border-end": currentSupportTheme.borderEnd,
    "--support-surface": currentSupportTheme.surface,
    "--support-surface-hover": currentSupportTheme.surfaceHover,
    "--support-accent-soft": currentSupportTheme.accentSoft,
    "--support-accent-border": currentSupportTheme.accentBorder,
    "--support-glow": currentSupportTheme.glow
  } as CSSProperties;
  const isLightTheme = theme === "light";
  const parsedDonationAmount = Number.parseFloat(donationAmount);
  const canDonate = Number.isFinite(parsedDonationAmount) && parsedDonationAmount > 0;

  return (
    <section className="home-news relative w-full px-4 md:px-6 z-30 mb-6 md:mb-16 -mt-[40px] md:mt-12 font-sans antialiased overflow-hidden">
      <style>{`
        @keyframes manga-lines {
          0% { background-position: 0 0; }
          100% { background-position: 100% 100%; }
        }
        .manga-bg {
          background-image: repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.03) 10px, rgba(255,255,255,0.03) 20px);
          animation: manga-lines 20s linear infinite;
        }
        .feroz-clip {
          clip-path: polygon(0 0, 100% 0, 98% 100%, 2% 100%);
        }
        .btn-clip {
          clip-path: polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%);
        }
        .card-clip {
          clip-path: polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px);
        }
        .news-support-card {
          background: linear-gradient(90deg, var(--support-border-start), var(--support-border-middle), var(--support-border-end));
        }
        .news-support-surface {
          background-color: var(--support-surface);
        }
        .news-support-card:hover .news-support-surface {
          background-color: var(--support-surface-hover);
        }
        .news-support-glow {
          background: radial-gradient(circle at right, var(--support-glow), transparent 70%);
        }
        .news-support-icon {
          color: var(--support-accent);
          background-color: var(--support-accent-soft);
          border-color: var(--support-accent-border);
        }
        .news-support-card:hover .news-support-icon {
          color: white;
          background-color: var(--support-accent);
        }
        .news-support-card:focus-visible {
          outline: 2px solid var(--support-accent);
          outline-offset: 3px;
        }
        .news-donation-dialog {
          border-color: var(--support-accent-border);
        }
        .news-donation-close:hover {
          color: var(--support-accent);
        }
        .news-donation-close:focus-visible {
          color: var(--support-accent);
          box-shadow: 0 0 0 2px var(--support-accent);
        }
        .news-donation-option[data-active="true"] {
          border-color: var(--support-accent);
          background-color: var(--support-accent);
        }
        .news-donation-theme-light .news-donation-option[data-active="true"] {
          color: black;
        }
        .news-donation-theme-dark .news-donation-option[data-active="true"] {
          color: white;
        }
        .news-donation-option:focus-visible {
          box-shadow: 0 0 0 2px var(--support-accent);
        }
        .news-donation-option-dark:hover {
          color: white;
          border-color: var(--support-accent-border);
          background-color: var(--support-surface);
        }
        .news-donation-input-shell[data-active="true"] {
          border-color: var(--support-accent);
        }
        .news-donation-payment:hover {
          filter: brightness(0.94);
        }
        .news-donation-payment:focus-visible {
          box-shadow: 0 0 0 3px var(--support-accent-soft), 0 0 0 1px var(--support-accent);
        }
      `}</style>

      <div className="max-w-[1300px] mx-auto relative">
        
        {/* CARRUSEL DE BANNERS — el contenido se administra desde WordPress (Banners Home) */}
        <div className="home-news-shell relative group z-10 feroz-clip p-[2px] transition-all duration-500 bg-gradient-to-br from-white/20 via-white/5 to-transparent shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9)]">

          <div className="home-theme-surface relative w-full min-h-[430px] sm:min-h-[380px] md:h-[400px] feroz-clip overflow-hidden bg-[#0a0a0f] manga-bg">

            {banners.map((banner, index) => {
              const isActive = index === currentSlide;
              return (
                <div
                  key={banner.id}
                  className={`absolute inset-0 transition-opacity duration-700 ease-out ${isActive ? 'opacity-100 z-20' : 'pointer-events-none opacity-0 z-0'}`}
                  aria-hidden={!isActive}
                >
                  <picture className="block h-full w-full">
                    {banner.imageMobile && <source media="(max-width: 767px)" srcSet={banner.imageMobile} />}
                    <img
                      src={banner.image}
                      alt={banner.title}
                      className="h-full w-full object-cover object-center"
                      loading={index === 0 ? 'eager' : 'lazy'}
                      decoding="async"
                    />
                  </picture>

                  {/* La imagen completa lleva al enlace configurado; el botón es opcional. */}
                  {isActive && banner.link !== "" && (
                    <button
                      type="button"
                      onClick={() => handleBannerClick(banner)}
                      aria-label={banner.title || banner.buttonLabel}
                      className="absolute inset-0 z-10 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70"
                    />
                  )}

                  {isActive && banner.showButton && (
                    <button
                      type="button"
                      onClick={() => handleBannerClick(banner)}
                      className="btn-clip group/cta absolute bottom-4 left-5 z-20 inline-flex items-center gap-2 overflow-hidden bg-white px-5 py-2.5 text-[11px] font-black uppercase tracking-widest text-black shadow-[0_10px_30px_-12px_rgba(0,0,0,0.9)] transition-all duration-300 hover:scale-105 md:bottom-8 md:left-10 md:gap-3 md:px-8 md:py-3.5 md:text-[13px]"
                    >
                      <span className="absolute inset-0 bg-black opacity-0 transition-opacity duration-300 group-hover/cta:opacity-100" />
                      <span className="relative z-10 transition-colors group-hover/cta:text-white">{banner.buttonLabel}</span>
                      <ArrowUpRight size={17} className="relative z-10 transition-all duration-300 group-hover/cta:rotate-45 group-hover/cta:text-white" strokeWidth={3} />
                    </button>
                  )}
                </div>
              );
            })}

            {/* FLECHAS MANUALES — una en cada extremo */}
            {banners.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Banner anterior"
                  onClick={() => setCurrentSlide((prev) => (prev === 0 ? banners.length - 1 : prev - 1))}
                  className="absolute left-3 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 -skew-x-12 items-center justify-center border-2 border-white/20 bg-black/60 text-white backdrop-blur-md transition-all hover:scale-110 md:left-6 md:h-12 md:w-12 group/arr"
                >
                  <ChevronLeft size={22} className="skew-x-12 transition-transform group-hover/arr:-translate-x-1" />
                </button>
                <button
                  type="button"
                  aria-label="Banner siguiente"
                  onClick={() => setCurrentSlide((prev) => (prev === banners.length - 1 ? 0 : prev + 1))}
                  className="absolute right-3 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 -skew-x-12 items-center justify-center border-2 border-white/20 bg-black/60 text-white backdrop-blur-md transition-all hover:scale-110 md:right-6 md:h-12 md:w-12 group/arr"
                >
                  <ChevronRight size={22} className="skew-x-12 transition-transform group-hover/arr:translate-x-1" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* --- CARDS INFERIORES --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 md:mt-6 w-full px-2">
          
          {/* DISCORD CARD */}
          <a href="https://discord.gg/ZXt4SUxH" target="_blank" rel="noopener noreferrer"
            className="home-news-mini card-clip group relative p-[2px] block transition-all duration-500 bg-white/10 hover:bg-[#5865F2] hover:scale-[1.02] hover:-translate-y-1 shadow-lg">
            <div className="home-theme-surface card-clip relative h-[80px] md:h-[100px] bg-[#0c0c11] overflow-hidden flex items-center p-4 gap-2 md:gap-4">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')]"></div>
              
              <div className="w-12 h-12 md:w-16 md:h-16 shrink-0 bg-[#5865F2]/20 border border-[#5865F2] -skew-x-12 flex items-center justify-center text-[#5865F2] group-hover:bg-[#5865F2] group-hover:text-white transition-colors duration-300">
                  <Gamepad2 className="w-6 h-6 md:w-8 md:h-8 skew-x-12" strokeWidth={2.5} />
              </div>
              
              <div className="flex flex-col z-10">
                <h3 className="home-news-title text-white font-black text-lg md:text-xl uppercase italic tracking-tighter flex items-center gap-2 group-hover:text-[#5865F2] transition-colors">
                  DISCORD <span className="w-2 h-2 bg-green-500 shadow-[0_0_8px_#22c55e] animate-pulse -skew-x-12"></span>
                </h3>
                <p className="text-gray-400 text-[10px] md:text-xs font-bold uppercase tracking-widest group-hover:text-white/80">Únete al gremio</p>
              </div>

              <div className="home-news-brandmark-wrap absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <DiscordLogo className="home-news-brandmark home-news-brandmark-discord w-32 h-32 text-white" />
              </div>
            </div>
          </a>

          {/* DONATE BUTTON */}
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() => setShowDonateModal(true)}
            className="news-support-card card-clip group relative w-full p-[2px] text-left transition-all duration-500 hover:-translate-y-1 hover:scale-[1.02] focus-visible:outline-none"
            style={supportThemeVariables}
          >
            <span className="home-theme-surface card-clip relative flex h-[80px] items-center justify-center overflow-hidden bg-[#0c0c11] px-5 transition-colors duration-500 md:h-[100px] md:px-6">
              <span className="relative z-10 flex min-w-0 items-center justify-center gap-3">
                <span className="news-support-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors duration-500 md:h-11 md:w-11">
                  <Heart size={19} fill="currentColor" />
                </span>
                <span className="home-theme-title min-w-0 whitespace-nowrap text-[19px] font-black uppercase italic leading-none tracking-tight text-white md:text-[22px]">Donación</span>
              </span>
            </span>
          </button>

          {/* TELEGRAM CARD */}
          <a href="https://t.me/+J6TE0l401vRhZTYx/" target="_blank" rel="noopener noreferrer"
            className="home-news-mini card-clip group relative p-[2px] block transition-all duration-500 bg-white/10 hover:bg-[#229ED9] hover:scale-[1.02] hover:-translate-y-1 shadow-lg">
            <div className="home-theme-surface card-clip relative h-[80px] md:h-[100px] bg-[#0c0c11] overflow-hidden flex items-center p-4 gap-4">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')]"></div>
              
              <div className="hidden w-12 h-12 md:w-16 md:h-16 shrink-0 bg-[#229ED9]/20 border border-[#229ED9] -skew-x-12 md:flex items-center justify-center text-[#229ED9] group-hover:bg-[#229ED9] group-hover:text-white transition-colors duration-300">
                  <ShieldAlert className="w-6 h-6 md:w-8 md:h-8 skew-x-12" strokeWidth={2.5} />
              </div>

              <div className="home-news-brandmark-wrap absolute -bottom-4 -left-4 opacity-10 transition-opacity group-hover:opacity-20 md:hidden">
                <TelegramLogo className="home-news-brandmark home-news-brandmark-telegram h-32 w-32 text-white" />
              </div>
              
              <div className="z-10 ml-auto flex flex-col items-end text-right md:ml-0 md:items-start md:text-left">
                <h3 className="home-news-title text-white font-black text-lg md:text-xl uppercase italic tracking-tighter flex items-center gap-2 group-hover:text-[#229ED9] transition-colors">
                  TELEGRAM
                </h3>
                <p className="text-gray-400 text-[10px] md:text-xs font-bold uppercase tracking-widest group-hover:text-white/80">
                  <span className="md:hidden">Alertas y Novedades</span>
                  <span className="hidden md:inline">Alertas y Noticias</span>
                </p>
              </div>

              <div className="flex h-12 w-12 shrink-0 -skew-x-12 items-center justify-center border border-[#229ED9] bg-[#229ED9]/20 text-[#229ED9] transition-colors duration-300 group-hover:bg-[#229ED9] group-hover:text-white md:hidden">
                <ShieldAlert className="h-6 w-6 skew-x-12" strokeWidth={2.5} />
              </div>

              <div className="home-news-brandmark-wrap absolute -right-4 -bottom-4 hidden opacity-10 group-hover:opacity-20 transition-opacity md:block">
                <TelegramLogo className="home-news-brandmark home-news-brandmark-telegram w-32 h-32 text-white" />
              </div>
            </div>
          </a>

        </div>
      </div>

      {/* MODAL DE DONACIÓN */}
      {showDonateModal && createPortal(
        <div className={`fixed inset-0 z-[400] overflow-y-auto overscroll-contain p-3 backdrop-blur-[7px] sm:p-6 ${isLightTheme ? "bg-slate-900/35" : "bg-black/70"}`}>
          <button
            type="button"
            aria-label="Cerrar ventana de apoyo"
            className="fixed inset-0 cursor-default"
            onClick={() => setShowDonateModal(false)}
          />
          <div className="relative flex min-h-full items-center justify-center py-2 sm:py-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="donation-modal-title"
              className={`news-donation-dialog relative z-10 flex max-h-[calc(100dvh-1.5rem)] w-full max-w-[460px] flex-col overflow-hidden rounded-[24px] border sm:max-h-[calc(100dvh-3rem)] ${isLightTheme ? "news-donation-theme-light bg-white text-slate-950" : "news-donation-theme-dark bg-black text-white"}`}
              style={{
                ...supportThemeVariables,
                boxShadow: `0 30px 90px -42px ${currentSupportTheme.accent}`
              }}
            >
              <img
                src={donationBackdrop}
                alt=""
                aria-hidden="true"
                className={`pointer-events-none absolute inset-0 h-full w-full object-cover object-center ${isLightTheme ? "opacity-[0.13]" : "opacity-[0.2]"}`}
              />
              <span className={`pointer-events-none absolute inset-0 ${isLightTheme ? "bg-white/75" : "bg-black/70"}`} aria-hidden="true" />
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute inset-0 ${isLightTheme ? "opacity-45" : "opacity-60"}`}
                style={{ background: `radial-gradient(circle at 88% 0%, ${currentSupportTheme.glow}, transparent 40%)` }}
              />

              <div className="relative z-10 shrink-0 px-5 pb-3 pt-6 sm:px-8 sm:pb-4 sm:pt-8">
                <div className="flex items-center justify-between gap-5">
                  <h3 id="donation-modal-title" className="min-w-0 whitespace-nowrap text-[22px] font-black uppercase leading-none tracking-[-0.04em] sm:text-[30px]">Apoya el proyecto</h3>
                  <button
                    type="button"
                    autoFocus
                    onClick={() => setShowDonateModal(false)}
                    aria-label="Cerrar"
                    className={`news-donation-close flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors focus-visible:outline-none ${isLightTheme ? "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100" : "border-neutral-800 bg-[#0a0a0a] text-neutral-400 hover:bg-neutral-900"}`}
                  >
                    <X size={17} strokeWidth={2.25} />
                  </button>
                </div>
                <p className={`mt-3 max-w-[390px] text-[14px] font-normal leading-[1.65] ${isLightTheme ? "text-slate-500" : "text-neutral-500"}`}>
                  Tu aporte ayuda a mantener los servidores, acelerar las mejoras y sostener nuevas publicaciones.
                </p>
              </div>

              <div className="relative z-10 min-h-0 flex-1 overflow-y-auto">
                <div className="px-5 pb-4 pt-0 sm:px-8">
                  <div className={`rounded-2xl border p-4 ${isLightTheme ? "border-slate-200 bg-slate-50/80" : "border-neutral-800 bg-black/40"}`}>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <label className={`text-[13px] font-medium ${isLightTheme ? "text-slate-600" : "text-neutral-400"}`}>Elige un monto</label>
                      <span className="text-[11px] font-semibold" style={{ color: currentSupportTheme.accent }}>USD</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {["1.00", "5.00", "10.00", "20.00"].map((amt) => (
                        <button
                          type="button"
                          key={amt}
                          onClick={() => handleAmountChange(amt)}
                          data-active={donationAmount === amt && customAmount === ""}
                          className={`news-donation-option min-h-11 rounded-lg border px-1.5 py-2 text-[12px] font-semibold transition-colors focus-visible:outline-none ${isLightTheme
                            ? "border-slate-200 bg-transparent text-black hover:border-slate-400"
                            : "news-donation-option-dark border-neutral-800 bg-transparent text-white"
                          }`}
                        >
                          ${amt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="px-5 pb-6 pt-0 sm:px-8 sm:pb-8">
                  <div
                    data-active={customAmount !== ""}
                    className={`news-donation-input-shell relative rounded-xl border transition-colors ${isLightTheme ? "border-slate-200 bg-slate-50" : "border-neutral-900"}`}
                    style={!isLightTheme
                      ? { backgroundColor: currentSupportTheme.surface }
                      : customAmount !== ""
                        ? { backgroundColor: currentSupportTheme.accentSoft }
                        : undefined}
                  >
                      <input
                        id="custom-donation-amount"
                        type="number"
                        inputMode="decimal"
                        min="1"
                        step="0.01"
                        placeholder="$ Otro monto..."
                        value={customAmount}
                        onChange={handleCustomChange}
                        aria-label="Otro monto"
                        className={`donation-amount-input w-full bg-transparent px-4 py-2.5 text-[20px] font-semibold tracking-[-0.03em] outline-none placeholder:text-[15px] placeholder:font-normal placeholder:tracking-normal ${isLightTheme ? "text-slate-950 placeholder:text-slate-400" : "text-white placeholder:text-neutral-600"}`}
                      />
                  </div>

                  <button
                    type="button"
                    onClick={handleDonation}
                    disabled={!canDonate}
                    className="news-donation-payment mt-5 w-full rounded-full p-[3px] text-sm font-semibold transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
                    style={{
                      backgroundColor: currentSupportTheme.accent,
                      color: currentSupportTheme.paymentText
                    }}
                  >
                    <span className="flex min-h-[52px] w-full items-center justify-center rounded-full bg-white px-4 py-3">
                      <span className="flex items-center justify-center gap-3">
                        <PayPalLogo className="h-6 w-auto sm:h-7" />
                        <span className="whitespace-nowrap text-[17px] font-black italic tracking-[-0.04em] text-[#003087] sm:text-lg">
                          ${canDonate ? parsedDonationAmount.toFixed(2) : "0.00"} <span className="text-[#009cde]">USD</span>
                        </span>
                      </span>
                    </span>
                  </button>

                  {donationError && (
                    <p role="alert" className="mt-3 text-center text-[12px] font-semibold leading-relaxed text-red-400">
                      {donationError}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL DE AGRADECIMIENTO */}
      {showSuccessModal && createPortal(
        <div className="fixed inset-0 z-[450] flex items-center justify-center overflow-y-auto overscroll-contain bg-black/85 p-3 backdrop-blur-md animate-in fade-in duration-200 sm:p-6">
          <button
            type="button"
            tabIndex={-1}
            aria-label="Cerrar agradecimiento"
            className="fixed inset-0 cursor-default"
            onClick={() => setShowSuccessModal(false)}
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="donation-success-title"
            className="relative z-10 my-auto w-full max-w-[310px] overflow-hidden rounded-[24px] border border-[#FF4D88]/70 bg-[#0a0508] text-center shadow-[0_24px_80px_-28px_rgba(255,77,136,0.65)] sm:max-w-[360px]"
          >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(255,77,136,0.22),transparent_48%)]" />

              <div className="relative z-10 flex flex-col items-center px-5 py-6 sm:px-8 sm:py-8">
                <div className="relative mb-5 grid h-16 w-16 place-items-center rounded-[22px] border border-white/15 bg-gradient-to-br from-[#ff7aa7] via-[#FF4D88] to-[#d92562] shadow-[0_12px_32px_-10px_rgba(255,77,136,0.9)] sm:h-20 sm:w-20 sm:rounded-[26px]">
                  <span className="absolute inset-1 rounded-[18px] bg-white/10 sm:rounded-[22px]" />
                  <Heart aria-hidden="true" className="relative z-10 h-8 w-8 fill-white text-white sm:h-10 sm:w-10" strokeWidth={2.4} />
                </div>

                <h2 id="donation-success-title" className="text-[24px] font-black uppercase italic leading-[0.95] tracking-tighter text-white sm:text-[28px]">
                  ¡Gracias por tu <span className="text-[#FF4D88]">apoyo!</span>
                </h2>

                <button
                  type="button"
                  autoFocus
                  onClick={() => setShowSuccessModal(false)}
                  className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-[14px] border border-white bg-white px-5 py-3 text-[13px] font-black uppercase italic tracking-[0.16em] text-black shadow-[0_10px_28px_-14px_rgba(255,255,255,0.7)] transition-colors hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D88] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0508] active:bg-zinc-300"
                >
                  <Check size={18} strokeWidth={3} aria-hidden="true" /> Finalizar
                </button>
              </div>
          </div>
        </div>,
        document.body
      )}

    </section>
  );
}
