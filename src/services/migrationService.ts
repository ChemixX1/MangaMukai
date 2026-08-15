import { clearStoredAuth, getStoredToken } from './authService';
import { MANGAMUKAI_API } from '../config/api';

const stopIfUnauthorized = (res: Response): boolean => {
    if (res.status === 401 || res.status === 403) {
        clearStoredAuth('expired');
        return true;
    }
    return false;
};

/**
 * Migra los marcadores y el historial de lectura almacenados localmente 
 * por el antiguo tema WordPress ('mangareader') a la base de datos de WordPress.
 */
export const migrateOldDataToWordPress = async () => {
    // 1. Verificar si el usuario está autenticado en WP
    const token = getStoredToken();
    if (!token) return; // Si no hay sesión, no migramos nada todavía.

    // 2. Migrar Bookmarks (Favoritos)
    const oldBookmarksRaw = localStorage.getItem('bookmark');
    if (oldBookmarksRaw) {
        try {
            const oldBookmarks: string[] = JSON.parse(oldBookmarksRaw);
            if (Array.isArray(oldBookmarks) && oldBookmarks.length > 0) {
                // Hacer peticiones a WP para cada bookmark
                // Para no saturar el servidor, enviamos secuencialmente o creamos un endpoint bulk. 
                // Como suelen ser pocos, lo hacemos secuencialmente:
                for (const id of oldBookmarks) {
                    const res = await fetch(`${MANGAMUKAI_API}/bookmark`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                            'Authorization': `Bearer ${token}`
                        },
                        body: `manga_id=${id}`
                    });
                    if (stopIfUnauthorized(res)) return;
                }
                localStorage.removeItem('bookmark');
            } else {
                localStorage.removeItem('bookmark');
            }
        } catch (_error) {
            localStorage.removeItem('bookmark');
        }
    }

    // 3. Migrar Historial (History)
    const oldHistoryRaw = localStorage.getItem('ts_mangareader_history');
    if (oldHistoryRaw) {
        try {
            const oldHistory = JSON.parse(oldHistoryRaw);
            if (typeof oldHistory === 'object' && oldHistory !== null) {
                for (const mangaId in oldHistory) {
                    const item = oldHistory[mangaId];
                    if (item && item.time) {
                        const res = await fetch(`${MANGAMUKAI_API}/history`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded',
                                'Authorization': `Bearer ${token}`
                            },
                            body: `manga_id=${mangaId}`
                        });
                        if (stopIfUnauthorized(res)) return;
                    }
                }
                localStorage.removeItem('ts_mangareader_history');
            } else {
                localStorage.removeItem('ts_mangareader_history');
            }
        } catch (_error) {
            localStorage.removeItem('ts_mangareader_history');
        }
    }
};
