import { useState, useEffect } from "react";
import { ArrowUpRight, Heart, X, DollarSign, Check, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import logoNovedades from '../assets/logosnovedades/logonovedades.png';
import TextType from './TextType';

const PaymentIcons = () => (
  <div className="flex items-center justify-center gap-2 mt-1">
    {/* VISA */}
    <div className="h-[16px] md:h-[20px] w-[32px] md:w-[38px] bg-white rounded flex items-center justify-center shadow-sm">
      <span className="text-[8px] md:text-[10px] font-black text-[#1A1F71] italic tracking-tight leading-none">VISA</span>
    </div>
    {/* Mastercard */}
    <div className="h-[16px] md:h-[20px] w-[32px] md:w-[38px] bg-[#141414] rounded flex items-center justify-center border border-white/20">
      <div className="flex items-center -space-x-[5px]">
        <div className="w-[10px] h-[10px] md:w-[12px] md:h-[12px] rounded-full bg-[#EB001B]" />
        <div className="w-[10px] h-[10px] md:w-[12px] md:h-[12px] rounded-full bg-[#F79E1B] opacity-90" />
      </div>
    </div>
    {/* PayPal */}
    <div className="h-[16px] md:h-[20px] w-[36px] md:w-[44px] bg-[#009cde] rounded flex items-center justify-center shadow-sm">
      <span className="text-[7px] md:text-[9px] font-black text-white italic leading-none tracking-tight">PayPal</span>
    </div>
  </div>
);

const DiscordLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 127.14 96.36" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.11,77.11,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22c.63-23.28-18.68-56.56-18.9-56.61ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z" />
  </svg>
);

const TelegramLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
  </svg>
);

