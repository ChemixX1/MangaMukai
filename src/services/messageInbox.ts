import { AUTH_CHANGED_EVENT, getStoredToken, getStoredUser } from './authService';
import { getConversations } from './socialService';

type Inbox = Awaited<ReturnType<typeof getConversations>>;
const FRESH_MS = 15_000;
let snapshot: { key: string; value: Inbox; loadedAt: number } | null = null;
let pending: { key: string; request: Promise<Inbox> } | null = null;
let revision = 0;

const sessionKey = () => {
  const token = getStoredToken();
  const user = getStoredUser();
  return token && user ? `${user.id}:${token}` : '';
};

window.addEventListener(AUTH_CHANGED_EVENT, () => {
  const key = sessionKey();
  if (!key || (snapshot && snapshot.key !== key) || (pending && pending.key !== key)) {
    snapshot = null;
    pending = null;
    revision++;
  }
});

export const getCachedMessageInbox = (): Inbox | null =>
  snapshot?.key === sessionKey() ? snapshot.value : null;

// Community and Messages share both the result and any request already in flight.
export function loadMessageInbox(force = false): Promise<Inbox> {
  const key = sessionKey();
  if (!key) return Promise.resolve({ conversations: [], unread: 0 });
  if (pending?.key === key) return pending.request;
  if (!force && snapshot?.key === key && Date.now() - snapshot.loadedAt < FRESH_MS) {
    return Promise.resolve(snapshot.value);
  }
  const version = revision;
  const request = getConversations().then(value => {
    if (version !== revision || sessionKey() !== key) return { conversations: [], unread: 0 };
    snapshot = { key, value, loadedAt: Date.now() };
    return value;
  }).finally(() => {
    if (pending?.request === request) pending = null;
  });
  pending = { key, request };
  return request;
}
