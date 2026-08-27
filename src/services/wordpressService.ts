import {
  clearStoredAuth,
  getStoredToken,
  getStoredUser,
  updateStoredUser,
  type MMUser,
} from './authService';
import { MANGAMUKAI_API } from '../config/api';

const WP_API = MANGAMUKAI_API;

export const PROFILE_UPDATED_EVENT = 'mm_profile_updated';

export interface ProfileUpdatedDetail {
  userId: string;
  username?: string;
  avatarUrl?: string;
  bannerUrl?: string;
}

const emitProfileUpdated = (detail: ProfileUpdatedDetail) => {
  window.dispatchEvent(new CustomEvent<ProfileUpdatedDetail>(PROFILE_UPDATED_EVENT, { detail }));
};

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
  birth_date: string;
  country_code: string;
  phone: string;
  show_birth_date: boolean;
  show_phone: boolean;
  avatar_url: string;
  banner_url: string;
  banner_color: string;
  is_pro: boolean;
  created_at: string;
  social_links: ProfileSocialLinks;
}

interface ApiResponse extends Partial<WordPressProfile> {
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
  birth_date: '',
  country_code: '+51',
  phone: '',
  show_birth_date: false,
  show_phone: false,
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

const optimizeProfileImage = async (file: File, type: 'avatar' | 'banner'): Promise<File> => {
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml' || file.size < 320_000) {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const maxWidth = type === 'avatar' ? 900 : 1920;
    const maxHeight = type === 'avatar' ? 900 : 1080;
    const scale = Math.min(1, maxWidth / bitmap.width, maxHeight / bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', type === 'avatar' ? 0.86 : 0.88));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.webp`, { type: 'image/webp' });
  } catch {
    return file;
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
    const remoteProfile = data?.profile || data;
    if (data?.success && remoteProfile) {
      return {
        ...fallback,
        ...remoteProfile,
        social_links: {
          ...fallback.social_links,
          ...(remoteProfile.social_links || {}),
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
    const result = {
      success: !!data?.success,
      message: data?.message || '',
    };
    if (result.success) {
      const user = getStoredUser();
      if (user) {
        updateStoredUser({ username: profile.username, display_name: profile.username });
        emitProfileUpdated({ userId: String(user.id), username: profile.username, avatarUrl: profile.avatar_url, bannerUrl: profile.banner_url });
      }
    }
    return result;
  } catch {
    return { success: false, message: 'No se pudo guardar el perfil.' };
  }
};

export const uploadWordPressProfileImage = async (
  file: File,
  type: 'avatar' | 'banner'
): Promise<{ success: boolean; url: string; message: string }> => {
  try {
    const body = new FormData();
    body.append('file', await optimizeProfileImage(file, type));
    body.append('type', type);
    const res = await fetch(`${WP_API}/profile/image`, {
      method: 'POST',
      headers: authHeaders(),
      body,
    });

    if (clearIfUnauthorized(res)) {
      return { success: false, url: '', message: 'Sesion expirada.' };
    }

    const data = await readJson<ApiResponse>(res);
    const result = {
      success: !!data?.success && !!data.url,
      url: data?.url || '',
      message: data?.message || '',
    };
    if (result.success) {
      const user = getStoredUser();
      if (user) {
        if (type === 'avatar') updateStoredUser({ avatar: result.url });
        emitProfileUpdated({
          userId: String(user.id),
          ...(type === 'avatar' ? { avatarUrl: result.url } : { bannerUrl: result.url }),
        });
      }
    }
    return result;
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