const CyberBackground = ({ color = "red" }) => (
  <>
    <div className="absolute inset-0 z-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:30px_30px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)]"></div>
    <div className="absolute inset-0 z-0 opacity-[0.03] mix-blend-overlay pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E")` }}></div>
    <div className={`absolute -inset-1 z-0 opacity-20 hidden md:block md:blur-2xl transition-all duration-500 group-hover:opacity-40 ${color === 'blue' ? 'bg-blue-600/20' : color === 'cyan' ? 'bg-cyan-600/20' : color === 'amber' ? 'bg-amber-600/20' : 'bg-red-900/20'}`}></div>
    <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden opacity-10">
      <div className="w-full h-[2px] bg-white/50 shadow-[0_0_10px_white] animate-scanline"></div>
    </div>
  </>
);

export default function News() {
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [donationAmount, setDonationAmount] = useState("5.00");
  const [customAmount, setCustomAmount] = useState("");

  useEffect(() => {
    // Si la animación de JS ya no es necesaria, la quitamos. 
    // Mantenemos el estado por si acaso pero ya no lo usamos para el texto
  }, []);

  useEffect(() => {
    if (showDonateModal || showSuccessModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
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
      console.error('Error procesando donación:', error);
      alert('Hubo un error. Intenta de nuevo.');
    }
  };

  return (
    <section className="relative w-full px-4 md:px-6 z-30 mb-2 md:mb-12 -mt-[52px] md:mt-12 font-sans antialiased">

      <style>{`
        @keyframes scanline { 0% { transform: translateY(-100%); opacity: 0; } 50% { opacity: 1; } 100% { transform: translateY(500px); opacity: 0; } }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        .animate-scanline { animation: scanline 4s linear infinite; }
        .animate-shimmer { background-size: 200% auto; animation: shimmer 3s linear infinite; }

        @keyframes typewriter { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
        @keyframes cursor-blink { 50% { opacity: 0; } }
        @keyframes cursor-out { to { opacity: 0; } }
        .text-typewriter { animation: typewriter 1.7s steps(13, end) 0.4s both; }
        .cursor-blink { animation: cursor-blink 0.6s step-end 5, cursor-out 0s 3.5s forwards; }

        .tech-border {
            position: absolute; bottom: 0; right: 0; width: 20px; height: 20px;
            border-bottom: 2px solid rgba(255,255,255,0.2);
            border-right: 2px solid rgba(255,255,255,0.2);
            transition: all 0.3s ease;
        }
        .group:hover .tech-border { width: 100%; height: 100%; border-color: rgba(255,255,255,0.05); }

        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
      `}</style>

      <div className="max-w-[1200px] mx-auto">

        {/* ── BANNER PRINCIPAL — gradient-border wrapper ── */}
        <div className="relative group z-10 rounded-2xl p-px transition-all duration-500" style={{ background: 'linear-gradient(135deg, rgba(220,38,38,0.65) 0%, rgba(255,255,255,0.07) 45%, rgba(220,38,38,0.18) 100%)' }}>

          {/* Inner: overflow-hidden para fondo y contenido */}
          <div className="relative w-full h-[135px] md:h-[320px] rounded-2xl overflow-hidden bg-[#07050B] shadow-none md:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] transition-shadow duration-500">

            {/* BG — capas de profundidad */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_110%_at_75%_60%,rgba(220,38,38,0.13),transparent_70%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.022)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.022)_1px,transparent_1px)] bg-[size:38px_38px] [mask-image:radial-gradient(ellipse_at_30%_50%,black_20%,transparent_75%)]" />
            <div className="absolute inset-0 opacity-[0.022] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />
            <div className="absolute inset-0 bg-gradient-to-r from-[#07050B] via-[#07050B]/85 to-transparent z-10" />

            {/* CONTENIDO */}
            <div className="relative z-20 h-full flex items-center px-5 py-3 md:px-14 md:py-10">
              <div className="flex flex-col items-start max-w-lg">

                {/* Badge */}
                <div className="hidden md:flex items-center gap-2 mb-5">
                  <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-red-400 bg-red-500/10 border border-red-500/25 px-2.5 py-1 rounded-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    Actualización v2.0
                  </span>
                </div>

                {/* Título con typewriter JS */}
                <div className="mb-2 md:mb-5">
                  <h2 className="text-lg md:text-4xl lg:text-5xl font-black italic uppercase tracking-tighter leading-[0.88] drop-shadow-xl flex items-center">
                    <TextType
                      text={["NOS RENOVAMOS"]}
                      typingSpeed={75}
                      pauseDuration={1500}
                      showCursor={true}
                      cursorCharacter="_"
                      deletingSpeed={50}
                      variableSpeedEnabled={false}
                      variableSpeedMin={60}
                      variableSpeedMax={120}
                      cursorBlinkDuration={0.5}
                      className="text-white drop-shadow-[2px_2px_0px_#dc2626] md:drop-shadow-[4px_4px_0px_#dc2626] transition-all duration-300"
                    />
                  </h2>
                </div>

                {/* Descripción */}
                <div className="hidden md:flex items-stretch gap-0 max-w-sm md:max-w-md">
                  <div className="w-0.5 shrink-0 bg-gradient-to-b from-red-500 via-red-500/40 to-transparent rounded-full mr-3" />
                  <p className="text-zinc-400 text-xs md:text-[15px] font-medium leading-relaxed text-justify">
                    Nuevo diseño, rendimiento optimizado y cada detalle mejorado pensando en ti, para brindarte una experiencia más moderna, eficiente, cómoda y adaptada a lo que realmente necesitas.{" "}
                  </p>
                </div>
                <p className="md:hidden text-zinc-400 text-[8px] font-medium leading-tight max-w-[160px] text-justify">Nuevo diseño pensando en ti.</p>

                {/* CTA */}
                <Link
                  to="/catalog"
                  className="mt-3 md:mt-8 inline-flex items-center gap-2 px-4 py-2 md:px-6 md:py-3 bg-white text-black font-black text-[8px] md:text-[11px] uppercase tracking-widest rounded-lg md:rounded-xl transition-all duration-300 hover:bg-red-500 hover:text-white hover:shadow-[0_0_24px_rgba(220,38,38,0.45)] group/cta relative z-50 cursor-pointer"
                  style={{ pointerEvents: 'auto' }}
                >
                  Ver Catálogo
                  <ArrowUpRight size={12} className="group-hover/cta:rotate-45 transition-transform duration-300 md:w-4 md:h-4" />
                </Link>

              </div>
            </div>

          </div>

          {/* Personaje — FUERA del overflow-hidden, desborda el contenedor */}
          <div className="absolute bottom-0 -right-4 md:-right-16 h-[125%] w-[52%] md:w-[50%] z-50 pointer-events-none flex items-end justify-end overflow-visible">
            <div className="hidden md:block absolute bottom-8 right-16 w-52 h-52 bg-red-600/20 rounded-full blur-[70px] animate-pulse -z-10" />
            <img
              src={logoNovedades}
              alt="Personaje"
              className="relative object-contain object-right-bottom h-full w-full md:w-auto max-w-none transition-transform duration-700"
              style={{ filter: "drop-shadow(0 0 30px rgba(220,38,38,0.25)) drop-shadow(0 20px 40px rgba(0,0,0,0.9))" }}
            />
          </div>

        </div>

        {/* --- CARDS INFERIORES --- */}
        <div className="grid grid-cols-2 md:grid-cols-12 gap-2 md:gap-5 mt-1.5 md:mt-6 w-full">

          {/* 1. DISCORD CARD */}
          <a href="https://discord.gg/ZXt4SUxH" target="_blank" rel="noopener noreferrer"
            className="order-1 md:order-none col-span-1 md:col-span-4 group relative rounded-xl p-px block transition-all duration-500"
            style={{ background: 'linear-gradient(135deg, rgba(220,38,38,0.65) 0%, rgba(255,255,255,0.07) 45%, rgba(220,38,38,0.18) 100%)' }}>
            <div className="relative h-[60px] md:h-32 rounded-xl bg-[#09090b] overflow-hidden">
              <CyberBackground color="blue" />
              <div className="tech-border"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-[#5865F2]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

              <div className="relative z-10 h-full flex items-center px-3 md:px-6 gap-2 md:gap-5">
                <div className="w-8 h-8 md:w-14 md:h-14 shrink-0 rounded-lg bg-[#5865F2] flex items-center justify-center text-white shadow-none md:shadow-[0_0_20px_rgba(88,101,242,0.4)] group-hover:scale-110 transition-transform duration-300">
                  <DiscordLogo className="w-5 h-5 md:w-8 md:h-8" />
                </div>
                <div className="flex flex-col justify-center min-w-0">
                  <h3 className="text-white font-black text-[10px] md:text-xl uppercase italic tracking-tight flex items-center gap-2 leading-tight">
                    Discord <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-green-500 animate-pulse hidden md:block"></span>
                  </h3>
                  <p className="text-gray-400 text-[8px] md:text-xs font-bold uppercase tracking-wider group-hover:text-white transition-colors leading-tight truncate">Comunidad</p>
                </div>
                <ArrowUpRight className="absolute top-1.5 right-1.5 md:top-4 md:right-4 text-white/20 group-hover:text-[#5865F2] group-hover:-translate-y-1 group-hover:translate-x-1 transition-all w-3 h-3 md:w-6 md:h-6" />
              </div>
            </div>
          </a>

          {/* 2. DONATE BUTTON */}
          <div className="order-3 md:order-none col-span-2 md:col-span-4 group relative p-px rounded-xl transition-all duration-500" style={{ background: 'linear-gradient(135deg, rgba(220,38,38,0.65) 0%, rgba(255,255,255,0.07) 45%, rgba(220,38,38,0.18) 100%)' }}>
            <div className="relative h-[85px] md:h-32 w-full bg-[#09090b] rounded-xl overflow-hidden hover:shadow-[0_0_20px_rgba(220,38,38,0.15)] transition-all duration-300 flex flex-col items-center justify-center">
              <CyberBackground color="red" />
              <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-70"></div>

              <div className="relative z-10 px-3 md:px-5 w-full flex flex-col items-center gap-1.5 md:gap-2.5">
                <button
                  onClick={() => setShowDonateModal(true)}
                  className="relative w-[80%] mx-auto group/btn overflow-hidden rounded-lg bg-gradient-to-r from-red-600 via-red-500 to-red-600 bg-[length:200%_100%] hover:bg-right transition-all duration-500 py-1.5 md:py-2.5 shadow-none md:shadow-lg md:shadow-red-900/40 hover:shadow-red-600/30 hover:-translate-y-0.5 border border-white/10"
                >
                  <div className="absolute inset-0 -translate-x-full group-hover/btn:animate-[shimmer_1s_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent z-10"></div>
                  <div className="relative z-20 flex flex-col items-center gap-1 md:gap-1.5 py-0.5">
                    <span className="flex items-center justify-center gap-1.5 text-white font-black text-[11px] md:text-sm uppercase tracking-wider">
                      <Heart size={10} className="fill-white animate-pulse md:w-3.5 md:h-3.5" /> Donar
                    </span>
                    <PaymentIcons />
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* 3. TELEGRAM CARD */}
          <a href="https://t.me/+J6TE0l401vRhZTYx/" target="_blank" rel="noopener noreferrer"
            className="order-2 md:order-none col-span-1 md:col-span-4 group relative rounded-xl p-px block transition-all duration-500"
            style={{ background: 'linear-gradient(135deg, rgba(220,38,38,0.65) 0%, rgba(255,255,255,0.07) 45%, rgba(220,38,38,0.18) 100%)' }}>
            <div className="relative h-[60px] md:h-32 rounded-xl bg-[#09090b] overflow-hidden">
              <CyberBackground color="cyan" />
              <div className="tech-border"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-[#229ED9]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

              <div className="relative z-10 h-full flex items-center px-3 md:px-6 gap-2 md:gap-5">
                <div className="w-8 h-8 md:w-14 md:h-14 shrink-0 rounded-lg bg-[#229ED9] flex items-center justify-center text-white shadow-none md:shadow-[0_0_20px_rgba(34,158,217,0.4)] group-hover:scale-110 transition-transform duration-300">
                  <TelegramLogo className="w-5 h-5 md:w-8 md:h-8" />
                </div>
                <div className="flex flex-col justify-center min-w-0">
                  <h3 className="text-white font-black text-[10px] md:text-xl uppercase italic tracking-tight leading-tight">Telegram</h3>
                  <p className="text-gray-400 text-[8px] md:text-xs font-bold uppercase tracking-wider group-hover:text-white transition-colors leading-tight truncate">Alertas & Novedades</p>
                </div>
                <ArrowUpRight className="absolute top-1.5 right-1.5 md:top-4 md:right-4 text-white/20 group-hover:text-[#229ED9] group-hover:-translate-y-1 group-hover:translate-x-1 transition-all w-3 h-3 md:w-6 md:h-6" />
              </div>
            </div>
          </a>

        </div>
      </div>

      {/* MODAL DE DONACIÓN */}
      {showDonateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[#09090b] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">

            <CyberBackground color="red" />

            <div className="relative z-10 flex justify-between items-center p-6 border-b border-white/10">
              <h3 className="text-white font-black uppercase italic tracking-tighter text-xl">
                Apoyar al <span className="text-red-500">Servidor</span>
              </h3>
              <button onClick={() => setShowDonateModal(false)} className="text-zinc-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="relative z-10 p-6 space-y-6">
              <p className="text-zinc-400 text-sm leading-relaxed text-center">
                Tu apoyo nos ayuda a mantener los servidores activos y seguir mejorando la plataforma.
              </p>

              <div className="space-y-3">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest block">Selecciona un monto</label>
                <div className="grid grid-cols-4 gap-2">
                  {["1.00", "5.00", "10.00", "20.00"].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => handleAmountChange(amt)}
                      className={`py-2 rounded-lg text-sm font-bold transition-all border ${donationAmount === amt && customAmount === ""
                        ? 'bg-red-600 border-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]'
                        : 'bg-zinc-900 border-white/10 text-zinc-400 hover:border-white/30 hover:text-white'
                        }`}
                    >
                      ${amt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <DollarSign size={14} className="text-zinc-500" />
                </div>
                <input
                  type="number"
                  placeholder="Otro monto..."
                  value={customAmount}
                  onChange={handleCustomChange}
                  className={`w-full bg-zinc-900 border rounded-lg py-3 pl-9 pr-4 text-white text-sm focus:outline-none transition-all ${customAmount !== "" ? 'border-red-500 shadow-[0_0_10px_rgba(220,38,38,0.1)]' : 'border-white/10 focus:border-white/30'
                    }`}
                />
              </div>

              <div className="pt-2">
                <button
                  onClick={handleDonation}
                  className="w-full py-4 bg-[#0070BA] hover:bg-[#005ea6] text-white font-black uppercase tracking-[0.05em] text-sm rounded-xl border border-transparent transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-900/20"
                >
                  <span>Donar con</span>
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg"
                    alt="PayPal"
                    className="h-5 w-auto object-contain bg-white/90 rounded px-2 py-0.5 shadow-sm"
                  />
                </button>
                <p className="text-[10px] text-zinc-600 text-center mt-3">
                  Pagos procesados de forma segura por PayPal.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE AGRADECIMIENTO */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="relative w-full max-w-sm bg-[#09090b] border border-red-500/30 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(220,38,38,0.2)] text-center p-8">

            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-600/10 via-transparent to-transparent"></div>

            <div className="relative z-10 flex flex-col items-center">
              <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-700 rounded-full flex items-center justify-center shadow-lg shadow-red-500/30 mb-6 animate-bounce">
                <Heart size={40} className="text-white fill-white" />
              </div>

              <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-2">
                ¡Gracias, <span className="text-red-500">Legend!</span>
              </h2>

              <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                Tu donación ha sido recibida con éxito. Gracias a personas como tú, podemos seguir mejorando el servidor día a día.
              </p>

              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full py-3 bg-white hover:bg-zinc-200 text-black font-black uppercase tracking-widest text-xs rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <Check size={16} /> Cerrar
              </button>

              <Sparkles className="absolute top-4 right-4 text-red-500/20" size={30} />
              <Sparkles className="absolute bottom-4 left-4 text-red-500/20" size={20} />
            </div>
          </div>
        </div>
      )}

    </section>
  );
}