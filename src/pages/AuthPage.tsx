import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertCircle,
  Globe2,
  Loader2,

} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { MANGAMUKAI_API, SOCIAL_LOGIN_SESSION_URL, socialLoginUrl, wordpressUrl } from "../config/api";
import { useTheme } from "../hooks/useTheme";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { saveAuth } from "../services/authService";
import { getAuthPhoneCountry } from '../utils/authPhone';
import { clearSocialReturn, readSocialReturn, rememberSocialReturn, safeAuthReturn } from "../utils/socialLoginReturn";
import { getUltimosCapitulos } from "../services/mangaService";
import {
  getSharedAuthCovers,
  setSharedAuthCovers,
  type SharedAuthCover,
} from "../utils/authCoverCache";

import discordIcon from '../assets/auth/discord.svg';
import registerDiscordIcon from '../assets/auth/register-discord.svg';
import registerGoogleIcon from '../assets/auth/register-google.svg';
import { AuthUserIcon, AuthMailIcon, AuthBirthdayIcon, AuthCalendarIcon, AuthPeruIcon, AuthPhoneIcon, AuthLockIcon, AuthEyeOffIcon, AuthEyeIcon } from '../components/auth/AuthIcons';

import googleIcon from '../assets/auth/google.svg';
import { AuthPasswordIcon } from '../components/auth/AuthPasswordIcon';
import DriftWall, { type DriftWallItem } from '../components/auth/DriftWall';

type CoverItem = SharedAuthCover;

const FALLBACK_COVERS: CoverItem[] = [
  '54961', '58016', '57841', '57821', '57410', '57266', '56981', '56903',
  '55778', '55446', '55443', '55284', '55281', '55239', '55005', '54977',
].map((id) => ({ src: `/images/collection/${id}.webp`, title: 'Manga Mukai' }));

interface AuthResponse {
  success?: boolean;
  token?: string;
  user?: Parameters<typeof saveAuth>[1];
  message?: string;
}

interface SocialSessionResult {
  ok: boolean;
  data: AuthResponse;
}

const socialSessionRequests = new Map<string, Promise<SocialSessionResult>>();

const exchangeSocialSession = (code: string) => {
  const requestKey = code || 'wordpress-cookie';
  const existing = socialSessionRequests.get(requestKey);
  if (existing) return existing;

  const body = code ? new URLSearchParams({ code }) : undefined;
  const request = fetch(SOCIAL_LOGIN_SESSION_URL, {
    method: "POST",
    credentials: "include",
    body,
  }).then(async (response) => ({
    ok: response.ok,
    data: (await response.json()) as AuthResponse,
  }));

  socialSessionRequests.set(requestKey, request);
  void request.then(
    () => window.setTimeout(() => socialSessionRequests.delete(requestKey), 1500),
    () => window.setTimeout(() => socialSessionRequests.delete(requestKey), 1500),
  );
  return request;
};

const SOCIAL_AUTH = [
  {
    provider: "discord",
    label: "Continuar con Discord",
    icon: discordIcon,
    className: "border-[#6975f5] bg-[#5865F2] text-white hover:bg-[#4f5ae0]",
  },
  {
    provider: "google",
    label: "Continuar con Google",
    icon: googleIcon,
    className: "border-black/10 bg-white text-zinc-900 hover:bg-zinc-100",
  },
] as const;

const providerLabel = (provider: string | null) => (provider === "discord" ? "Discord" : "Google");

const SOCIAL_ERROR_MESSAGES: Record<string, string> = {
  user_denied: "Cancelaste el acceso con {provider}.",
  no_email: "{provider} no compartió un correo verificado. Prueba con otra cuenta o crea tu cuenta con tu correo.",
  register_failed: "No se pudo crear tu cuenta con {provider}. Inténtalo nuevamente.",
  awaiting_email_confirmation: "Tu cuenta todavía no está activada. Revisa tu correo para confirmarla.",
  awaiting_admin_review: "Tu cuenta está pendiente de aprobación.",
  inactive: "Tu cuenta está desactivada. Escríbenos si crees que es un error.",
  rejected: "Tu cuenta está desactivada. Escríbenos si crees que es un error.",
};

