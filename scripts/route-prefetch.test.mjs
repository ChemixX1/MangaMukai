import assert from 'node:assert/strict';
import test from 'node:test';
import { idleRouteCandidates, routeModuleKey } from '../src/utils/routePrefetchPolicy.ts';

test('navigation shares one module for dynamic routes and query variants', () => {
  assert.equal(routeModuleKey('/manga/10?from=home'), '/manga/:id');
  assert.equal(routeModuleKey('/manga/20/#capitulos'), '/manga/:id');
  assert.equal(routeModuleKey('/read/55'), '/read/:id');
  assert.equal(routeModuleKey('/auth/register?returnTo=%2Fprofile'), '/auth');
  assert.equal(routeModuleKey('/chat/personaje/conversacion'), '/chat');
  assert.equal(routeModuleKey('/comunidad/publicacion/12'), '/comunidad');
  assert.equal(routeModuleKey('/usuarios/5/publicacion/7'), '/usuarios/:id/publicacion/:postId');
  assert.equal(routeModuleKey('/pro/pago'), '/recargar');
  assert.equal(routeModuleKey('/privacidad'), '/legal-document');
  assert.equal(routeModuleKey('/'), '/');
});

test('external and relative destinations cannot become prefetch keys', () => {
  for (const path of ['https://other.test/manga/1', '//other.test/chat', 'javascript:alert(1)', '#capitulos', 'manga/1']) {
    assert.equal(routeModuleKey(path), null);
  }
});

test('automatic navigation warming is bounded and leaves reading and private routes alone', () => {
  assert.deepEqual(idleRouteCandidates('/', true), ['/manga-bn']);
  assert.deepEqual(idleRouteCandidates('/', false), ['/manga-bn', '/comunidad']);
  assert.deepEqual(idleRouteCandidates('/manga-bn', false), ['/', '/comunidad']);
  for (const path of ['/read/1', '/manga/1', '/profile', '/pro/pago', '/auth/login', '/mensajes']) {
    assert.deepEqual(idleRouteCandidates(path, false), []);
  }
});
