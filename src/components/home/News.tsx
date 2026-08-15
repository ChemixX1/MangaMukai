import { useState, useEffect, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight, Heart, X, Check, ChevronRight, ChevronLeft, Zap, Gamepad2, ShieldAlert } from "lucide-react";

// Assets
import renewalBackdrop from '../../assets/banners/mythical-dragon-beast-anime-style.jpg';
import premiumBackdrop from '../../assets/banners/anime-style-mythical-dragon-creature.jpg';
import subscriptionBackdrop from '../../assets/banners/illustration-anime-character-rain.jpg';
import { CoinMarketModal, SubscriptionModal } from '../modals';
import { getStoredUser } from '../../services/authService';
import { useTheme } from '../../hooks/useTheme';

const PAYPAL_LOGO_URL = "https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg";

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

const slides = [
  {
    id: 1,
    image: renewalBackdrop,
    title: "NOS RENOVAMOS",
    subtitle: "V 2.0 UPDATE",
    description: "Prepárate para la batalla. Nuevo diseño, rendimiento extremo y una interfaz pensada para verdaderos guerreros del manga.",
    cta: "Entrar al Catálogo",
    link: "/catalog",
    action: null,
    color: "#FF4D88"
  },
  {
    id: 2,
    image: premiumBackdrop,
    title: "MANGAS PREMIUM",
    subtitle: "COIN RUSH",
    description: "Desbloquea capítulos legendarios. Recarga tus monedas y accede al contenido más exclusivo sin límites.",
    cta: "Recargar Ahora",
    link: null,
    action: "coins",
    color: "#F59E0B"
  },
  {
    id: 3,
    image: subscriptionBackdrop,
    title: "SUSCRIPCIÓN MUKAI",
    subtitle: "MUKAI PRO",
    description: "Lee sin límites, disfruta acceso anticipado y obtén ventajas exclusivas con el plan mensual de MangaMukai.",
    cta: "Descubrir Plan",
    link: null,
    action: "vip",
    color: "#00C2FF"
  }
];

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
  },
  {
    accent: "#F59E0B",
    paymentText: "#1a1204",
    borderStart: "#F59E0B",
    borderMiddle: "#fbbf24",
    borderEnd: "#92400e",
    surface: "#171006",
    surfaceHover: "#241906",
    accentSoft: "rgba(245, 158, 11, 0.12)",
    accentBorder: "rgba(245, 158, 11, 0.55)",
    glow: "rgba(245, 158, 11, 0.28)"
  },
  {
    accent: "#00C2FF",
    paymentText: "#03141b",
    borderStart: "#00C2FF",
    borderMiddle: "#0ea5e9",
    borderEnd: "#075985",
    surface: "#06141a",
    surfaceHover: "#08232d",
    accentSoft: "rgba(0, 194, 255, 0.11)",
    accentBorder: "rgba(0, 194, 255, 0.52)",
    glow: "rgba(0, 194, 255, 0.26)"
  }
];

