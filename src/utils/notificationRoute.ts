import type { SocialNotification } from '../services/socialService';

export const notificationRoute = (notification: SocialNotification): string => {
  const { type, payload, actor } = notification;
  if (type === 'chapter_new' || type === 'manga_new' || type === 'manga_update') return payload.manga_id ? `/manga/${payload.manga_id}` : '/';
  if ((type === 'comment_like' || type === 'comment_reaction' || type === 'comment_reply') && payload.manga_id) return `/manga/${payload.manga_id}#comentarios`;
  if (type === 'post_reaction' || type === 'post_comment' || type === 'post_share' || type === 'post_comment_like') return payload.post_id ? `/comunidad/publicacion/${payload.post_id}` : '/comunidad';
  if (type === 'message') return actor ? `/mensajes/${actor.id}` : '/mensajes';
  return actor ? `/usuarios/${actor.id}` : '/';
};

