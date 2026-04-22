import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, MapPin, Send, Github, Instagram, CheckCircle, AlertCircle, Loader2, Facebook, Youtube } from "lucide-react";
import { supabase } from "../supabaseClient";
// Importamos el Footer (ajusta la ruta "../components/" según donde esté este archivo)
import {Footer } from "../components/Footer"; 

// Componentes SVG personalizados para iconos no disponibles en lucide-react
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

export const ContactSection = () => {
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  // NUEVO: Efecto para pre-rellenar datos si el usuario está logueado
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Obtenemos también el username desde la tabla profiles si es posible, 
        // o desde user_metadata si lo guardaste ahí. 
        // Asumiremos user_metadata.username por tu modal de registro.
        const username = user.user_metadata?.username || "";
        
        setFormState(prev => ({
          ...prev,
          email: user.email || "",
          name: username
        }));
      }
    };
    checkUser();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    if (!formState.name || !formState.email || !formState.message || !formState.subject) {
        setFeedback({ type: 'error', msg: "Por favor completa todos los campos." });
        setLoading(false);
        return;
    }

    try {
      const { error } = await supabase
        .from('contact_messages')
        .insert([
          { 
            name: formState.name,
            email: formState.email,
            subject: formState.subject,
            message: formState.message
          }
        ]);

      if (error) throw error;

      setFeedback({ type: 'success', msg: "¡Mensaje enviado correctamente! Te responderemos pronto." });
      
      // Limpiamos solo el mensaje y asunto, mantenemos nombre/email si está logueado
      setFormState(prev => ({ ...prev, subject: "", message: "" }));

    } catch (error) {
      console.error("Error enviando mensaje:", error);
      setFeedback({ type: 'error', msg: "Hubo un error al enviar el mensaje. Intenta nuevamente." });
    } finally {
      setLoading(false);
    }
  };

  const socialLinkClass = "group flex items-center justify-center w-12 h-12 rounded-xl bg-zinc-100 border border-zinc-200 text-zinc-600 hover:bg-[#FF4D88] hover:border-[#FF4D88] hover:text-white hover:scale-110 transition-all duration-300";

  const inputClass = "w-full bg-white border border-zinc-200 rounded-xl px-5 py-4 text-sm font-medium text-black placeholder:text-zinc-400 focus:outline-none focus:border-[#FF4D88] focus:ring-1 focus:ring-[#FF4D88] transition-all duration-300 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500";

  return (
    <>
      <section className="relative w-full py-24 bg-white overflow-hidden">
        
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#FF4D88] rounded-full blur-[120px] opacity-[0.05] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500 rounded-full blur-[100px] opacity-[0.05] pointer-events-none"></div>

        <div className="max-w-[1200px] mx-auto px-6 relative z-10">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
            {/* --- COLUMNA IZQUIERDA --- */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="mb-4 flex items-center gap-3">
                 <span className="w-8 h-[3px] bg-[#FF4D88]"></span>
                 <span className="text-[#FF4D88] text-xs font-[1000] uppercase tracking-[0.2em]">Contacto</span>
              </div>
              
              <h2 className="text-5xl md:text-7xl font-[1000] uppercase italic tracking-tighter text-black leading-[0.9] mb-8">
                HABLEMOS <br />
                <span className="text-zinc-300">DE FUTURO</span>
              </h2>

              <p className="text-zinc-500 text-lg font-medium leading-relaxed max-w-md mb-10">
                ¿Tienes alguna sugerencia, encontraste un bug o simplemente quieres colaborar? Estamos escuchando.
              </p>

              <div className="flex flex-col gap-6 mb-12">
                <div className="flex items-center gap-4 group cursor-pointer">
                  <div className="w-12 h-12 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center group-hover:bg-[#FF4D88] transition-colors duration-300">
                    <Mail size={20} className="text-black group-hover:text-white transition-colors" />
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-400 uppercase font-black tracking-wider">Escríbenos</p>
                    <a href="mailto:contacto@mangamukai.com" className="text-lg font-bold text-black group-hover:text-[#FF4D88] transition-colors">contacto@mangamukai.com</a>
                  </div>
                </div>

                <div className="flex items-center gap-4 group cursor-pointer">
                  <div className="w-12 h-12 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center group-hover:bg-[#FF4D88] transition-colors duration-300">
                    <MapPin size={20} className="text-black group-hover:text-white transition-colors" />
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-400 uppercase font-black tracking-wider">Ubicación</p>
                    <span className="text-lg font-bold text-black">Perú, Lima (Manga-Digital)</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                 <a href="https://www.facebook.com/MangaAyanokouji/" target="_blank" rel="noreferrer" className={socialLinkClass}>
                   <Facebook size={20} />
                 </a>
                 <a href="https://wa.me/51926615198" target="_blank" rel="noreferrer" className={socialLinkClass}>
                   <WhatsAppIcon size={20} />
                 </a>
                 <a href="https://www.youtube.com/@MangaMukai-b3g" target="_blank" rel="noreferrer" className={socialLinkClass}>
                   <Youtube size={20} />
                 </a>
                 <a href="https://www.instagram.com/mangamukai/" target="_blank" rel="noreferrer" className={socialLinkClass}>
                   <Instagram size={20} />
                 </a>
                 <a href="https://t.me/+J6TE0l401vRhZTYx/" target="_blank" rel="noreferrer" className={socialLinkClass}>
                   <TelegramIcon size={20} />
                 </a>
                 <a href="https://discord.gg/ZXt4SUxH" target="_blank" rel="noreferrer" className={socialLinkClass}>
                   <DiscordIcon size={20} />
                 </a>
                 <a href="https://github.com/MangaMukai" target="_blank" rel="noreferrer" className={socialLinkClass}>
                   <Github size={20} />
                 </a>
              </div>
            </motion.div>

            {/* --- COLUMNA DERECHA --- */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="bg-[#F4F4F5] p-8 md:p-10 rounded-[2.5rem] shadow-xl border border-zinc-200 relative overflow-hidden"
            >
               <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-[#FF4D88] to-transparent opacity-80"></div>

               <h3 className="text-2xl font-[1000] uppercase italic tracking-tighter text-black mb-6">
                 Envíanos un mensaje
               </h3>

               <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                     <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Usuario</label>
                        <input 
                          type="text" 
                          placeholder="Tu nombre"
                          value={formState.name}
                          onChange={(e) => setFormState({...formState, name: e.target.value})}
                          className={inputClass}
                          disabled={loading}
                        />
                     </div>
                     <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Email</label>
                        <input 
                          type="email" 
                          placeholder="tu@correo.com"
                          value={formState.email}
                          onChange={(e) => setFormState({...formState, email: e.target.value})}
                          className={inputClass}
                          disabled={loading}
                        />
                     </div>
                  </div>

                  <div className="flex flex-col gap-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Asunto</label>
                     <select 
                       value={formState.subject}
                       onChange={(e) => setFormState({...formState, subject: e.target.value})}
                       className={`${inputClass} appearance-none cursor-pointer`}
                       disabled={loading}
                     >
                       <option value="" disabled className="text-zinc-400">Selecciona un tema</option>
                       <option value="soporte">Soporte Técnico</option>
                       <option value="colaboracion">Colaboración / Partners</option>
                       <option value="feedback">Feedback General</option>
                       <option value="otro">Otro</option>
                     </select>
                  </div>

                  <div className="flex flex-col gap-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Mensaje</label>
                     <textarea 
                       rows={4}
                       placeholder="¿En qué podemos ayudarte hoy?"
                       value={formState.message}
                       onChange={(e) => setFormState({...formState, message: e.target.value})}
                       className={`${inputClass} resize-none`}
                       disabled={loading}
                     ></textarea>
                  </div>

                  <AnimatePresence mode="wait">
                    {feedback && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={`p-3 rounded-lg text-xs font-bold flex items-center gap-2 ${feedback.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}
                      >
                        {feedback.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                        {feedback.msg}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button 
                    type="submit"
                    disabled={loading}
                    className="mt-2 w-full py-4 bg-[#FF4D88] text-white text-[11px] font-[1000] uppercase tracking-[0.25em] rounded-xl hover:bg-black transition-all flex justify-center items-center gap-3 shadow-lg shadow-[#FF4D88]/20 group disabled:opacity-70 disabled:pointer-events-none"
                  >
                    {loading ? (
                      <>
                        Enviando...
                        <Loader2 size={16} className="animate-spin" />
                      </>
                    ) : (
                      <>
                        Enviar Mensaje
                        <Send size={16} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
               </form>
            </motion.div>

          </div>
        </div>
      </section>
      
      {/* Sección del Footer integrada al final */}
      <Footer />
    </>
  );
};