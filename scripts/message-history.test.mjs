import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const source = ts.transpileModule(readFileSync(new URL('../src/services/messageHistory.ts', import.meta.url), 'utf8'), {
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
      : { getConversationMessages: fetchInbox },
  });
  return {
    ...exports,
    advance: milliseconds => { now += milliseconds; },
    auth: (nextUser, nextToken) => { user = nextUser; token = nextToken; onAuth(); },
  };
}


test('warming and opening share requests; opening cached history still refreshes', async () => {
  const response = Promise.withResolvers();
  let calls = 0;
  const api = inbox(() => { calls++; return response.promise; });
  const warm = api.loadMessageHistory(42, undefined, true);
  assert.equal(api.loadMessageHistory(42), warm);
  const value = { messages: [{ id: 1 }], hasMore: true };
  response.resolve(value);
  await warm;
  assert.equal(api.getCachedMessageHistory(42), value);
  assert.equal(await api.loadMessageHistory(42, undefined, true), value);
  assert.equal(calls, 1);
  await api.loadMessageHistory(42);
  assert.equal(calls, 2);
  api.advance(60001);
  assert.equal(api.getCachedMessageHistory(42), null);
});

test('account changes discard cached messages and stale in-flight responses', async () => {
  const response = Promise.withResolvers();
  const api = inbox(() => response.promise);
  const first = api.loadMessageHistory(42);
  api.auth({ id: 8 }, 'session-b');
  api.auth({ id: 7 }, 'session-a');
  response.resolve({ messages: [{ id: 1 }], hasMore: false });
  assert.equal((await first).messages.length, 0);
  assert.equal(api.getCachedMessageHistory(42), null);
  api.auth(null, null);
  assert.equal((await api.loadMessageHistory(42)).messages.length, 0);
});

test('older pages do not replace the recent page and failures can retry', async () => {
  let calls = 0;
  const recent = { messages: [{ id: 9 }], hasMore: true };
  const api = inbox(async (_id, before) => {
    if (++calls === 1) throw new Error('offline');
    return before ? { messages: [{ id: 1 }], hasMore: false } : recent;
  });
  await assert.rejects(api.loadMessageHistory(42), /offline/);
  await api.loadMessageHistory(42);
  await api.loadMessageHistory(42, 9);
  assert.equal(api.getCachedMessageHistory(42), recent);
});
