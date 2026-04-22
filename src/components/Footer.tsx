import { Facebook, Instagram, Youtube, Zap } from "lucide-react";
import { Link } from "react-router-dom"; 

// Componentes SVG personalizados
const WhatsAppIcon = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);

const TelegramIcon = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

const DiscordIcon = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
  </svg>
);

const XIcon = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/>
  </svg>
);

export const Footer = () => {
  
  const SOCIALS = [
    { 
      name: "Facebook", 
      icon: Facebook, 
      href: "https://www.facebook.com/MangaAyanokouji/",
      color: "#1877F2",
      gradient: "from-[#1877F2] to-[#0d5dbf]"
    },
    { 
      name: "WhatsApp", 
      icon: WhatsAppIcon, 
      href: "https://wa.me/51926615198",
      color: "#25D366",
      gradient: "from-[#25D366] to-[#128C7E]"
    },
    { 
      name: "X", 
      icon: XIcon, 
      href: "https://x.com/MangaMukai",
      color: "#000000",
      gradient: "from-neutral-800 to-black"
    },
    { 
      name: "Telegram", 
      icon: TelegramIcon, 
      href: "https://t.me/+J6TE0l401vRhZTYx",
      color: "#0088cc",
      gradient: "from-[#0088cc] to-[#006699]"
    },
    { 
      name: "Instagram", 
      icon: Instagram, 
      href: "https://www.instagram.com/mangamukai/",
      color: "#d62976",
      gradient: "from-[#f09433] via-[#dc2743] to-[#bc1888]",
      isGradient: true
    }, 
    { 
      name: "Youtube", 
      icon: Youtube, 
      href: "https://www.youtube.com/@MangaMukai-b3g",
      color: "#FF0000",
      gradient: "from-[#FF0000] to-[#cc0000]"
    },
    { 
      name: "Discord", 
      icon: DiscordIcon, 
      href: "https://discord.gg/ZXt4SUxH",
      color: "#5865F2",
      gradient: "from-[#5865F2] to-[#4752C4]"
    },

  ];

  // DEFINICIÓN DE LOS LINKS ACTUALIZADA
  const LINKS = {
    explorar: [
      { label: "Tendencias", to: "/" }, // Cambiado a Home
      { label: "Novedades", to: "/" },  // Cambiado a Home
      { label: "Ranking", to: "/" },    // Cambiado a Home
      { label: "Nosotros", to: "/nosotros" }, // Cambiado "Noticias" por "Nosotros" y link a /nosotros
    ],
    legal: [
      { label: "DMCA", to: "/legal?tab=dmca" },
      { label: "Privacidad", to: "/legal?tab=privacy" },
      { label: "Términos", to: "/legal?tab=terms" },
      { label: "Contacto", to: "/contacto" }
    ]
  };

  return (
    <footer className="relative w-full overflow-hidden text-neutral-400 font-sans bg-[#020205]">
      
      {/* === BACKGROUND ESPACIAL === */}
      <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute bottom-0 left-0 right-0 h-[300px] bg-gradient-to-t from-[#FF4D88]/5 via-transparent to-transparent"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#000000_100%)] opacity-80"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        
        {/* === SECCIÓN SUPERIOR === */}
        <div className="py-20 grid grid-cols-1 lg:grid-cols-12 gap-16">
          
          {/* COLUMNA IZQUIERDA: Branding */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <Link to="/" className="group flex items-center gap-3 w-fit">
                <div className="relative">
                    {/* Brillo Rosa Metálico */}
                    <div className="absolute inset-0 bg-[#FF4D88]/20 rounded-xl"></div>
                    <div className="relative bg-[#0a0a0a] border border-white/10 p-3 rounded-xl group-hover:border-[#FF4D88]/50 transition-colors duration-300 shadow-[0_0_15px_rgba(255,77,136,0.1)]">
                        <Zap size={24} className="text-[#FF4D88]" fill="currentColor"/>
                    </div>
                </div>
                <div className="flex flex-col leading-none">
                    <span className="text-3xl font-[900] tracking-tighter text-white uppercase italic">
                        Manga<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF4D88] to-[#BA2B5A]">Mukai</span>
                    </span>
                </div>
            </Link>
            <p className="text-sm leading-relaxed text-neutral-400 max-w-sm font-medium">
              Tu plataforma de lectura digital optimizada. Disfruta de la mejor experiencia con calidad premium, velocidad warp y diseño de vanguardia.
            </p>
            
            <div className="flex gap-3 flex-wrap font-mono">
              <div className="px-3 py-1 bg-[#1a1a1a] rounded text-[10px] border-blue-500/20 uppercase tracking-wider">
                Disfruta
              </div>
              <div className="px-3 py-1 bg-[#1a1a1a] rounded text-[10px] border-[#FF4D88]/20 text-[#FF4D88]/70 uppercase tracking-wider border">
                Imagina
              </div>
            </div>
          </div>

          {/* COLUMNA CENTRO: Links */}
          <div className="lg:col-span-4 grid grid-cols-2 gap-8">
            
            <div className="flex flex-col gap-6">
                <h4 className="text-xs font-[900] text-white uppercase tracking-[0.2em] flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-[#FF4D88] rounded-full shadow-[0_0_8px_#FF4D88]"></span>
                  Navegación
                </h4>
                <ul className="flex flex-col gap-3">
                    {LINKS.explorar.map(item => (
                        <li key={item.label}>
                            <Link to={item.to} className="text-sm text-neutral-400 hover:text-white hover:translate-x-2 transition-all duration-300 inline-flex items-center gap-2 group">
                                <span className="w-0 group-hover:w-2 h-[1px] bg-[#FF4D88] transition-all duration-300"></span>
                                {item.label}
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>

            <div className="flex flex-col gap-6">
                <h4 className="text-xs font-[900] text-white uppercase tracking-[0.2em] flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-[#FF4D88] rounded-full shadow-[0_0_8px_#FF4D88]"></span>
                  Legal
                </h4>
                <ul className="flex flex-col gap-3">
                    {LINKS.legal.map(item => (
                        <li key={item.label}>
                            <Link to={item.to} className="text-sm text-neutral-400 hover:text-white hover:translate-x-2 transition-all duration-300 inline-flex items-center gap-2 group">
                                <span className="w-0 group-hover:w-2 h-[1px] bg-[#FF4D88] transition-all duration-300"></span>
                                {item.label}
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
          </div>

          {/* COLUMNA DERECHA: Newsletter */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <h4 className="text-xs font-[900] text-white uppercase tracking-[0.2em]">
              Mantente al Dia
            </h4>
            <p className="text-xs text-neutral-500 font-mono">
              RECIBE LAS ÚLTIMAS ACTUALIZACIONES Y CAPÍTULOS DIRECTAMENTE EN TU DISPOSITIVO.
            </p>
            <div className="flex gap-2 p-1 bg-[#111] border border-white/10 rounded-xl focus-within:border-[#FF4D88]/50 transition-all shadow-inner">
              <input 
                type="email" 
                placeholder="usuario@red.com" 
                className="flex-1 bg-transparent border-none px-4 py-2 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:ring-0"
              />
              <button className="bg-[#FF4D88] hover:bg-[#E03D76] text-white px-6 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(255,77,136,0.2)] active:scale-95">
                Unirse
              </button>
            </div>
          </div>

        </div>

        {/* === REDES SOCIALES === */}
        <div className="border-t border-white/5 py-10">
          <div className="flex flex-wrap justify-center items-center gap-6">
            {SOCIALS.map((social, idx) => (
              <a 
                key={idx}
                href={social.href}
                target="_blank" 
                rel="noreferrer"
                className="group relative"
              >
                <div 
                  className="relative bg-[#0F0F0F] border border-white/5 rounded-2xl px-6 py-4 flex items-center gap-3 transition-all duration-300 group-hover:-translate-y-1 group-hover:border-[#FF4D88]/30 group-hover:bg-[#151515]"
                >
                  <social.icon 
                    size={20} 
                    className="text-neutral-400 transition-colors duration-300 group-hover:text-[#FF4D88]"
                  />
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 group-hover:text-white transition-colors">
                    {social.name}
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* === DISCLAIMER === */}
        <div className="border-t border-white/5 py-10">
          <div className="bg-[#0a0a0a] rounded-xl p-8 border border-white/5">
             <p className="text-sm text-neutral-400 font-medium leading-relaxed text-center tracking-wide max-w-4xl mx-auto">
               All the comics on this website are only previews of the original comics. There may be many language errors, character names, and story lines. For the original version, please buy the comic if it's available in your city.
             </p>
          </div>
        </div>

        {/* === BARRA INFERIOR === */}
        <div className="border-t border-white/5 py-6 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-mono text-neutral-600 uppercase tracking-widest">
          <div className="flex items-center gap-4">
            <p>
              &copy; {new Date().getFullYear()} MangaMukai Corp.
            </p>
            <div className="hidden md:block h-3 w-px bg-neutral-800"></div>
            <p>
              Architect: <span className="text-white font-bold group-hover:text-[#FF4D88] transition-colors">ChemixX7</span>
            </p>
          </div>
          <div className="flex gap-6 items-center">
            <span className="hover:text-white cursor-pointer transition-colors">v1.1.1 [Stable]</span>
            <div className="h-3 w-px bg-neutral-800"></div>
            <span className="hover:text-white cursor-pointer transition-colors flex items-center gap-2">
                <span>Server Status</span>
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_#22c55e]"></div>
            </span>
          </div>
        </div>

      </div>
    </footer>
  );
};