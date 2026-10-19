import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
import { notificationRoute } from '../src/utils/notificationRoute.ts';

test('community notifications open their exact post, including comment likes', () => {
  for (const type of ['post_reaction', 'post_comment', 'post_share', 'post_comment_like']) {
    assert.equal(notificationRoute({ type, payload: { post_id: 42 }, actor: { id: 9 } }), '/comunidad/publicacion/42');
    assert.equal(notificationRoute({ type, payload: {}, actor: { id: 9 } }), '/comunidad');
  }
});
test('messages open their sender and manga comments keep their manga destination', () => {
  assert.equal(notificationRoute({ type: 'message', payload: {}, actor: { id: 9 } }), '/mensajes/9');
  assert.equal(notificationRoute({ type: 'comment_reply', payload: { manga_id: 55005 }, actor: { id: 9 } }), '/manga/55005#comentarios');
});

const bundle = await build({ entryPoints: ['src/services/communityFeedService.ts'], bundle: true, write: false, platform: 'node', format: 'esm', define: { 'import.meta.env': '{}' } });
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const post = { id: 42, user_id: 9, author: { id: 9, username: 'Lector', avatar_url: '' }, content: 'Hola', media_type: 'image', media_url: 'cover.webp', reactions: { like: 2, love: 3 }, my_reaction: 'love', saved: true, comment_count: 4, created_at: '2026-10-16T10:00:00Z' };
const installFetch = (t, handler) => {
  const originalFetch = globalThis.fetch;
  const originalStorage = globalThis.localStorage;
  const originalSession = globalThis.sessionStorage;
  globalThis.localStorage = { getItem: () => null };
  globalThis.sessionStorage = { getItem: () => null };
  globalThis.fetch = handler;
  t.after(() => { globalThis.fetch = originalFetch; globalThis.localStorage = originalStorage; globalThis.sessionStorage = originalSession; });
};
test('server feed preserves IDs, reaction totals and saved state', () => {
  const mapped = api.communityPostFromServer(post);
  assert.equal(mapped.id, '42');
  assert.equal(mapped.likes, 5);
  assert.equal(mapped.liked, true);
  assert.equal(mapped.saved, true);
  assert.equal(mapped.commentCount, 4);
});
test('feed errors are surfaced instead of showing local demo posts', async (t) => {
  installFetch(t, async () => new Response(JSON.stringify({ code: 'rest_no_route' }), { status: 404 }));
  await assert.rejects(api.getCommunityFeed(), /actualizarse en el servidor/);
});
test('thread loads older comment pages in chronological order', async (t) => {
  const comment = (id) => ({ id, post_id: 42, content: `reply ${id}`, author: post.author, created_at: post.created_at });
  installFetch(t, async (url) => new Response(JSON.stringify(url.includes('/social/community')
    ? { success: true, posts: [post] }
    : { success: true, comments: url.includes('before=3') ? [comment(1), comment(2)] : [comment(3), comment(4)], has_more: !url.includes('before=3') })));
  const thread = await api.getCommunityThread('42');
  assert.deepEqual(thread.comments.map((entry) => entry.id), ['1', '2', '3', '4']);
});

test('a rejected reaction does not get reported as saved', async (t) => {
  installFetch(t, async () => new Response(JSON.stringify({ success: false, message: 'No se pudo guardar' }), { status: 500 }));
  const current = api.communityPostFromServer(post);
  await assert.rejects(api.updateCommunityPost(current, { ...current, liked: false }), /No se pudo guardar/);
});

test('a confirmed reply is preserved if the subsequent refresh fails', async (t) => {
  const current = api.communityPostFromServer(post);
  installFetch(t, async (url, options) => options?.method === 'POST'
    ? new Response(JSON.stringify({ success: true, post: { ...post, comment_count: 5 }, comment: { id: 99, post_id: 42, author: post.author, content: 'Respuesta', created_at: post.created_at } }))
    : new Response(JSON.stringify({ success: false }), { status: 500 }));
  const result = await api.updateCommunityPost(current, { ...current, comments: [{ id: 'draft', name: 'Lector', text: 'Respuesta' }] });
  assert.equal(result.comments[0].id, '99');
  assert.equal(result.commentCount, 5);
});
