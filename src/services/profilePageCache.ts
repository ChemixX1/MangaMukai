import { AUTH_CHANGED_EVENT, getAuthCacheKey, getStoredUser } from './authService';
import type { MangaCapitulo } from '../types/manga';
import type { ProfilePost } from './profilePostService';
import type { PublicProfile, SocialLibrary } from './socialService';
import { PROFILE_UPDATED_EVENT, type ProfileUpdatedDetail } from './wordpressService';
import { PROFILE_CONTENT_CHANGED_EVENT } from './profileCacheEvents';

interface ProfileData {
  profile: PublicProfile;
  catalog: MangaCapitulo[];
  library: SocialLibrary;
  likedIds: string[];
  posts: ProfilePost[];
}
type Key = keyof ProfileData;
type Entry = { value: ProfileData[Key]; loadedAt: number; freshUntil: number };
type Scope = { owner: string; userId: string; entries: Map<Key, Entry>; pending: Map<Key, Promise<unknown>>; versions: Map<Key, number> };
let scope: Scope | undefined;
const FRESH_MS = 60_000;
const RETAIN_MS = 5 * 60_000;

function currentScope(userId: string | number): Scope | undefined {
  const owner = getAuthCacheKey();
  if (scope && scope.owner !== owner) scope = undefined;
  if (!owner || String(getStoredUser()?.id) !== String(userId)) return;
  return scope ??= { owner, userId: String(userId), entries: new Map(), pending: new Map(), versions: new Map() };
}

/** One account in memory, with stale data available while a revisit refreshes it. */
export function peekProfileData<K extends Key>(userId: string | number, key: K): ProfileData[K] | undefined {
  const current = currentScope(userId);
  const entry = current?.entries.get(key);
  if (!entry) return;
  if (Date.now() - entry.loadedAt >= RETAIN_MS) { current!.entries.delete(key); return; }
  return entry.value as ProfileData[K];
}

export function loadProfileData<K extends Key>(userId: string | number, key: K, fetcher: () => Promise<ProfileData[K]>): Promise<ProfileData[K]> {
  const current = currentScope(userId);
  if (!current) return Promise.reject(new Error('La sesión del perfil cambió.'));
  const cached = current.entries.get(key);
  if (cached && cached.freshUntil > Date.now()) return Promise.resolve(cached.value as ProfileData[K]);
  const pending = current.pending.get(key);
  if (pending) return pending as Promise<ProfileData[K]>;
  const version = current.versions.get(key) ?? 0;
  const request = Promise.resolve().then(fetcher).then(value => {
    if (scope === current && getAuthCacheKey() === current.owner && (current.versions.get(key) ?? 0) === version) {
      current.entries.set(key, { value, loadedAt: Date.now(), freshUntil: Date.now() + FRESH_MS });
    }
    return value;
  }).finally(() => { if (current.pending.get(key) === request) current.pending.delete(key); });
  current.pending.set(key, request);
  return request;
}

const readyImages = new Set<string>();
export const getReadyProfileImages = () => [...readyImages];
export const isProfileImageReady = (url: string) => readyImages.has(url);
export function rememberProfileImage(url: string) {
  readyImages.delete(url);
  readyImages.add(url);
  if (readyImages.size > 32) readyImages.delete(readyImages.values().next().value!);
}

if (typeof window !== 'undefined') {
  window.addEventListener(AUTH_CHANGED_EVENT, () => {
    if (scope?.owner !== getAuthCacheKey()) scope = undefined;
  });
  window.addEventListener(PROFILE_CONTENT_CHANGED_EVENT, () => {
    if (!scope || scope.owner !== getAuthCacheKey()) return;
    for (const key of ['profile', 'library', 'likedIds', 'posts'] as const) {
      const entry = scope.entries.get(key);
      if (entry) entry.freshUntil = 0;
      scope.versions.set(key, (scope.versions.get(key) ?? 0) + 1);
      scope.pending.delete(key);
    }
  });
  window.addEventListener(PROFILE_UPDATED_EVENT, event => {
    const detail = (event as CustomEvent<ProfileUpdatedDetail>).detail;
    const current = detail && currentScope(detail.userId);
    const entry = current?.entries.get('profile');
    if (!current || !entry) return;
    const profile = entry.value as PublicProfile;
    const patch = {
      ...(detail.username === undefined ? {} : { username: detail.username }),
      ...(detail.avatarUrl === undefined ? {} : { avatar_url: detail.avatarUrl }),
      ...(detail.bannerUrl === undefined ? {} : { banner_url: detail.bannerUrl }),
      ...(detail.bio === undefined ? {} : { bio: detail.bio }),
    };
    current.versions.set('profile', (current.versions.get('profile') ?? 0) + 1);
    current.pending.delete('profile');
    current.entries.set('profile', { value: { ...profile, ...patch }, loadedAt: Date.now(), freshUntil: Date.now() + FRESH_MS });
    // Keep cached post authors consistent without fetching the whole page again.
    const posts = current.entries.get('posts');
    if (posts && (detail.username !== undefined || detail.avatarUrl !== undefined)) {
      posts.value = (posts.value as ProfilePost[]).map(post => String(post.author.id) === detail.userId
        ? { ...post, author: { ...post.author, ...(detail.username === undefined ? {} : { username: detail.username }), ...(detail.avatarUrl === undefined ? {} : { avatar_url: detail.avatarUrl }) } }
        : post);
    }
  });
}
