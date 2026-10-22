import { AUTH_CHANGED_EVENT, getStoredToken, getStoredUser } from './authService';
import { getConversationMessages } from './socialService';

type History = Awaited<ReturnType<typeof getConversationMessages>>;
const snapshots = new Map<number, { value: History; at: number }>();
const requests = new Map<number, Promise<History>>();
let owner = '';
let revision = 0;
const syncSession = () => {
  const token = getStoredToken();
  const key = token ? `${getStoredUser()?.id}:${token}` : '';
  if (key !== owner) {
    revision++;
    snapshots.clear();
    requests.clear();
    owner = key;
  }
  return key;
};
window.addEventListener(AUTH_CHANGED_EVENT, syncSession);

export function getCachedMessageHistory(userId: number): History | null {
  if (!syncSession()) return null;
  const entry = snapshots.get(userId);
  return entry && Date.now() - entry.at < 60_000 ? entry.value : null;
}

// Only the latest page lives in memory; opening a chat still refreshes it.
export function loadMessageHistory(userId: number, before?: number, warm = false): Promise<History> {
  const key = syncSession();
  if (!key) return Promise.resolve({ messages: [], hasMore: false });
  const version = revision;
  if (before) return getConversationMessages(userId, before).then(value =>
    syncSession() === key && revision === version ? value : { messages: [], hasMore: false });
  const cached = getCachedMessageHistory(userId);
  if (warm && cached) return Promise.resolve(cached);
  const pending = requests.get(userId);
  if (pending) return pending;
  const request = getConversationMessages(userId).then(value => {
    if (syncSession() !== key || revision !== version) return { messages: [], hasMore: false };
    snapshots.delete(userId);
    snapshots.set(userId, { value, at: Date.now() });
    while (snapshots.size > 5) snapshots.delete(snapshots.keys().next().value!);
    return value;
  }).finally(() => {
    if (requests.get(userId) === request) requests.delete(userId);
  });
  requests.set(userId, request);
  return request;
}
