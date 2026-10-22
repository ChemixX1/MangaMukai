export const PROFILE_CONTENT_CHANGED_EVENT = 'mm_profile_content_changed';

export function notifyProfileContentChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent?.(new Event(PROFILE_CONTENT_CHANGED_EVENT));
}
