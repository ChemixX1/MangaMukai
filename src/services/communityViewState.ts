import { AUTH_CHANGED_EVENT, getStoredToken, getStoredUser } from './authService';

interface CommunityPosition { userId: string; url: string; scrollY: number }
let position: CommunityPosition | null = null;

export function rememberCommunityPosition(userId: string, url: string, scrollY: number) {
  position = { userId, url, scrollY };
}

export function getCommunityPosition(userId: string) {
  return position?.userId === userId ? position : null;
}

window.addEventListener(AUTH_CHANGED_EVENT, () => {
  if (!getStoredToken() || String(getStoredUser()?.id) !== position?.userId) position = null;
});