const socialErrorMessage = (code: string, provider: string | null) =>
  (SOCIAL_ERROR_MESSAGES[code] ?? "No se pudo completar el acceso con {provider}. Inténtalo nuevamente.").replace(
    "{provider}",
    providerLabel(provider),
  );

const selectCatalogCovers = (mangas: Awaited<ReturnType<typeof getUltimosCapitulos>>) => {
  const seen = new Set<string>();
  const available = mangas.reduce<CoverItem[]>((items, manga) => {
    const src = manga.portada?.trim();
    if (!src || seen.has(src)) return items;
    seen.add(src);
    items.push({ src, title: manga.titulo || "Manga Mukai" });
    return items;
  }, []);

  for (let index = available.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [available[index], available[randomIndex]] = [available[randomIndex], available[index]];
  }

  return available.slice(0, 24);
};

const formatBirthDate = (value: string) => {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return day && month && year ? `${day}/${month}/${year}` : value;
};

const parseBirthDate = (value: string) => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return "";
  const [, day, month, year] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  const iso = `${year}-${month}-${day}`;
  return date.getUTCFullYear() === Number(year)
    && date.getUTCMonth() + 1 === Number(month)
    && date.getUTCDate() === Number(day)
    && iso >= "1900-01-01"
    && iso <= new Date().toISOString().slice(0, 10)
    ? iso : "";
};

const formatTypedBirthDate = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length > 4) return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
};

const AuthField = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="block text-left">
    <span className="auth-field-label mb-2.5 block px-1 text-[13px] font-normal tracking-normal sm:text-[14px]">
      {label}
    </span>
    {children}
  </div>
);

