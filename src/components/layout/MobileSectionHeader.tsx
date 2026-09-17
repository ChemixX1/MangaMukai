import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { MOBILE_SECTIONS } from '../../utils/mobileSections';

/**
 * Cabecera compacta (solo móvil) de las páginas de Recursos: flecha de volver
 * y título de la sección. Sustituye al navbar en esas rutas.
 */
export const MobileSectionHeader = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const section = MOBILE_SECTIONS[pathname];
  if (!section) return null;

  const goBack = () => {
    if (((window.history.state as { idx?: number } | null)?.idx ?? 0) > 0) navigate(-1);
    else navigate('/mas');
  };

  return (
    <div className={`sticky top-0 z-[90] flex h-14 items-center gap-2 px-4 pt-[env(safe-area-inset-top)] lg:hidden ${section.dark ? 'bg-[#02040a] text-white' : 'bg-white text-black'}`}>
      <button
        type="button"
        onClick={goBack}
        aria-label="Volver"
        className={`-ml-2 flex h-10 w-10 items-center justify-center rounded-full transition-colors ${section.dark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
      >
        <ChevronLeft size={24} strokeWidth={2.4} />
      </button>
      <h2 className="font-[Montserrat] text-[17px] font-semibold">{section.title}</h2>
    </div>
  );
};
