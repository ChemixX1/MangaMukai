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
}

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

export const getMangaComments = async (mangaId: string): Promise<MangaComment[]> => {
  const token = getStoredToken();
  try {
    const query = new URLSearchParams({ manga_id: mangaId });
    const res = await fetch(`${MANGAMUKAI_API}/comments?${query.toString()}`, {
      headers: authHeaders(),
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
        chapter_id: null,
        content,
        parent_id: parentId,
      }),
    });
    if (res.status === 401 || res.status === 403) clearStoredAuth('expired');
    if (!res.ok) return null;
    const data = await res.json();
    if (data.error) return null;
    return normalizeComment(data.comment || data);
  } catch {
    return null;
  }
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
