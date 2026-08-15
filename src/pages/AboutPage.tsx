import { useState } from "react"; // NUEVO
import { motion } from "framer-motion";
import { Users, Zap, Shield, Target, ArrowRight } from "lucide-react";
import { AuthModal } from "../components/modals";
import { Footer } from "../components/layout";

const FEATURES = [
  {
    title: "Comunidad Global",
    desc: "Conectamos talentos de todo el mundo en un solo universo digital, uniendo artistas, creadores y lectores que comparten la misma pasión por el manga y las grandes historias",
    icon: Users,
    colSpan: "md:col-span-2",
    bg: "bg-black text-white"
  },
  {
    title: "Velocidad",
    desc: "Una infraestructura diseñada para que cada página cargue al instante y la historia nunca se detenga.",
    icon: Zap,
    colSpan: "md:col-span-1",
    bg: "bg-zinc-50 border border-zinc-200"
  },
  {
    title: "Seguridad",
    desc: "Protección avanzada que resguarda cada dato, con seguridad total de principio a fin para que la experiencia sea siempre confiable.",
    icon: Shield,
    colSpan: "md:col-span-1",
    bg: "bg-zinc-50 border border-zinc-200"
  },
  {
    title: "Nuestra Misión",
    desc: "Nuestra misión es ofrecer mangas accesibles y de alta calidad, brindándote una plataforma donde puedas descubrir, leer y disfrutar historias increíbles sin barreras ni complicaciones.",
    icon: Target,
    colSpan: "md:col-span-2",
    bg: "bg-[#FF4D88] text-white" 
  },
];

export const AboutPage = () => {
  // NUEVO: Estado para controlar el modal dentro de esta sección
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <section className="relative w-full py-24 bg-white overflow-hidden">
        {/* Fondo decorativo sutil */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        
        <div className="max-w-[1200px] mx-auto px-6 relative z-10">
          
          {/* --- HEADER --- */}
          <div className="flex flex-col md:flex-row gap-12 items-end mb-20">
            <div className="w-full md:w-1/2">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
              >
                <h2 className="text-sm font-black tracking-[0.3em] uppercase text-[#FF4D88] mb-4">
                  Quiénes Somos
                </h2>
                <h3 className="text-5xl md:text-7xl font-[1000] uppercase italic tracking-tighter leading-[0.9] text-black">
                  NO SEGUIMOS <br />
                  TENDENCIAS <br />
                  <span className="text-zinc-300">LAS CREAMOS</span>
                </h3>
              </motion.div>
            </div>

            <div className="w-full md:w-1/2 md:pb-4">
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2, duration: 0.8 }}
                className="text-lg text-zinc-600 font-medium leading-relaxed"
              >
                Nacimos del deseo de expandir el mundo del manga y romper los límites de la narrativa tradicional. Somos una comunidad de lectores y creadores dando forma a un universo donde cada viñeta transmite emoción y cada historia se vive como una experiencia.
              </motion.p>
            </div>
          </div>

          {/* --- BENTO GRID --- */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className={`p-8 rounded-[2rem] flex flex-col justify-between group cursor-default transition-all duration-500 hover:shadow-xl ${feature.colSpan} ${feature.bg}`}
              >
                <div className="mb-8">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/20 backdrop-blur-sm mb-6 group-hover:scale-110 transition-transform duration-300">
                    <feature.icon size={24} className={feature.bg.includes('text-white') ? 'text-white' : 'text-black'} strokeWidth={2} />
                  </div>
                  <h4 className={`text-2xl font-[900] uppercase italic tracking-tighter mb-3 ${feature.bg.includes('text-white') ? 'text-white' : 'text-black'}`}>
                    {feature.title}
                  </h4>
                  <p className={`text-sm font-medium leading-relaxed ${feature.bg.includes('text-white') ? 'text-white/80' : 'text-zinc-500'}`}>
                    {feature.desc}
                  </p>
                </div>
                
                <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-x-2 group-hover:translate-x-0">
                  <ArrowRight size={20} className={feature.bg.includes('text-white') ? 'text-white' : 'text-black'} />
                </div>
              </motion.div>
            ))}
          </div>

          {/* --- STATS FOOTER --- */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="mt-6 w-full bg-black rounded-[2rem] p-12 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left"
          >
              {/* Efecto de fondo abstracto */}
              <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-[#FF4D88] rounded-full blur-[120px] opacity-20 pointer-events-none"></div>

              <div className="relative z-10">
                <h4 className="text-white text-3xl font-[1000] italic uppercase tracking-tighter">
                  ¿Listo para empezar?
                </h4>
                <p className="text-zinc-400 mt-2 font-medium">Únete a más de 100,000 usuarios hoy.</p>
              </div>

              {/* NUEVO: Botón conectado al estado del modal */}
              <button 
                onClick={() => setIsModalOpen(true)}
                className="relative z-10 px-8 py-4 bg-white text-black text-xs font-[1000] uppercase tracking-[0.2em] rounded-xl hover:bg-[#FF4D88] hover:text-white transition-colors duration-300 shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,77,136,0.6)]"
              >
                Crear Cuenta Gratis
              </button>
          </motion.div>

        </div>
      </section>

      {/* NUEVO: Renderizado del Modal */}
      <AuthModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        initialView="register" 
      />

      {/* Footer Integrado al final */}
      <Footer />
    </>
  );
};
