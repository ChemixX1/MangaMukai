// 1. Agregamos 'useNavigate' a los imports
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Lock, FileText, ArrowLeft, Scale, Copyright, Mail } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

// Definición de las secciones
const SECTIONS = [
  { id: "terms", label: "Términos de Uso", icon: Scale },
  { id: "privacy", label: "Política de Privacidad", icon: Lock },
  { id: "dmca", label: "DMCA / Copyright", icon: Copyright },
];

export const TermsAndPrivacy = () => {
  const location = useLocation();
  const navigate = useNavigate(); // Hook para cambiar la URL sin recargar

  // 2. LÓGICA CORREGIDA (Sin useState ni useEffect conflictivos)
  
  // A. Leemos directamente qué tab está activo desde la URL
  const params = new URLSearchParams(location.search);
  const currentTab = params.get("tab");
  
  // B. Si el tab de la URL es válido lo usamos, si no, usamos 'terms' por defecto
  const activeTab = (currentTab && SECTIONS.some(s => s.id === currentTab)) 
    ? currentTab 
    : "terms";

  // C. Creamos la función setActiveTab para que el JSX de abajo funcione igual.
  // En lugar de cambiar un estado local, actualizamos la URL.
  const setActiveTab = (id: string) => {
    navigate(`?tab=${id}`, { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#02040a] text-zinc-300 font-sans selection:bg-[#FF4D88] selection:text-white pt-24 pb-12">
      
      {/* Fondo Decorativo */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-[500px] bg-[#FF4D88]/5 blur-[100px] rounded-full -translate-y-1/2"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div>
            <Link to="/" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-colors mb-4 group">
              <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Volver al Inicio
            </Link>
            <h1 className="text-4xl md:text-5xl font-[1000] text-white uppercase italic tracking-tighter">
              Centro <span className="text-[#FF4D88]">Legal</span>
            </h1>
            <p className="text-zinc-400 mt-2 max-w-lg text-sm">
              Transparencia y claridad. Aquí encontrarás toda la información sobre cómo operamos y protegemos tus datos.
            </p>
          </div>
          <div className="p-4 bg-zinc-900/50 border border-white/5 rounded-2xl backdrop-blur-sm">
             <Shield size={32} className="text-[#FF4D88]" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Sidebar de Navegación (Izquierda) */}
          <div className="lg:col-span-3">
            <div className="sticky top-24 space-y-2 bg-zinc-900/30 border border-white/5 p-2 rounded-xl backdrop-blur-md">
              {SECTIONS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all duration-300 relative overflow-hidden group ${
                    activeTab === item.id 
                      ? "bg-[#FF4D88] text-white shadow-[0_0_20px_rgba(255,77,136,0.3)]" 
                      : "text-zinc-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <item.icon size={18} className={`relative z-10 ${activeTab === item.id ? "text-white" : "text-zinc-500 group-hover:text-white"}`} />
                  <span className="relative z-10">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Contenido (Derecha) */}
          <div className="lg:col-span-9">
            <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-8 md:p-12 min-h-[600px] relative overflow-hidden">
                
                {/* Decoración interna */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#FF4D88]/5 to-transparent rounded-bl-full pointer-events-none"></div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    {activeTab === "terms" && <TermsContent />}
                    {activeTab === "privacy" && <PrivacyContent />}
                    {activeTab === "dmca" && <DMCAContent />}
                  </motion.div>
                </AnimatePresence>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

// --- CONTENIDO DE LOS DOCUMENTOS ---

const TermsContent = () => (
  <div className="prose prose-invert prose-headings:font-[900] prose-headings:uppercase prose-headings:italic prose-headings:tracking-tighter prose-p:text-zinc-400 prose-p:text-sm prose-li:text-zinc-400 max-w-none">
    <h2 className="flex items-center gap-3 text-2xl text-white mb-6 border-b border-white/10 pb-4">
      <Scale className="text-[#FF4D88]" /> Términos de Servicio
    </h2>
    <p>Bienvenido a MangaMukai. Al acceder a nuestro sitio web, aceptas cumplir con los siguientes términos y condiciones.</p>
    
    <h3>1. Uso de la Plataforma</h3>
    <p>MangaMukai proporciona una plataforma para la lectura de contenido digital. El usuario se compromete a utilizar el servicio únicamente para fines personales y no comerciales.</p>
    
    <h3>2. Cuentas de Usuario</h3>
    <p>Eres responsable de mantener la confidencialidad de tu cuenta y contraseña. MangaMukai no se hace responsable por pérdidas derivadas del uso no autorizado de tu cuenta.</p>
    
    <h3>3. Monedas y Pagos</h3>
    <p>Las "Mukai Coins" son bienes virtuales sin valor monetario real fuera de la plataforma. No son reembolsables ni transferibles entre cuentas.</p>
    
    <h3>4. Conducta Prohibida</h3>
    <ul className="list-disc pl-5 space-y-2">
        <li>Extraer contenido (scraping) de manera automatizada.</li>
        <li>Compartir cuentas premium con terceros.</li>
        <li>Publicar comentarios ofensivos o spam en la sección de comunidad.</li>
    </ul>
  </div>
);

const PrivacyContent = () => (
  <div className="prose prose-invert prose-headings:font-[900] prose-headings:uppercase prose-headings:italic prose-headings:tracking-tighter prose-p:text-zinc-400 prose-p:text-sm prose-li:text-zinc-400 max-w-none">
    <h2 className="flex items-center gap-3 text-2xl text-white mb-6 border-b border-white/10 pb-4">
      <Lock className="text-[#FF4D88]" /> Política de Privacidad
    </h2>
    <p>En MangaMukai, nos tomamos tu privacidad muy en serio. Esta política describe cómo recopilamos y usamos tus datos.</p>
    
    <h3>1. Datos que Recopilamos</h3>
    <p>Recopilamos información básica como tu correo electrónico y nombre de usuario para gestionar tu cuenta y progreso de lectura.</p>
    
    <h3>2. Uso de Cookies</h3>
    <p>Utilizamos cookies para recordar tu sesión, preferencias de lectura (zoom, modo cascada) y para análisis anónimo de tráfico.</p>
    
    <h3>3. Seguridad</h3>
    <p>Tus datos de pago son procesados íntegramente por PayPal; MangaMukai nunca almacena información completa de tarjetas de crédito.</p>
  </div>
);

const DMCAContent = () => (
  <div className="prose prose-invert prose-headings:font-[900] prose-headings:uppercase prose-headings:italic prose-headings:tracking-tighter prose-p:text-zinc-400 prose-p:text-sm prose-li:text-zinc-400 max-w-none">
    <h2 className="flex items-center gap-3 text-2xl text-white mb-6 border-b border-white/10 pb-4">
      <Copyright className="text-[#FF4D88]" /> Propiedad Intelectual (DMCA)
    </h2>
    
    <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl mb-6">
        <p className="text-red-200 text-xs font-bold m-0 flex items-center gap-2">
            <FileText size={16} /> AVISO IMPORTANTE SOBRE DERECHOS DE AUTOR
        </p>
    </div>

    <p>MangaMukai respeta la propiedad intelectual de terceros. Si crees que tu trabajo ha sido copiado de una manera que constituye una infracción de derechos de autor, por favor notifícanos.</p>
    
    <h3>Procedimiento de Notificación</h3>
    <p>Para presentar una queja DMCA, por favor envía un correo a nuestro agente designado con la siguiente información:</p>
    <ul className="list-disc pl-5 space-y-2">
        <li>Firma física o electrónica del propietario de los derechos.</li>
        <li>Identificación del trabajo protegido por derechos de autor.</li>
        <li>Identificación del material que se reclama como infractor (URL específica).</li>
        <li>Información de contacto (Dirección, teléfono, email).</li>
    </ul>

    <div className="mt-8 pt-6 border-t border-white/10">
        <p className="text-white font-bold mb-2">Contacto para DMCA:</p>
        <a href="mailto:legal@mangamukai.com" className="inline-flex items-center gap-2 text-[#FF4D88] hover:text-white transition-colors font-mono">
            <Mail size={16} /> legal@mangamukai.com
        </a>
    </div>
  </div>
);