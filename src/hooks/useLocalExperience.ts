import { useEffect, useState } from 'react';
import { AUTH_CHANGED_EVENT, getStoredToken, getStoredUser } from '../services/authService';
import { isPlaceholderAvatar, PROFILE_UPDATED_EVENT } from '../services/wordpressService';

export function useExperienceUser() {
  const read = () => getStoredToken() ? getStoredUser() : null;
  const [user, setUser] = useState(read);
  useEffect(() => {
    const sync = () => setUser(read());
    window.addEventListener(AUTH_CHANGED_EVENT, sync);
    window.addEventListener(PROFILE_UPDATED_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener(AUTH_CHANGED_EVENT, sync); window.removeEventListener(PROFILE_UPDATED_EVENT, sync); window.removeEventListener('storage', sync); };
  }, []);
  // El Gravatar genérico cuenta como "sin foto": así las páginas pintan su avatar por defecto, igual que "Más".
  const avatar = user?.avatar && !isPlaceholderAvatar(user.avatar) ? user.avatar : '';
  return { id: String(user?.id || 'guest'), name: user?.display_name || user?.username || 'Lector invitado', avatar, signedIn: !!user };
}

const LOCAL_EVENT = 'mm-local-experience';
export function useLocalExperience<T>(key: string, initial: T) {
  const read = (): T => {
    try {
      const value = JSON.parse(localStorage.getItem(key) || 'null');
      return value !== null && typeof value === typeof initial && Array.isArray(value) === Array.isArray(initial) ? value as T : initial;
    } catch { return initial; }
  };
  const [value, setValue] = useState<T>(read);
  useEffect(() => {
    const sync = () => setValue(read());
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener(LOCAL_EVENT, sync);
    return () => { window.removeEventListener('storage', sync); window.removeEventListener(LOCAL_EVENT, sync); };
    // The initial seed is intentionally fixed for each storage key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const save = (next: T) => {
    try { localStorage.setItem(key, JSON.stringify(next)); }
    catch { throw new Error('No hay espacio para guardar. Prueba con una imagen más pequeña o libera espacio del navegador.'); }
    setValue(next);
    window.dispatchEvent(new Event(LOCAL_EVENT));
  };
  return [value, save] as const;
}

export function readLocalImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return reject(new Error('Elige una imagen JPG, PNG o WebP.'));
    if (file.size > 1_200_000) return reject(new Error('La imagen debe pesar menos de 1,2 MB para guardarla localmente.'));
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    reader.readAsDataURL(file);
  });
}
