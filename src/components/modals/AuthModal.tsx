import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Mail, Lock, User, Loader2, AlertCircle, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { saveAuth } from "../../services/authService";
import loginBg from "../../assets/modals/auth-login.webp";
import registerBg from "../../assets/modals/auth-register.webp";
import { MANGAMUKAI_API, wordpressUrl } from "../../config/api";
import { useTheme } from "../../hooks/useTheme";
import { lockPageScroll } from "../../utils/scrollLock";

const AUTH_ASSETS = {
  inicio: loginBg,
  registro: registerBg
};

let authAssetsPreloaded = false;

const preloadAuthAssets = () => {
  if (authAssetsPreloaded || typeof Image === 'undefined') return;
  authAssetsPreloaded = true;

  Object.values(AUTH_ASSETS).forEach((source, index) => {
    const image = new Image();
    image.decoding = 'async';
    image.fetchPriority = index === 0 ? 'high' : 'low';
    image.src = source;
    void image.decode().catch(() => undefined);
  });
};

const WP_AUTH_BASE = MANGAMUKAI_API;

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialView: 'login' | 'register';
}

export const AuthModal = ({ isOpen, onClose, initialView }: AuthModalProps) => {
  const { theme } = useTheme();
  const isLightMode = theme === 'light';
  const [isLoginView, setIsLoginView] = useState(initialView === 'login');
  const [internalOpen, setInternalOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isModalOpen = isOpen || internalOpen;

  const handleCloseModal = () => {
    setInternalOpen(false);
    onClose();
  };

  useEffect(() => {
    if (!isModalOpen) return;
    return lockPageScroll();
  }, [isModalOpen]);

  useEffect(() => {
    if (isOpen) setIsLoginView(initialView === 'login');
    if (isModalOpen) {
      setEmail(""); setPassword(""); setUsername("");
      setError(null); setSuccess(null);
    }
  }, [isOpen, initialView, isModalOpen]);

  useEffect(() => {
    preloadAuthAssets();
  }, []);

  // ─── Interceptar URL y Clics del Menú ──────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get('auth_modal');

    if (action === 'login' || action === 'register') {
      setIsLoginView(action === 'login');
      setInternalOpen(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const handleMenuClicks = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');

      if (link) {
        const href = (link.getAttribute('href') || '').toLowerCase();

        const isLoginMenu = !href.includes('action=lostpassword') && (target.closest('.menu-item-46452') || href.includes('/login') || href.includes('wp-login.php'));
        const isRegisterMenu = target.closest('.menu-item-46453') || href.includes('/register') || href.includes('/registro') || href.includes('action=register');

        if (isLoginMenu) {
          e.preventDefault();
          setIsLoginView(true);
          setInternalOpen(true);
        } else if (isRegisterMenu) {
          e.preventDefault();
          setIsLoginView(false);
          setInternalOpen(true);
        }
      }
    };

    document.addEventListener('click', handleMenuClicks);
    return () => document.removeEventListener('click', handleMenuClicks);
  }, []);

  // ─── Login / Registro con email ───────────────────────────────────────────
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const endpoint = isLoginView ? `${WP_AUTH_BASE}/login` : `${WP_AUTH_BASE}/register`;

      const params = new URLSearchParams();
      params.append('email', email);
      params.append('password', password);
      if (!isLoginView && username) params.append('username', username);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
        credentials: 'include', // NUEVO: ¡Crucial! Permite que el navegador guarde la cookie de sesión que manda WordPress.
      });

      const data = await res.json();

      if (data.success) {
        saveAuth(data.token, data.user);
        setSuccess(isLoginView ? '¡Bienvenido de vuelta!' : '¡Cuenta creada! Bienvenido.');
        // Recargar forzosamente para que WP muestre la interfaz de usuario logueado
        setTimeout(() => {
          window.location.reload();
        }, 800);
      } else {
        setError(data.message || 'Error al autenticar.');
      }
    } catch {
      setError('No se pudo conectar con el servidor. Intenta más tarde.');
    } finally {
      setLoading(false);
    }
  };

  if (!isModalOpen) return null;

  const inputContainerClass = "relative group transition-all duration-300";
  const iconClass = "absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-[#FF4D88] transition-colors duration-300 pointer-events-none";
  const inputClass = `
    w-full pl-12 pr-4 py-4 border rounded-xl outline-none
    text-[13px] font-semibold tracking-wide placeholder:font-medium
    focus:border-[#FF4D88] focus:shadow-[0_0_0_4px_rgba(255,77,136,0.1)]
    transition-all duration-300
    ${isLightMode
      ? 'bg-white/90 border-zinc-200 text-zinc-800 placeholder:text-zinc-400 focus:bg-white'
      : 'bg-black/65 border-white/15 text-white placeholder:text-zinc-500 focus:bg-black/85'}
  `;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#02040a]/80 backdrop-blur-md"
      onClick={handleCloseModal}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        layout
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className={`relative flex w-full max-w-[900px] flex-col overflow-hidden rounded-[2rem] shadow-2xl md:flex-row ${isLightMode ? 'bg-white' : 'bg-[#08080b]'}`}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden md:hidden" aria-hidden="true">
          <AnimatePresence mode="wait">
            <motion.img
              key={isLoginView ? 'mobile-login-art' : 'mobile-register-art'}
              src={isLoginView ? AUTH_ASSETS.inicio : AUTH_ASSETS.registro}
              alt=""
              loading="eager"
              decoding="async"
              fetchPriority="high"
              draggable={false}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
          </AnimatePresence>
          <div className={`absolute inset-0 ${isLightMode ? 'bg-white/80' : 'bg-[#08080b]/75'}`} />
        </div>

        {/* --- PANEL IZQUIERDO --- */}
        <div className="relative hidden min-h-[600px] flex-col justify-end overflow-hidden bg-black p-10 md:flex md:w-5/12">
          <AnimatePresence mode="wait">
            <motion.img
              key={isLoginView ? 'img-login' : 'img-reg'}
              src={isLoginView ? AUTH_ASSETS.inicio : AUTH_ASSETS.registro}
              alt=""
              loading="eager"
              decoding="async"
              fetchPriority="high"
              draggable={false}
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 0.46, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
          </AnimatePresence>
          <div className="relative z-10">
            <motion.div
              key={isLoginView ? 'title-login' : 'title-reg'}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h3 className="text-4xl font-[1000] text-white uppercase leading-[0.9] tracking-tighter italic">
                {isLoginView ? "BIENVENIDO" : "ÚNETE A LA"} <br />
                <span className="text-[#FF4D88]">{isLoginView ? "DE VUELTA" : "COMUNIDAD"}</span>
              </h3>
              <div className="w-12 h-1.5 bg-white mt-6"></div>
            </motion.div>
          </div>
        </div>

        {/* --- PANEL DERECHO --- */}
        <div className="relative z-10 flex w-full flex-col justify-center bg-transparent p-8 md:w-7/12 md:p-12">
          <button onClick={handleCloseModal} className={`absolute right-6 top-6 z-20 transition-colors ${isLightMode ? 'text-zinc-400 hover:text-black' : 'text-zinc-500 hover:text-white'}`}>
            <X size={24} strokeWidth={3} />
          </button>

          <div className="w-full max-w-[340px] mx-auto">
            <header className="mb-8 text-center">
              <motion.h1 layout className={`text-3xl font-[1000] uppercase italic tracking-tighter ${isLightMode ? 'text-black' : 'text-white'}`}>
                {isLoginView ? "Bienvenido de nuevo" : "Crear Nueva Cuenta"}
              </motion.h1>
              <div className="w-8 h-1 bg-[#FF4D88] mx-auto mt-3 rounded-full"></div>
            </header>

            {/* Aviso Google / Discord desactivado */}
            {isLoginView && (
              <div className={`mb-6 flex items-start gap-2.5 rounded-xl border p-3.5 ${isLightMode ? 'border-blue-200 bg-blue-50' : 'border-blue-400/20 bg-blue-500/10'}`}>
                <Info size={15} className="text-blue-500 mt-0.5 shrink-0" />
                <p className={`text-[12px] font-semibold leading-snug ${isLightMode ? 'text-zinc-900' : 'text-blue-200'}`}>
                  El acceso con Google y Discord fue desactivado. Tu cuenta sigue activa —{" "}
                  <a
                    href={wordpressUrl('wp-login.php?action=lostpassword')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`underline ${isLightMode ? 'hover:text-blue-900' : 'hover:text-white'}`}
                  >
                    restablece tu contraseña
                  </a>{" "}
                  para seguir accediendo con tu correo.
                </p>
              </div>
            )}

            {/* Mensaje de error / éxito */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-[12px] font-semibold"
                >
                  <AlertCircle size={14} /> {error}
                </motion.div>
              )}
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-green-600 text-[12px] font-semibold"
                >
                  <Loader2 size={14} className="animate-spin" /> {success}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleAuth} className="flex flex-col gap-4">
              <AnimatePresence mode="popLayout">
                {!isLoginView && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
                    animate={{ opacity: 1, height: 'auto', overflow: 'visible' }}
                    exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className={inputContainerClass}>
                      <User className={iconClass} size={18} strokeWidth={2.5} />
                      <input
                        type="text"
                        placeholder="Nombre de Usuario"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className={inputContainerClass}>
                <Mail className={iconClass} size={18} strokeWidth={2.5} />
                <input
                  type="email"
                  placeholder="Correo Electrónico"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <div className={inputContainerClass}>
                  <Lock className={iconClass} size={18} strokeWidth={2.5} />
                  <input
                    type="password"
                    placeholder="Contraseña"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>
                {isLoginView && (
                  <div className="mt-1.5 text-right">
                    <a
                      href={wordpressUrl('wp-login.php?action=lostpassword')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-bold text-zinc-400 hover:text-[#FF4D88] transition-colors tracking-wide"
                    >
                      ¿Olvidaste tu contraseña?
                    </a>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`Poppins mt-2 flex w-full items-center justify-center gap-3 rounded-xl bg-[#FF4D88] py-[1.05rem] text-[12px] capitalize tracking-normal text-white shadow-lg shadow-[#FF4D88]/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:text-[13px] ${isLightMode ? 'hover:bg-black' : 'hover:bg-white hover:text-black'}`}
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>{isLoginView ? "INGRESAR" : "Registro"}</>
                )}
              </button>
            </form>

            <footer className="mt-8 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsLoginView(!isLoginView);
                  setEmail(""); setPassword(""); setUsername("");
                  setError(null); setSuccess(null);
                }}
                className={`open-sans-auth-switch cursor-pointer border-b-2 border-transparent pb-1 text-xs tracking-normal transition-colors hover:border-[#FF4D88] sm:text-[13px] ${isLightMode ? 'text-zinc-700' : 'text-zinc-400'}`}
              >
                {isLoginView ? (
                  <>¿Nuevo aquí? <span className="font-bold text-[#FF4D88]">Regístrate gratis</span></>
                ) : (
                  <>¿Ya tienes cuenta? <span className="font-bold text-[#FF4D88]">Inicia sesión</span></>
                )}
              </button>
            </footer>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
};
