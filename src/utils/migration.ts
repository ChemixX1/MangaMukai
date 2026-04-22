import { getStoredToken } from './auth';

/**
 * Migra los marcadores y el historial de lectura almacenados localmente 
 * por el antiguo tema WordPress ('mangareader') a la base de datos de WordPress.
 */
export const migrateOldDataToSupabase = async () => {
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
                    await fetch('https://mangamukai.com/wp-json/mangamukai/v1/bookmark', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                            'Authorization': `Bearer ${token}`
                        },
                        body: `manga_id=${id}`
                    });
                }
                localStorage.removeItem('bookmark');
            } else {
                localStorage.removeItem('bookmark');
            }
        } catch (e) {
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
                        await fetch('https://mangamukai.com/wp-json/mangamukai/v1/history', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded',
                                'Authorization': `Bearer ${token}`
                            },
                            body: `manga_id=${mangaId}`
                        });
                    }
                }
                localStorage.removeItem('ts_mangareader_history');
            } else {
                localStorage.removeItem('ts_mangareader_history');
            }
        } catch (e) {
            localStorage.removeItem('ts_mangareader_history');
        }
    }
};
