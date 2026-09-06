import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { toggleSavedManga, useSavedMangasState, type ToggleSavedOutcome } from '../services/savedMangas';

/**
 * Botón "Guardar" de cualquier listado: estado compartido con el resto de la
 * web y con la página de guardados. Sin sesión, lleva al login y vuelve aquí.
 */
export const useSavedMangas = () => {
  const navigate = useNavigate();
  const { ids, loaded, busyIds } = useSavedMangasState();

  const isSaved = useCallback((mangaId: string | number) => ids.includes(String(mangaId)), [ids]);
  const isBusy = useCallback((mangaId: string | number) => busyIds.includes(String(mangaId)), [busyIds]);

  const toggle = useCallback(async (mangaId: string | number): Promise<ToggleSavedOutcome> => {
    const outcome = await toggleSavedManga(mangaId);
    if (outcome.status === 'login') {
      navigate('/auth/login', {
        state: { returnTo: `${window.location.pathname}${window.location.search}` },
      });
    }
    return outcome;
  }, [navigate]);

  return { ids, loaded, isSaved, isBusy, toggle };
};
