import { useEffect, useRef, useState } from 'react';
import type { CommunityPost } from '../data/communityPosts';
import { getCommunityFeed, getCommunityThread, publishCommunityPost, updateCommunityPost } from '../services/communityFeedService';
import { followUser, unfollowUser, getFollows, SOCIAL_REFRESH_EVENT } from '../services/socialService';

export function useCommunityFeed(userId: string, postId?: string) {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [follows, setFollows] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [connected, setConnected] = useState(false);
  const cursor = useRef<string | undefined>(undefined);
  const pending = useRef(new Set<string>());
  const revision = useRef(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (pending.current.size) return;
      const version = revision.current;
      try {
        const [feed, thread, following] = await Promise.all([
          getCommunityFeed(), postId ? getCommunityThread(postId) : null,
          userId !== 'guest' ? getFollows().then((value) => value.following.map((entry) => String(entry.user.id))) : [],
        ]);
        if (!active || version !== revision.current) return;
        setPosts((current) => {
          const oldest = Math.min(...feed.posts.map((post) => Number(post.id)));
          const merged = new Map(current.filter((post) => feed.hasMore && Number(post.id) < oldest).map((post) => [post.id, post]));
          feed.posts.forEach((post) => merged.set(post.id, post));
          if (thread) merged.set(thread.id, thread);
          return [...merged.values()];
        });
        if (!cursor.current) {
          cursor.current = feed.posts.at(-1)?.id;
          setHasMore(feed.hasMore);
        }
        setConnected(true);
        setFollows(following);
        setError('');
      } catch (caught) { if (active) setError((caught as Error).message); }
      finally { if (active) setLoading(false); }
    };
    void load();
    const refresh = () => { if (!document.hidden) void load(); };
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [userId, postId]);

  const run = async (key: string, action: () => Promise<void>) => {
    if (userId === 'guest') { setError('Inicia sesión para participar en la comunidad.'); return false; }
    if (!connected) { setError('Espera a que la comunidad se conecte al servidor.'); return false; }
    if (pending.current.has(key)) return false;
    pending.current.add(key); revision.current++;
    try { await action(); setError(''); window.dispatchEvent(new Event(SOCIAL_REFRESH_EVENT)); return true; }
    catch (caught) { setError((caught as Error).message); return false; }
    finally { pending.current.delete(key); revision.current++; }
  };
  const publish = (draft: CommunityPost) => run('publish', async () => {
    const post = await publishCommunityPost(draft);
    setPosts((current) => [post, ...current.filter((item) => item.id !== post.id)]);
  });
  const update = (next: CommunityPost) => run(next.id, async () => {
    const previous = posts.find((post) => post.id === next.id);
    if (!previous) throw new Error('Publicación no encontrada.');
    const post = await updateCommunityPost(previous, next);
    setPosts((current) => current.map((item) => item.id === post.id ? post : item));
  });
  const toggleFollow = (id: string) => run(`follow:${id}`, async () => {
    if (follows.includes(id)) await unfollowUser(Number(id));
    else await followUser(Number(id));
    const result = await getFollows();
    setFollows(result.following.map((entry) => String(entry.user.id)));
  });
  const loadMore = async () => {
    if (pending.current.has('more')) return;
    pending.current.add('more');
    try {
      const page = await getCommunityFeed(cursor.current);
      setPosts((current) => [...current, ...page.posts.filter((post) => !current.some((item) => item.id === post.id))]);
      setHasMore(page.hasMore);
      cursor.current = page.posts.at(-1)?.id || cursor.current;
    } catch (caught) { setError((caught as Error).message); }
    finally { pending.current.delete('more'); }
  };
  return { posts, follows, error, setError, loading, hasMore, loadMore, publish, update, toggleFollow };
}
