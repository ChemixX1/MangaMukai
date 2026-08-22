import { Facebook, Instagram, Youtube, Zap } from "lucide-react";
import { Link } from "react-router-dom"; 

// Componentes SVG personalizados
const WhatsAppIcon = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);

const TelegramIcon = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 2 9.7 14.3" />
    <path d="m22 2-7.8 20-4.5-7.7L2 9.8 22 2Z" />
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

export const FOOTER_SOCIALS = [
  { name: "Facebook", icon: Facebook, href: "https://www.facebook.com/MangaAyanokouji/", color: "#1877F2", gradient: "from-[#1877F2] to-[#0d5dbf]" },
  { name: "WhatsApp", icon: WhatsAppIcon, href: "https://wa.me/51926615198", color: "#25D366", gradient: "from-[#25D366] to-[#128C7E]" },
  { name: "X", icon: XIcon, href: "https://x.com/MangaMukai", color: "#000000", gradient: "from-neutral-800 to-black" },
  { name: "Telegram", icon: TelegramIcon, href: "https://t.me/+J6TE0l401vRhZTYx", color: "#0088cc", gradient: "from-[#0088cc] to-[#006699]" },
  { name: "Instagram", icon: Instagram, href: "https://www.instagram.com/mangamukai/", color: "#d62976", gradient: "from-[#f09433] via-[#dc2743] to-[#bc1888]", isGradient: true },
  { name: "Youtube", icon: Youtube, href: "https://www.youtube.com/@MangaMukai-b3g", color: "#FF0000", gradient: "from-[#FF0000] to-[#cc0000]" },
  { name: "Discord", icon: DiscordIcon, href: "https://discord.gg/ZXt4SUxH", color: "#5865F2", gradient: "from-[#5865F2] to-[#4752C4]" },
];