export default function News() {
  const { theme } = useTheme();
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showCoinModal, setShowCoinModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [donationAmount, setDonationAmount] = useState("5.00");
  const [customAmount, setCustomAmount] = useState("");
  
  const [currentSlide, setCurrentSlide] = useState(0);

  // Auto-play slider
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!showDonateModal && !showSuccessModal) return;

    const previousOverflow = document.body.style.overflow;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setShowDonateModal(false);
      setShowSuccessModal(false);
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
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
      const returnUrl = `${window.location.origin}/?donation=success`;
      const paypalParams = new URLSearchParams({
        cmd: '_xclick',
        business: '25tumanhuaerick12@gmail.com',
        item_name: 'Donación al Servidor MangaMukai',
        amount: donationAmount || "1.00",
        currency_code: 'USD',
        return: returnUrl,
        cancel_return: window.location.origin,
        rm: '2'
      });
      window.open(`https://www.paypal.com/cgi-bin/webscr?${paypalParams.toString()}`, '_blank');
      setTimeout(() => {
        setShowDonateModal(false);
        setShowSuccessModal(true);
      }, 1000);
    } catch (error) {
      console.error(error);
      alert('Hubo un error. Intenta de nuevo.');
    }
  };

  const handleAction = (action: string | null, link: string | null) => {
    if (action === "donate") {
      setShowDonateModal(true);
    } else if (action === "coins") {
      setShowCoinModal(true);
    } else if (action === "vip") {
      setShowSubscriptionModal(true);
    } else if (link) {
      window.open(link, "_self");
    }
  };

  const currentData = slides[currentSlide];
  const currentSupportTheme = supportThemes[currentSlide];
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
        @keyframes glitch-anim {
          0% { clip-path: inset(10% 0 80% 0); transform: translate(-2px, 2px); }
          20% { clip-path: inset(80% 0 5% 0); transform: translate(2px, -2px); }
          40% { clip-path: inset(50% 0 30% 0); transform: translate(-2px, -2px); }
          60% { clip-path: inset(20% 0 60% 0); transform: translate(2px, 2px); }
          80% { clip-path: inset(90% 0 2% 0); transform: translate(-2px, 2px); }
          100% { clip-path: inset(30% 0 50% 0); transform: translate(2px, -2px); }
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
        .glitch-text[data-text] {
            position: relative;
        }
        .glitch-text[data-text]::after {
            content: attr(data-text);
            position: absolute;
            left: 2px;
            text-shadow: -2px 0 red;
            top: 0;
            color: white;
            background: transparent;
            overflow: hidden;
            clip-path: inset(0 0 0 0);
            animation: glitch-anim 2s infinite linear alternate-reverse;
            opacity: 0;
            transition: opacity 0.3s;
        }
        .group:hover .glitch-text[data-text]::after {
            opacity: 1;
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
        
        {/* CAROUSEL / SLIDER PRINCIPAL */}
        <div className="home-news-shell relative group z-10 feroz-clip p-[2px] transition-all duration-500 bg-gradient-to-br from-white/20 via-white/5 to-transparent shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9)]">
          
          <div className="home-theme-surface relative w-full min-h-[430px] sm:min-h-[380px] md:h-[400px] feroz-clip overflow-hidden bg-[#0a0a0f] manga-bg">
            
            {slides.map((slide, index) => (
              <div 
                key={slide.id}
                className={`absolute inset-0 transition-all duration-700 ease-out ${index === currentSlide ? 'opacity-100 scale-100 z-20' : 'opacity-0 scale-105 z-0'}`}
              >
                {/* FONDO IMAGEN */}
                <div className="absolute inset-0">
                  <img src={slide.image} alt={slide.title} className="w-full h-full object-cover object-center md:object-right opacity-50 mix-blend-screen" />
                  {/* Gradientes Manga-style */}
                  <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f] via-[#0a0a0f]/80 to-transparent" />
                  <div className={`absolute inset-0 opacity-20 mix-blend-overlay`} style={{ backgroundColor: slide.color }}></div>
                  {/* Tramado de puntos tipo manga (Halftone simulación simple) */}
                  <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:4px_4px] [mask-image:linear-gradient(to_right,black,transparent)] pointer-events-none"></div>
                </div>

                {/* CONTENIDO */}
                <div className="relative h-full flex flex-col justify-center px-6 md:px-20 w-full md:w-3/5">
                  <div className="-translate-y-5 flex items-center gap-3 mb-2 md:translate-y-0 md:mb-4">
                    <span 
                        className="flex items-center gap-2 text-[10px] md:text-[12px] font-black uppercase tracking-[0.3em] px-3 py-1 -skew-x-12 border-l-4 shadow-[0_0_15px_currentColor]"
                        style={{ borderColor: slide.color, backgroundColor: `${slide.color}20`, color: slide.color }}
                    >
                      <Zap size={14} className="animate-pulse" fill="currentColor" />
                      <span className="skew-x-12">{slide.subtitle}</span>
                    </span>
                  </div>
                  
                  <h2 
                    className="text-3xl md:text-6xl font-black italic uppercase tracking-tighter leading-[0.9] text-white mb-4 glitch-text"
                    data-text={slide.title}
                    style={{ textShadow: `4px 4px 0px ${slide.color}80, 8px 8px 0px rgba(0,0,0,0.5)` }}
                  >
                    {slide.title}
                  </h2>
                  
                  <div className="flex items-stretch gap-4 bg-black/40 backdrop-blur-sm p-4 border-l-2 -skew-x-6 w-max max-w-[90%]" style={{ borderColor: slide.color }}>
                    <p className="text-gray-200 text-[11px] md:text-[14px] font-bold leading-snug max-w-sm skew-x-6">
                      {slide.description}
                    </p>
                  </div>

                  <div className="mt-6 md:mt-8 flex gap-4">
                    <button 
                      onClick={() => handleAction(slide.action, slide.link)}
                      className="btn-clip relative inline-flex items-center gap-3 px-6 py-3 md:px-8 md:py-4 bg-white text-black font-black text-[11px] md:text-[14px] uppercase tracking-widest transition-all duration-300 hover:scale-105 group/cta overflow-hidden"
                      style={{ boxShadow: `0 0 20px ${slide.color}60` }}
                    >
                      <div className="absolute inset-0 opacity-0 group-hover/cta:opacity-100 transition-opacity" style={{ backgroundColor: slide.color }}></div>
                      <span className="relative z-10 group-hover/cta:text-white transition-colors">{slide.cta}</span>
                      <ArrowUpRight size={18} className="relative z-10 group-hover/cta:rotate-45 group-hover/cta:text-white transition-all duration-300" strokeWidth={3} />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* CONTROLES / INDICADORES (Manga Style) */}
            <div className="absolute bottom-4 left-6 md:left-20 z-30 flex gap-3">
              {slides.map((s, idx) => (
                <button 
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={`h-2 transition-all duration-300 -skew-x-12 ${currentSlide === idx ? 'w-10' : 'w-4 bg-white/30 hover:bg-white/60'}`}
                  style={{ backgroundColor: currentSlide === idx ? s.color : undefined, boxShadow: currentSlide === idx ? `0 0 10px ${s.color}` : 'none' }}
                />
              ))}
            </div>
            
            {/* FLECHAS MANUALES (Desktop) */}
            <button 
              onClick={() => setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1))}
              className="hidden md:flex absolute right-20 top-1/2 -translate-y-1/2 z-30 w-12 h-12 items-center justify-center -skew-x-12 bg-black/60 border-2 border-white/10 text-white hover:scale-110 transition-all backdrop-blur-md group/arr"
              style={{ borderColor: currentData.color }}
            >
              <ChevronLeft size={24} className="skew-x-12 group-hover/arr:-translate-x-1 transition-transform" />
            </button>
            <button 
              onClick={() => setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1))}
              className="hidden md:flex absolute right-6 top-1/2 -translate-y-1/2 z-30 w-12 h-12 items-center justify-center -skew-x-12 bg-black/60 border-2 border-white/10 text-white hover:scale-110 transition-all backdrop-blur-md group/arr"
              style={{ borderColor: currentData.color }}
            >
              <ChevronRight size={24} className="skew-x-12 group-hover/arr:translate-x-1 transition-transform" />
            </button>
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
            <span className="news-support-surface card-clip relative flex h-[80px] items-center justify-between overflow-hidden px-5 transition-colors duration-500 md:h-[100px] md:px-6">
              <span className="news-support-glow absolute inset-y-0 right-0 w-2/5 transition-colors duration-500" />
              <span className="relative z-10 flex min-w-0 items-center gap-3">
                <span className="news-support-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors duration-500 md:h-12 md:w-12">
                  <Heart size={21} fill="currentColor" />
                </span>
                <span className="min-w-0 text-[16px] font-black uppercase italic leading-none tracking-tight text-white md:text-xl">Apoyar proyecto</span>
              </span>
              <span className="relative z-10 ml-3 shrink-0 rounded-lg bg-white px-2.5 py-2">
                <PayPalLogo className="h-5 w-auto md:h-6" />
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
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL DE AGRADECIMIENTO */}
      {showSuccessModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in zoom-in duration-300">
          <div className="card-clip relative w-full max-w-sm bg-[#0a0508] border-2 border-[#FF4D88] shadow-[0_0_80px_rgba(255,77,136,0.4)] text-center p-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#FF4D88]/20 via-transparent to-transparent"></div>
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-24 h-24 bg-[#FF4D88] -skew-x-12 flex items-center justify-center shadow-[0_0_30px_#FF4D88] mb-8 animate-bounce">
                <Heart size={48} className="text-white fill-white skew-x-12" />
              </div>
              <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter mb-4 glitch-text" data-text="¡OPERACIÓN EXITOSA!">
                ¡OPERACIÓN <span className="text-[#FF4D88]">EXITOSA!</span>
              </h2>
              <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest leading-relaxed mb-8">
                Tu contribución ha sido procesada. El gremio te lo agradece profundamente.
              </p>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full py-4 bg-white hover:bg-zinc-200 text-black font-black uppercase italic tracking-[0.2em] text-sm btn-clip transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)] flex items-center justify-center gap-2 hover:scale-105"
              >
                <Check size={20} strokeWidth={3} /> FINALIZAR
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <CoinMarketModal
        isOpen={showCoinModal}
        onClose={() => setShowCoinModal(false)}
        username={getStoredUser()?.username || ''}
        userId={String(getStoredUser()?.id || '')}
      />
      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
      />
    </section>
  );
}
