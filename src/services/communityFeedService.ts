import { MANGAMUKAI_API } from '../config/api';
import { getStoredToken } from './authService';
import { createProfilePost, getProfilePostComments, interactWithProfilePost, uploadProfilePostMedia, type ProfilePost, type ProfilePostComment } from './profilePostService';
import type { CommunityPost } from '../data/communityPosts';

export const communityPostFromServer = (post: ProfilePost): CommunityPost => ({
  id: String(post.id), userId: String(post.user_id), name: post.author.username,
  avatar: post.author.avatar_url, content: post.content, image: post.media_type === 'image' ? post.media_url : undefined,
  manga: post.community_manga || undefined, likes: Object.values(post.reactions || {}).reduce((sum, count) => sum + count, 0),
  liked: !!post.my_reaction, saved: !!post.saved, comments: [], commentCount: post.comment_count || 0,
  createdAt: post.created_at, views: post.views || 0,
});
const commentFromServer = (comment: ProfilePostComment) => ({
  id: String(comment.id), userId: String(comment.author.id), name: comment.author.username,
  avatar: comment.author.avatar_url, text: comment.content, createdAt: comment.created_at,
  image: comment.image, likes: comment.likes || 0, liked: !!comment.liked,
});

async function requestCommunity(query = '', body?: Record<string, unknown>) {
  const token = getStoredToken();
  const response = await fetch(`${MANGAMUKAI_API}/social/community${body ? '/state' : query}`, {
    method: body ? 'POST' : 'GET', credentials: 'include', cache: 'no-store',
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(response.status === 404 ? 'La conexión de Comunidad necesita actualizarse en el servidor.' : data.message || 'No se pudo cargar la comunidad.');
  return data as { posts?: ProfilePost[]; post?: ProfilePost; has_more?: boolean };
}

export async function getCommunityFeed(before?: string) {
  const data = await requestCommunity(before ? `?before=${encodeURIComponent(before)}` : '');
  return { posts: (data.posts || []).map(communityPostFromServer), hasMore: !!data.has_more };
}
export async function getCommunityThread(id: string) {
  const data = await requestCommunity(`?id=${encodeURIComponent(id)}`);
  if (!data.posts?.[0]) throw new Error('Publicación no encontrada.');
  const post = communityPostFromServer(data.posts[0]);
  let before: number | undefined;
  for (;;) {
    const page = await getProfilePostComments(Number(id), before);
    post.comments = [...page.comments.map(commentFromServer), ...post.comments];
    if (!page.hasMore || !page.comments.length) break;
    const next = Math.min(...page.comments.map((comment) => comment.id));
    if (before !== undefined && next >= before) break;
    before = next;
  }
  return post;
}
async function uploadImage(image?: string) {
  if (!image) return undefined;
  if (!image.startsWith('data:image/')) throw new Error('Selecciona una imagen desde tu dispositivo.');
  const blob = await fetch(image).then((response) => response.blob());
  return uploadProfilePostMedia(new File([blob], `community.${blob.type.split('/')[1] || 'png'}`, { type: blob.type }));
}
export async function publishCommunityPost(draft: CommunityPost) {
  const media = await uploadImage(draft.image);
  return communityPostFromServer(await createProfilePost(draft.content || (draft.manga ? `Recomiendo ${draft.manga.title}` : ''), media?.id, draft.manga));
}
export async function updateCommunityPost(current: CommunityPost, next: CommunityPost) {
  let confirmed = next;
  if (current.liked !== next.liked) {
    const result = await interactWithProfilePost(Number(current.id), 'reaction', { reaction: next.liked ? 'like' : '' });
    confirmed = { ...communityPostFromServer(result.post), comments: current.comments };
  }
  if (current.saved !== next.saved) await requestCommunity('', { post_id: Number(current.id), active: !!next.saved });
  if (next.comments.length > current.comments.length) {
    const reply = next.comments[next.comments.length - 1];
    const media = await uploadImage(reply.image);
    const result = await interactWithProfilePost(Number(current.id), 'comments', { content: reply.text || 'Imagen adjunta', ...(media ? { image_id: String(media.id) } : {}) });
    confirmed = { ...communityPostFromServer(result.post), comments: [...current.comments, result.comment ? commentFromServer(result.comment) : reply] };
  } else {
    const changed = next.comments.find((reply) => current.comments.some((old) => old.id === reply.id && !!old.liked !== !!reply.liked));
    if (changed) await requestCommunity('', { post_id: Number(current.id), comment_id: Number(changed.id), active: !!changed.liked });
  }
  // A failed refresh must not turn a confirmed write into a failed submission.
  return getCommunityThread(current.id).catch(() => confirmed);
}
