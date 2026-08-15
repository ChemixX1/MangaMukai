import {
  clearStoredAuth,
  getStoredToken,
  type MMUser,
} from './authService';
import { MANGAMUKAI_API } from '../config/api';

const WP_API = MANGAMUKAI_API;

export interface ProfileSocialLinks {
  facebook: string;
  twitter: string;
  instagram: string;
  discord: string;
  whatsapp: string;
  telegram: string;
  youtube: string;
  github: string;
}

export interface WordPressProfile {
  username: string;
  bio: string;
  location: string;
  avatar_url: string;
  banner_url: string;
  banner_color: string;
  is_pro: boolean;
  created_at: string;
  social_links: ProfileSocialLinks;
}

interface ApiResponse {
  success?: boolean;
  message?: string;
  profile?: WordPressProfile;
  url?: string;
}

export const emptySocialLinks = (): ProfileSocialLinks => ({
  facebook: '',
  twitter: '',
  instagram: '',
  discord: '',
  whatsapp: '',
  telegram: '',
  youtube: '',
  github: '',
});

const profileFromUser = (user: MMUser): WordPressProfile => ({
  username: user.display_name || user.username,
  bio: '',
  location: '',
  avatar_url: user.avatar || '',
  banner_url: '',
  banner_color: 'bg-[#FF4D88]',
  is_pro: false,
  created_at: new Date().toISOString(),
  social_links: emptySocialLinks(),
});

const authHeaders = (): HeadersInit => {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const clearIfUnauthorized = (res: Response): boolean => {
  if (res.status === 401 || res.status === 403) {
    clearStoredAuth('expired');
    return true;
  }
  return false;
};

const readJson = async <T>(res: Response): Promise<T | null> => {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
};

export const getWordPressProfile = async (
  user: MMUser
): Promise<WordPressProfile> => {
  const fallback = profileFromUser(user);
  const token = getStoredToken();
  if (!token) return fallback;

  try {
    const res = await fetch(`${WP_API}/profile`, {
      headers: authHeaders(),
    });

    if (clearIfUnauthorized(res)) return fallback;

    const data = await readJson<ApiResponse>(res);
    if (data?.success && data.profile) {
      return {
        ...fallback,
        ...data.profile,
        social_links: {
          ...fallback.social_links,
          ...(data.profile.social_links || {}),
        },
      };
    }
  } catch {
    // Profile details are non-critical; keep rendering the account.
  }

  return fallback;
};

export const saveWordPressProfile = async (
  profile: WordPressProfile
): Promise<{ success: boolean; message: string }> => {
  try {
    const res = await fetch(`${WP_API}/profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify(profile),
    });

    if (clearIfUnauthorized(res)) {
      return { success: false, message: 'Sesion expirada.' };
    }

    const data = await readJson<ApiResponse>(res);
    return {
      success: !!data?.success,
      message: data?.message || '',
    };
  } catch {
    return { success: false, message: 'No se pudo guardar el perfil.' };
  }
};

export const uploadWordPressProfileImage = async (
  file: File,
  type: 'avatar' | 'banner'
): Promise<{ success: boolean; url: string; message: string }> => {
  const body = new FormData();
  body.append('file', file);
  body.append('type', type);

  try {
    const res = await fetch(`${WP_API}/profile/image`, {
      method: 'POST',
      headers: authHeaders(),
      body,
    });

    if (clearIfUnauthorized(res)) {
      return { success: false, url: '', message: 'Sesion expirada.' };
    }

    const data = await readJson<ApiResponse>(res);
    return {
      success: !!data?.success && !!data.url,
      url: data?.url || '',
      message: data?.message || '',
    };
  } catch {
    return { success: false, url: '', message: 'No se pudo subir la imagen.' };
  }
};

export const sendWordPressContactMessage = async (message: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<{ success: boolean; message: string }> => {
  try {
    const res = await fetch(`${WP_API}/contact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify(message),
    });

    if (clearIfUnauthorized(res)) {
      return { success: false, message: 'Sesion expirada.' };
    }

    const data = await readJson<ApiResponse>(res);
    return {
      success: !!data?.success,
      message: data?.message || '',
    };
  } catch {
    return { success: false, message: 'Error de conexion.' };
  }
};
