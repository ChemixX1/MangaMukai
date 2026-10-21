import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const source = ts.transpileModule(readFileSync(new URL('../src/services/messageInbox.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function inbox(fetchInbox) {
  let user = { id: 7 };
  let token = 'session-a';
  let now = 0;
  let onAuth;
  const exports = {};
  vm.runInNewContext(source, {
    exports, Promise, Date: { now: () => now },
    window: { addEventListener: (_event, handler) => { onAuth = handler; } },
    require: name => name === './authService'
      ? { AUTH_CHANGED_EVENT: 'auth', getStoredToken: () => token, getStoredUser: () => user }
      : { getConversations: fetchInbox },
  });
  return {
    ...exports,
    advance: milliseconds => { now += milliseconds; },
    auth: (nextUser, nextToken) => { user = nextUser; token = nextToken; onAuth(); },
  };
}

test('Community preload and opening Messages share an in-flight request and cached data', async () => {
  const response = Promise.withResolvers();
  let requests = 0;
  const api = inbox(() => { requests++; return response.promise; });
  const prefetch = api.loadMessageInbox();
  assert.equal(api.loadMessageInbox(), prefetch);
  api.auth({ id: 7 }, 'session-a'); // Profile refresh must not discard the preload.
  const value = { conversations: [{ id: 42 }], unread: 1 };
  response.resolve(value);
  await prefetch;
  assert.equal(api.getCachedMessageInbox(), value);
  assert.equal(await api.loadMessageInbox(), value);
  assert.equal(requests, 1);
  api.advance(15_001);
  await api.loadMessageInbox();
  assert.equal(requests, 2);
  await api.loadMessageInbox(true);
  assert.equal(requests, 3);
});

test('changing accounts discards old data and responses without clearing a newer request', async () => {
  const first = Promise.withResolvers();
  const second = Promise.withResolvers();
  let requests = 0;
  const api = inbox(() => ++requests === 1 ? first.promise : second.promise);
  const previous = api.loadMessageInbox();
  api.auth({ id: 8 }, 'session-b');
  const next = api.loadMessageInbox();
  first.resolve({ conversations: [{ id: 1 }], unread: 1 });
  assert.equal((await previous).conversations.length, 0);
  assert.equal(api.getCachedMessageInbox(), null);
  assert.equal(api.loadMessageInbox(), next);
  const value = { conversations: [{ id: 2 }], unread: 0 };
  second.resolve(value);
  await next;
  assert.equal(api.getCachedMessageInbox(), value);
  api.auth(null, null);
  assert.equal(api.getCachedMessageInbox(), null);
  assert.equal((await api.loadMessageInbox()).conversations.length, 0);
  assert.equal(requests, 2);
});

test('failed preloads can retry when Messages opens', async () => {
  let requests = 0;
  const value = { conversations: [], unread: 0 };
  const api = inbox(async () => {
    if (++requests === 1) throw new Error('offline');
    return value;
  });
  await assert.rejects(api.loadMessageInbox(), /offline/);
  assert.equal(api.getCachedMessageInbox(), null);
  assert.equal(await api.loadMessageInbox(), value);
  assert.equal(requests, 2);
});
