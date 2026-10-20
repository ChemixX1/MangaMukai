import { clearStoredAuth, getStoredToken } from './authService';
import { MANGAMUKAI_API } from '../config/api';

const stopIfUnauthorized = (res: Response): boolean => {
    if (res.status === 401 || res.status === 403) {
        clearStoredAuth('expired');
        return true;
    }
    return false;
};

export const migrateOldDataToWordPress = async () => {

    const token = getStoredToken();
    if (!token) return;

    const oldBookmarksRaw = localStorage.getItem('bookmark');
    if (oldBookmarksRaw) {
        try {
            const oldBookmarks: string[] = JSON.parse(oldBookmarksRaw);
            if (Array.isArray(oldBookmarks) && oldBookmarks.length > 0) {

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

    localStorage.removeItem('ts_mangareader_history');
};
