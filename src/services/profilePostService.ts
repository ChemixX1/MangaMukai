import { MANGAMUKAI_API } from '../config/api';
import { clearStoredAuth, getStoredToken } from './authService';

export interface ProfilePostAuthor {
  id: number;
  username: string;
  avatar_url: string;
  is_pro: boolean;
}

export interface ProfilePost {
  id: number;
  user_id: number;
  content: string;
  media_id: number | null;
  media_url: string;
  media_type: 'image' | 'video' | '';
  created_at: string;
  author: ProfilePostAuthor;
}

interface PostPayload {
  success?: boolean;
  message?: string;
  posts?: ProfilePost[];
  post?: ProfilePost;
  media?: { id: number; url: string; type: 'image' | 'video' };
}

const authHeaders = (json = false): HeadersInit => {
  const token = getStoredToken();
  return {
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const readPayload = async (response: Response): Promise<PostPayload> => {
  try {
    return await response.json() as PostPayload;
  } catch {
    return {};
  }
};

const ensureSuccess = async (response: Response): Promise<PostPayload> => {
  const payload = await readPayload(response);
  if (response.status === 401 || response.status === 403) {
    if (response.status === 401) clearStoredAuth('expired');
    throw new Error(payload.message || 'No tienes acceso a esta acción.');
  }
  if (!response.ok || !payload.success) throw new Error(payload.message || 'No se pudo completar la acción.');
  return payload;
};

export const getProfilePosts = async (userId: string | number): Promise<ProfilePost[]> => {
  const query = new URLSearchParams({ user_id: String(userId), limit: '18' });
  const response = await fetch(`${MANGAMUKAI_API}/social/posts?${query.toString()}`, {
    credentials: 'include',
    headers: authHeaders(),
  });
  const payload = await ensureSuccess(response);
  return payload.posts || [];
};

export const uploadProfilePostMedia = async (file: File): Promise<{ id: number; url: string; type: 'image' | 'video' }> => {
  const body = new FormData();
  body.append('file', file);
  const response = await fetch(`${MANGAMUKAI_API}/social/posts/media`, {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders(),
    body,
  });
  const payload = await ensureSuccess(response);
  if (!payload.media) throw new Error('El servidor no devolvió el archivo subido.');
  return payload.media;
};

export const createProfilePost = async (content: string, mediaId?: number): Promise<ProfilePost> => {
  const response = await fetch(`${MANGAMUKAI_API}/social/posts`, {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders(true),
    body: JSON.stringify({ content, media_id: mediaId || 0 }),
  });
  const payload = await ensureSuccess(response);
  if (!payload.post) throw new Error('El servidor no devolvió la publicación.');
  return payload.post;
};
