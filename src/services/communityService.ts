import { MANGAMUKAI_API } from '../config/api';
import { clearStoredAuth, getStoredToken } from './authService';

export interface MusicTrack {
  id: number;
  title: string;
  url: string;
  duration: string;
  is_locked: boolean;
  track_number: number;
  cover_url: string;
  genre: string;
}

export interface MangaCommentProfile {
  username: string;
  avatar_url?: string | null;
  banner_color?: string;
  is_pro?: boolean;
}

export interface MangaComment {
  id: number;
  content: string;
  created_at: string;
  likes: number;
  parent_id: number | null;
  user_id: number | string;
  is_liked_by_user: boolean;
  profiles: MangaCommentProfile;
  reactions?: Record<string, number>;
  my_reaction?: string;
}

export interface EntityReactions { reactions: Record<string, number>; my_reaction: string }

export const getEntityReactions = async (type: 'manga' | 'chapter' | 'comment', id: string | number): Promise<EntityReactions> => {
  const response = await fetch(`${MANGAMUKAI_API}/reactions/${type}/${id}`, { headers: authHeaders(), cache: 'no-store' });
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(data.message || 'No se pudieron cargar las reacciones.');
  return data;
};

export const setEntityReaction = async (type: 'manga' | 'chapter' | 'comment', id: string | number, reaction: string): Promise<EntityReactions> => {
  const response = await fetch(`${MANGAMUKAI_API}/reactions/${type}/${id}`, { method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ reaction }) });
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(data.message || 'No se pudo guardar la reacción.');
  return data;
};

const authHeaders = (): HeadersInit => {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const normalizeComment = (comment: Record<string, unknown>): MangaComment => ({
  id: Number(comment.id),
  content: String(comment.content ?? ''),
  created_at: String(comment.created_at ?? new Date().toISOString()),
  likes: Number(comment.likes_count ?? comment.likes ?? 0),
  parent_id: comment.parent_id ? Number(comment.parent_id) : null,
  user_id: String(comment.user_id ?? ''),
  is_liked_by_user: Boolean(comment.is_liked_by_user),
  reactions: comment.reactions as Record<string, number> | undefined,
  my_reaction: String(comment.my_reaction || ''),
  profiles: (comment.profiles as MangaCommentProfile) || {
    username: 'Usuario MangaMukai',
    avatar_url: null,
    banner_color: 'bg-zinc-800',
    is_pro: false,
  },
});

export const getMusicTracks = async (): Promise<MusicTrack[]> => {
  const token = getStoredToken();
  try {
    const res = await fetch(`${MANGAMUKAI_API}/music?_=${Date.now()}`, {
      headers: authHeaders(),
      cache: 'no-store',
      credentials: 'include',
    });
    if ((res.status === 401 || res.status === 403) && token) clearStoredAuth('expired');
    if (!res.ok) return [];
    const data = await res.json();
    return data.success && Array.isArray(data.tracks) ? data.tracks as MusicTrack[] : [];
  } catch {
    return [];
  }
};

export const getMangaComments = async (mangaId: string, chapterId?: string, signal?: AbortSignal): Promise<MangaComment[]> => {
  const token = getStoredToken();
  try {
    const query = new URLSearchParams(chapterId ? { manga_id: mangaId, chapter_id: chapterId } : { manga_id: mangaId, scope: 'global' });
    const res = await fetch(`${MANGAMUKAI_API}/comments?${query.toString()}`, {
      signal,
      headers: authHeaders(),
      cache: 'no-store',
    });
    if ((res.status === 401 || res.status === 403) && token) clearStoredAuth('expired');
    if (!res.ok) return [];
    const data = await res.json();
    const comments = Array.isArray(data) ? data : data.comments;
    return Array.isArray(comments) ? comments.map(normalizeComment) : [];
  } catch {
    return [];
  }
};

export const postMangaComment = async (
  mangaId: string,
  content: string,
  parentId: number | null = null,
  chapterId?: string,
): Promise<MangaComment | null> => {
  const token = getStoredToken();
  if (!token) return null;

  try {
    const res = await fetch(`${MANGAMUKAI_API}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        manga_id: mangaId,
        chapter_id: chapterId || null,
        content,
        parent_id: parentId,
      }),
    });
    if (res.status === 401 || res.status === 403) clearStoredAuth('expired');
    if (!res.ok) return null;
    const data = await res.json();
    if (data.error) return null;
    if (chapterId) window.dispatchEvent(new CustomEvent('mm_chapter_comments_changed', { detail: { chapterId } }));
    return normalizeComment(data.comment || data);
  } catch {
    return null;
  }
};

export const getChapterEngagement = async (ids: Array<string | number>) => {
  const counts: Record<string, number> = {};
  const engagement: Record<string, EntityReactions> = {};
  for (let start = 0; start < ids.length; start += 100) {
    const query = new URLSearchParams({ ids: ids.slice(start, start + 100).join(',') });
    const response = await fetch(`${MANGAMUKAI_API}/chapters/comment-counts?${query}`, { cache: 'no-store', headers: authHeaders() });
    if (!response.ok) throw new Error('No se pudieron cargar los contadores.');
    const data = await response.json();
    Object.assign(counts, data.counts || {});
    Object.assign(engagement, data.engagement || {});
  }
  return { counts, engagement };
};

export const toggleCommentLike = async (commentId: number): Promise<boolean> => {
  const token = getStoredToken();
  if (!token) return false;

  try {
    const res = await fetch(`${MANGAMUKAI_API}/comments/like`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ comment_id: commentId }),
    });
    if (res.status === 401 || res.status === 403) clearStoredAuth('expired');
    if (!res.ok) return false;
    const data = await res.json();
    return Boolean(data.success);
  } catch {
    return false;
  }
};

export const notifyCommentReaction = async (
  commentId: number,
  reaction: 'fire' | 'love' | 'haha' | 'sad' | null,
): Promise<boolean> => {
  const token = getStoredToken();
  if (!token) return false;

  try {
    const res = await fetch(`${MANGAMUKAI_API}/social/comments/reaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        comment_id: commentId,
        reaction: reaction || '',
        active: Boolean(reaction),
      }),
    });
    if (res.status === 401 || res.status === 403) clearStoredAuth('expired');
    if (!res.ok) return false;
    const data = await res.json();
    return Boolean(data.success);
  } catch {
    return false;
  }
};