export const AuthPage = ({ mode }: { mode?: "login" | "register" } = {}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isLight = theme === "light";
  const isLogin = mode ? mode === "login" : location.pathname.endsWith("/login");
  const [socialReturnTo] = useState(() => {
    const query = new URLSearchParams(location.search);
    return readSocialReturn(query.get("social") || query.get("return_provider"));
  });
  const returnTo = safeAuthReturn(location.state?.returnTo || new URLSearchParams(location.search).get("returnTo") || socialReturnTo || "/");
  const reducedMotion = useReducedMotion();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthDateInput, setBirthDateInput] = useState("");
  const [countryCode, setCountryCode] = useState("+51");
  const [phone, setPhone] = useState("");
  const phoneCountry = useMemo(() => getAuthPhoneCountry(countryCode), [countryCode]);
  const [rememberSession, setRememberSession] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [remoteCovers, setRemoteCovers] = useState<CoverItem[]>(() => getSharedAuthCovers() ?? []);
  const wallItems = useMemo<DriftWallItem[]>(
    () => (remoteCovers.length ? remoteCovers : FALLBACK_COVERS)
      .map((cover) => ({ image: cover.src, title: cover.title })),
    [remoteCovers],
  );
  const birthDatePickerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!success) return;
    // Navegación interna: saveAuth ya avisó a la barra y a los servicios con
    // AUTH_CHANGED_EVENT, así que no hace falta recargar toda la app (con
    // Google/Discord eso sumaba una segunda carga completa tras los saltos por WordPress).
    const timer = window.setTimeout(() => navigate(returnTo, { replace: true }), reducedMotion ? 350 : 850);
    return () => window.clearTimeout(timer);
  }, [success, returnTo, reducedMotion, navigate]);

  useEffect(() => {
    const cachedCovers = getSharedAuthCovers();
    if (cachedCovers?.length) {
      setRemoteCovers(cachedCovers);
      return;
    }

    let active = true;

    void getUltimosCapitulos().then((mangas) => {
      if (!active) return;

      const selectedCovers = selectCatalogCovers(mangas);
      if (selectedCovers.length) {
        setSharedAuthCovers(selectedCovers);
        setRemoteCovers(selectedCovers);
      }
    }).catch(() => {
      // Las portadas locales mantienen el fondo si el catálogo no responde.
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setEmail("");
    setPassword("");
    setUsername("");
    setBirthDate("");
    setBirthDateInput("");
    setCountryCode("+51");
    setPhone("");
    setRememberSession(false);
    setShowPassword(false);
    setError(null);
    setSuccess(null);
  }, [isLogin]);

  useDocumentTitle(isLogin ? "Iniciar sesión" : "Crear cuenta");

  useEffect(() => {
    // WordPress devuelve aquí los fallos del proveedor (acceso cancelado, correo sin
    // verificar, cuenta pendiente) en vez de mostrar su propia página de error.
    const query = new URLSearchParams(location.search);
    const code = query.get("social_error");
    if (!code) return;
    setError(socialErrorMessage(code, query.get("social_provider")));
    const cleanUrl = new URL(window.location.href);
    ["social_error", "social_provider"].forEach((key) => cleanUrl.searchParams.delete(key));
    window.history.replaceState(window.history.state, "", cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
  }, [location.search]);

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const provider = query.get("social") || query.get("return_provider");
    const socialCode = query.get("social_code") || "";
    if (provider !== "google" && provider !== "discord") return;

    let active = true;
    setLoading(true);
    setError(null);
    void exchangeSocialSession(socialCode).then(({ ok, data }) => {
      if (!ok || !data.success || !data.token || !data.user) {
        throw new Error(data.message || `No se pudo completar el acceso con ${provider === "google" ? "Google" : "Discord"}.`);
      }
      if (!active) return;
      saveAuth(data.token, data.user, true);
      clearSocialReturn();
      // Discard the temporary OAuth code before loading the next page.
      const cleanUrl = new URL(window.location.href);
      ['social', 'return_provider', 'social_code'].forEach((key) => cleanUrl.searchParams.delete(key));
      window.history.replaceState(window.history.state, '', cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
      setSuccess(`Acceso con ${provider === "google" ? "Google" : "Discord"} completado.`);
    }).catch((caught) => {
      if (!active) return;
      setError(caught instanceof Error ? caught.message : "No se pudo completar el inicio de sesión social.");
      clearSocialReturn();
      navigate("/auth/login", { replace: true, state: { returnTo } });
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [location.search, navigate, returnTo]);

  const openBirthDatePicker = () => {
    const picker = birthDatePickerRef.current;
    if (!picker) return;

    try {
      picker.showPicker();
    } catch {
      picker.click();
    }
  };

  const handleAuth = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isLogin && !birthDate) {
      setError("Escribe una fecha de nacimiento válida en formato dd/mm/aaaa.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const params = new URLSearchParams({ email, password });
      if (!isLogin) {
        const normalizedPhone = phone.replace(/\D/g, "");
        params.set("username", username);
        params.set("birth_date", birthDate);
        params.set("birth_year", birthDate.slice(0, 4));
        params.set("country_code", countryCode);
        params.set("phone", normalizedPhone);
        params.set("phone_e164", `${countryCode}${normalizedPhone}`);
      }

      const response = await fetch(`${MANGAMUKAI_API}/${isLogin ? "login" : "register"}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
        credentials: "include",
      });

      const data = (await response.json()) as AuthResponse;
      if (!response.ok || !data.success || !data.token || !data.user) {
        setError(data.message || "No se pudo completar la autenticación");
        return;
      }

      saveAuth(data.token, data.user, isLogin ? rememberSession : true);
      setSuccess(isLogin ? "¡Bienvenido de vuelta!" : "¡Tu cuenta ya está lista!");
    } catch {
      setError("No se pudo conectar con el servidor. Inténtalo nuevamente");
    } finally {
      setLoading(false);
    }
  };

  const surfaceClass = isLight
    ? "auth-form-card-light border-black/10 bg-white text-zinc-950"
    : "auth-form-card-dark border-white/10 bg-[#09090c] text-white";
  const inputClass = isLight
    ? "border-black/15 bg-white text-black placeholder:text-black/40"
    : "border-white/10 bg-[#111111] text-white placeholder:text-white/40";
  const PasswordIcon = isLogin ? AuthPasswordIcon : AuthLockIcon;
  const fieldIconClass = isLight ? "text-black" : "text-white";

  return (
    <div className={`auth-page auth-reference min-h-screen ${isLight ? "auth-page-light" : "auth-page-dark"}`}>
      <main className="auth-visual-stage relative min-h-screen overflow-hidden">
        <div className="auth-drift-wall" aria-hidden="true">
            <DriftWall
              items={wallItems}
              columns={5}
              tileWidth={200}
              tileHeight={132}
              gap={18}
              tilt={16}
              turn={-14}
              perspective={1200}
              depth={120}
              speed={42}
              direction="up"
              variance={0.45}
              parallax={0.6}
              lift={64}
              fade={0.6}
              dim={0.55}
              overlayColor={isLight ? '#ffffff' : '#000000'}
              radius={14}
              roll={0}
              pauseOnHover={false}
              grayscale={false}
              fillWidth
            />
        </div>

        <section className="auth-form-shell relative z-20 flex min-h-[100svh] items-center justify-center px-5 pb-10 pt-24 sm:px-8 sm:pb-16 sm:pt-28">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            className={`auth-form-card ${isLogin ? "auth-form-card-login" : "auth-form-card-register"} w-full max-w-[390px] rounded-[22px] border p-5 sm:max-w-[430px] sm:rounded-[26px] sm:p-7 ${surfaceClass}`}
          >
            {success ? (
              <div role="status" aria-label="Sesión iniciada correctamente" className="flex min-h-[400px] items-center justify-center">
                <svg aria-hidden="true" viewBox="0 0 100 100" className="h-28 w-28 text-[#FF4D88]" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                  <motion.circle cx="50" cy="50" r="43" initial={{ pathLength: reducedMotion ? 1 : 0, rotate: -90 }} animate={{ pathLength: 1 }} transition={{ duration: reducedMotion ? 0 : 0.4, ease: "easeOut" }} style={{ transformOrigin: '50% 50%' }} />
                  <motion.path d="M29 51 44 65 72 36" initial={{ pathLength: reducedMotion ? 1 : 0, opacity: reducedMotion ? 1 : 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ delay: reducedMotion ? 0 : 0.3, duration: reducedMotion ? 0 : 0.3, ease: "easeOut" }} />
                </svg>
              </div>
            ) : <>
            <div className="auth-heading mb-7 text-center sm:mb-8">
              <h1 className="auth-title-audiowide whitespace-nowrap text-[clamp(1.25rem,4.7vw,1.65rem)] leading-none tracking-normal">
                {isLogin ? "Bienvenido de nuevo" : "Crea tu cuenta"}
              </h1>
            </div>

            <div className="auth-social grid grid-cols-1 gap-2.5">
              {SOCIAL_AUTH.map((social) => (
                <a
                  key={social.provider}
                  href={socialLoginUrl(social.provider)}
                  onClick={(event) => {
                    if (loading || success) { event.preventDefault(); return; }
                    rememberSocialReturn(social.provider, returnTo);
                  }}
                  aria-disabled={loading || !!success}
                  className={`flex min-h-[54px] items-center justify-center gap-2 rounded-[24px] border px-3 py-3 text-center text-[13px] font-semibold tracking-normal transition-colors ${social.className}`}
                >
                  <img src={isLogin ? social.icon : social.provider === 'discord' ? registerDiscordIcon : registerGoogleIcon} alt="" className="h-[18px] w-[18px]" decoding="async" />
                  {social.label}
                </a>
              ))}
            </div>

            <div className={`auth-email-separator my-5 flex items-center gap-3 text-[10px] font-normal uppercase tracking-[0.08em] sm:my-6 ${isLight ? "text-zinc-500" : "text-zinc-400"}`}>
              <span className={`h-px flex-1 ${isLight ? "bg-black/10" : "bg-white/10"}`} />
              O CONTINÚA CON TU CORREO
              <span className={`h-px flex-1 ${isLight ? "bg-black/10" : "bg-white/10"}`} />
            </div>

            <form onSubmit={handleAuth} className="space-y-3">
              <div className={`auth-fields-panel space-y-3 rounded-[20px] border p-3.5 sm:space-y-3.5 sm:p-4 ${isLight ? "border-black/10 bg-black/[0.02]" : "border-white/10 bg-black/20"}`}>
                {!isLogin && (
                  <>
                    <AuthField label="Usuario">
                      <span className="relative block">
                        <AuthUserIcon className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 ${fieldIconClass}`} size={18} />
                        <input
                          value={username}
                          onChange={(event) => setUsername(event.target.value)}
                          type="text"
                          autoComplete="username"
                          required
                          aria-label="Nombre de usuario"
                          placeholder="Ingresa tu nombre de usuario"
                          className={`min-h-[50px] w-full rounded-xl border py-3 pl-12 pr-4 text-sm font-normal outline-none transition-all placeholder:text-[13px] ${inputClass}`}
                        />
                      </span>
                    </AuthField>

                  </>
                )}

                <AuthField label="Correo electrónico">
                  <span className="relative block">
                    <AuthMailIcon className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 ${fieldIconClass}`} size={18} />
                    <input
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      type="email"
                      autoComplete="email"
                      required
                      aria-label="Correo electrónico"
                      placeholder="username@gmail.com"
                      className={`min-h-[50px] w-full rounded-xl border py-3 pl-12 pr-4 text-sm font-normal outline-none transition-all placeholder:text-[13px] ${inputClass}`}
                    />
                  </span>
                </AuthField>

                {!isLogin && (
                  <>
                    <AuthField label="Fecha de nacimiento">
                      <span className="relative block">
                        <AuthBirthdayIcon className={`pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 ${fieldIconClass}`} size={18} />
                        <input
                          value={birthDateInput}
                          onChange={(event) => {
                            const nextValue = formatTypedBirthDate(event.target.value);
                            setBirthDateInput(nextValue);
                            setBirthDate(parseBirthDate(nextValue));
                          }}
                          type="text"
                          inputMode="numeric"
                          autoComplete="bday"
                          placeholder="dd/mm/aaaa"
                          maxLength={10}
                          required
                          aria-label="Fecha de nacimiento"
                          className={`min-h-[50px] w-full rounded-xl border py-3 pl-12 pr-12 text-sm font-normal outline-none transition-all placeholder:text-[13px] ${inputClass}`}
                        />
                        <input
                          ref={birthDatePickerRef}
                          value={birthDate}
                          onChange={(event) => {
                            setBirthDate(event.target.value);
                            setBirthDateInput(formatBirthDate(event.target.value));
                          }}
                          type="date"
                          min="1900-01-01"
                          max={new Date().toISOString().slice(0, 10)}
                          tabIndex={-1}
                          aria-hidden="true"
                          className="auth-birth-date-native pointer-events-none opacity-0"
                        />
                        <button
                          type="button"
                          onClick={openBirthDatePicker}
                          aria-label="Abrir calendario de fecha de nacimiento"
                          className={`absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg transition-colors ${isLight ? "text-black/55 hover:bg-black/5 hover:text-black" : "text-white/55 hover:bg-white/10 hover:text-white"}`}
                        >
                          <AuthCalendarIcon size={18} />
                        </button>
                      </span>
                    </AuthField>

                    <div className="auth-phone-grid grid grid-cols-[104px_minmax(0,1fr)] gap-3.5">
                      <AuthField label="País">
                        <span className="auth-country-field">
                          <span className="auth-country-flag" role="img" aria-label={phoneCountry ? `Bandera de ${phoneCountry.name}` : 'Prefijo internacional'} title={phoneCountry?.name}>
                            {phoneCountry?.iso === 'pe' ? <AuthPeruIcon /> : phoneCountry ? (
                              <img src={`https://flagcdn.com/w40/${phoneCountry.iso}.png`} alt="" width={20} height={15} />
                            ) : <Globe2 aria-hidden="true" />}
                          </span>
                          <input
                            value={countryCode}
                            onChange={(event) => {
                              const digits = event.target.value.replace(/\D/g, "").slice(0, 4);
                              setCountryCode(digits ? `+${digits}` : event.target.value.includes("+") ? "+" : "");
                            }}
                            type="tel"
                            inputMode="tel"
                            autoComplete="tel-country-code"
                            pattern="[+][0-9]{1,4}"
                            maxLength={5}
                            required
                            aria-label="Código de país"
                            placeholder="+51"
                            className={`auth-country-code min-h-[50px] w-full rounded-xl border text-sm font-normal outline-none transition-all ${inputClass}`}
                          />
                        </span>
                      </AuthField>

                      <AuthField label="Teléfono">
                        <span className="relative block">
                          <AuthPhoneIcon className={`auth-phone-icon pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 ${fieldIconClass}`} size={18} />
                          <input
                            value={phone}
                            onChange={(event) => setPhone(event.target.value)}
                            type="tel"
                            inputMode="tel"
                            autoComplete="tel-national"
                            required
                            aria-label="Teléfono"
                            placeholder={phoneCountry?.example ?? 'Tu número'}
                            className={`auth-phone-number min-h-[50px] w-full rounded-xl border py-3 pl-12 pr-4 text-sm font-normal outline-none transition-all placeholder:text-[13px] ${inputClass}`}
                          />
                        </span>
                      </AuthField>
                    </div>
                  </>
                )}

                <AuthField label="Contraseña">
                  <span className="relative block">
                    <PasswordIcon className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 ${fieldIconClass}`} />
                    <input
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      type={showPassword ? "text" : "password"}
                      autoComplete={isLogin ? "current-password" : "new-password"}
                      minLength={6}
                      required
                      aria-label="Contraseña"
                      placeholder="Ingresa tu contraseña"
                      className={`min-h-[50px] w-full rounded-xl border py-3 pl-12 pr-12 text-sm font-normal outline-none transition-all placeholder:text-[13px] ${inputClass}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((visible) => !visible)}
                      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      aria-pressed={showPassword}
                      className={`auth-password-toggle absolute right-2 top-1/2 -translate-y-1/2 transition-colors hover:text-[#FF4D88] ${fieldIconClass}`}
                    >
                      {showPassword ? <AuthEyeIcon /> : <AuthEyeOffIcon />}
                    </button>
                  </span>
                </AuthField>

                {isLogin && (
                  <div className="auth-remember flex items-center justify-between gap-3 px-1 pt-0.5 text-[10px] sm:text-[11px]">
                    <label className={`flex cursor-pointer items-center gap-2 font-normal ${isLight ? "text-black" : "text-white"}`}>
                      <input
                        type="checkbox"
                        checked={rememberSession}
                        onChange={(event) => setRememberSession(event.target.checked)}
                        className="auth-remember-checkbox h-3.5 w-3.5 shrink-0 accent-[#FF4D88]"
                      />
                      Recordar
                    </label>
                    <a
                      href={wordpressUrl("wp-login.php?action=lostpassword")}
                      className={`font-normal transition-colors hover:text-[#FF4D88] ${isLight ? "text-zinc-600" : "text-zinc-300"}`}
                    >
                      ¿Olvidaste tu contraseña?
                    </a>
                  </div>
                )}
              </div>

              {error && (
                <div className="flex gap-2 rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-xs font-semibold text-red-500">
                  <AlertCircle className="shrink-0" size={16} /> {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="auth-submit-open-sans flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FF4D88] px-5 py-3 text-sm tracking-normal text-white transition-colors hover:bg-[#ff347b] disabled:cursor-not-allowed disabled:opacity-60 sm:py-3.5"
              >
                {loading && <Loader2 size={17} className="animate-spin" />}
                {loading ? "Procesando" : isLogin ? "Iniciar sesión" : "Crear cuenta"}
              </button>
            </form>

            <div className={`auth-bottom-divider my-4 h-px ${isLight ? "bg-black/10" : "bg-white/10"}`} />

            <p className={`auth-switch text-center text-[11px] font-normal tracking-normal sm:text-xs ${isLight ? "text-zinc-600" : "text-zinc-400"}`}>
              {isLogin ? "¿Todavía no tienes cuenta?" : "¿Ya tienes una cuenta?"}{" "}
              <Link
                to={isLogin ? "/auth/register" : "/auth/login"}
                state={{ returnTo }}
                className="font-semibold text-[#FF4D88] hover:underline"
              >
                {isLogin ? "Crea tu cuenta" : "Inicia sesión"}
              </Link>
            </p>
            </>}
          </motion.div>
        </section>
      </main>
    </div>
  );
};

export default AuthPage;