export const Footer = () => {
  // El footer conserva siempre su identidad oscura, independientemente del tema global.
  const isLight = false;

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
    <footer className={`manga-footer relative w-full overflow-hidden font-sans transition-colors duration-500 ${isLight ? "bg-white text-black" : "bg-black text-neutral-400"}`}>
      
      {/* === BACKGROUND ESPACIAL === */}
      <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute bottom-0 left-0 right-0 h-[300px] bg-gradient-to-t from-[#FF4D88]/5 via-transparent to-transparent"></div>
          <div className={`absolute inset-0 opacity-80 ${isLight ? "bg-[radial-gradient(circle_at_center,transparent_0%,#ffffff_100%)]" : "bg-[radial-gradient(circle_at_center,transparent_0%,#000000_100%)]"}`}></div>
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
                    <div className={`relative rounded-xl border p-3 shadow-[0_0_15px_rgba(255,77,136,0.1)] transition-colors duration-300 group-hover:border-[#FF4D88]/50 ${isLight ? "border-black/10 bg-white" : "border-white/10 bg-black"}`}>
                        <Zap size={24} className="text-[#FF4D88]" fill="currentColor"/>
                    </div>
                </div>
                <div className="flex flex-col leading-none">
                    <span className={`text-3xl font-[900] uppercase italic tracking-tighter ${isLight ? "text-black" : "text-white"}`}>
                        Manga<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF4D88] to-[#BA2B5A]">Mukai</span>
                    </span>
                </div>
            </Link>
            <p className={`max-w-sm text-sm font-medium leading-relaxed ${isLight ? "text-black/65" : "text-neutral-400"}`}>
              Tu plataforma de lectura digital optimizada. Disfruta de la mejor experiencia con calidad premium, velocidad warp y diseño de vanguardia.
            </p>
            
            <div className="flex gap-3 flex-wrap font-mono">
              <div className={`rounded px-3 py-1 text-[10px] uppercase tracking-wider ${isLight ? "border border-black/10 bg-zinc-100 text-black/65" : "bg-[#1a1a1a]"}`}>
                Disfruta
              </div>
              <div className={`rounded border border-[#FF4D88]/20 px-3 py-1 text-[10px] uppercase tracking-wider text-[#FF4D88]/70 ${isLight ? "bg-zinc-100" : "bg-[#1a1a1a]"}`}>
                Imagina
              </div>
            </div>
          </div>

          {/* COLUMNA CENTRO: Links */}
          <div className="lg:col-span-4 grid grid-cols-2 gap-8">
            
            <div className="flex flex-col gap-6">
                <h4 className={`flex items-center gap-2 text-xs font-[900] uppercase tracking-[0.2em] ${isLight ? "text-black" : "text-white"}`}>
                  <span className="w-1.5 h-1.5 bg-[#FF4D88] rounded-full shadow-[0_0_8px_#FF4D88]"></span>
                  Navegación
                </h4>
                <ul className="flex flex-col gap-3">
                    {LINKS.explorar.map(item => (
                        <li key={item.label}>
                            <Link to={item.to} className={`group inline-flex items-center gap-2 text-sm transition-all duration-300 hover:translate-x-2 ${isLight ? "text-black/60 hover:text-black" : "text-neutral-400 hover:text-white"}`}>
                                <span className="w-0 group-hover:w-2 h-[1px] bg-[#FF4D88] transition-all duration-300"></span>
                                {item.label}
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>

            <div className="flex flex-col gap-6">
                <h4 className={`flex items-center gap-2 text-xs font-[900] uppercase tracking-[0.2em] ${isLight ? "text-black" : "text-white"}`}>
                  <span className="w-1.5 h-1.5 bg-[#FF4D88] rounded-full shadow-[0_0_8px_#FF4D88]"></span>
                  Legal
                </h4>
                <ul className="flex flex-col gap-3">
                    {LINKS.legal.map(item => (
                        <li key={item.label}>
                            <Link to={item.to} className={`group inline-flex items-center gap-2 text-sm transition-all duration-300 hover:translate-x-2 ${isLight ? "text-black/60 hover:text-black" : "text-neutral-400 hover:text-white"}`}>
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
            <h4 className={`text-xs font-[900] uppercase tracking-[0.2em] ${isLight ? "text-black" : "text-white"}`}>
              Mantente al Dia
            </h4>
            <p className={`font-mono text-xs ${isLight ? "text-black/50" : "text-neutral-500"}`}>
              RECIBE LAS ÚLTIMAS ACTUALIZACIONES Y CAPÍTULOS DIRECTAMENTE EN TU DISPOSITIVO.
            </p>
            <div className={`flex gap-2 rounded-xl border p-1 shadow-inner transition-all focus-within:border-[#FF4D88]/50 ${isLight ? "border-black/10 bg-zinc-50" : "border-white/10 bg-[#111]"}`}>
              <input 
                type="email" 
                placeholder="usuario@red.com" 
                className={`flex-1 border-none bg-transparent px-4 py-2 text-sm focus:outline-none focus:ring-0 ${isLight ? "text-black placeholder:text-black/35" : "text-white placeholder:text-neutral-600"}`}
              />
              <button className="bg-[#FF4D88] hover:bg-[#E03D76] text-white px-6 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(255,77,136,0.2)] active:scale-95">
                Unirse
              </button>
            </div>
          </div>

        </div>

        {/* === REDES SOCIALES === */}
        <div className={`border-t py-10 ${isLight ? "border-black/[0.07]" : "border-white/5"}`}>
          <div className="flex flex-wrap justify-center items-center gap-6">
            {FOOTER_SOCIALS.map((social, idx) => (
              <a 
                key={idx}
                href={social.href}
                target="_blank" 
                rel="noreferrer"
                className="group relative"
              >
                <div 
                  className={`relative flex items-center gap-3 rounded-2xl border px-6 py-4 transition-all duration-300 group-hover:-translate-y-1 group-hover:border-[#FF4D88]/30 ${isLight ? "border-black/[0.08] bg-white group-hover:bg-zinc-50" : "border-white/5 bg-[#0F0F0F] group-hover:bg-[#151515]"}`}
                >
                  <social.icon 
                    size={20} 
                    className={`${isLight ? "text-black/55" : "text-neutral-400"} transition-colors duration-300 group-hover:text-[#FF4D88]`}
                  />
                  <span className={`text-xs font-bold uppercase tracking-wider transition-colors ${isLight ? "text-black/60 group-hover:text-black" : "text-neutral-400 group-hover:text-white"}`}>
                    {social.name}
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* === DISCLAIMER === */}
        <div className={`border-t py-10 ${isLight ? "border-black/[0.07]" : "border-white/5"}`}>
          <div className={`rounded-xl border p-8 ${isLight ? "border-black/[0.08] bg-zinc-50" : "border-white/5 bg-black"}`}>
             <p className={`mx-auto max-w-4xl text-center text-sm font-medium leading-relaxed tracking-wide ${isLight ? "text-black/60" : "text-neutral-400"}`}>
               All the comics on this website are only previews of the original comics. There may be many language errors, character names, and story lines. For the original version, please buy the comic if it's available in your city.
             </p>
          </div>
        </div>

        {/* === BARRA INFERIOR === */}
        <div className={`flex flex-col items-center justify-between gap-4 border-t py-6 font-mono text-[10px] uppercase tracking-widest md:flex-row ${isLight ? "border-black/[0.07] text-black/45" : "border-white/5 text-neutral-600"}`}>
          <div className="flex items-center gap-4">
            <p>
              &copy; {new Date().getFullYear()} MangaMukai Corp.
            </p>
            <div className={`hidden h-3 w-px md:block ${isLight ? "bg-black/15" : "bg-neutral-800"}`}></div>
            <p>
              Architect: <span className={`font-bold transition-colors group-hover:text-[#FF4D88] ${isLight ? "text-black" : "text-white"}`}>ChemixX7</span>
            </p>
          </div>
          <div className="flex gap-6 items-center">
            <span className={`flex cursor-pointer items-center gap-2 transition-colors ${isLight ? "hover:text-black" : "hover:text-white"}`}>
                <span>Server Status</span>
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_#22c55e]"></div>
            </span>
          </div>
        </div>

      </div>
    </footer>
  );
};
