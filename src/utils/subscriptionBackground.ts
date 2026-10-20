import { getBackgroundPolicy, scheduleBackgroundTask } from './backgroundTasks';

let pending: Promise<typeof import('../components/ui/GradientASCII')> | undefined;

export function loadSubscriptionBackground() {
  pending ??= import('../components/ui/GradientASCII').catch(error => {
    pending = undefined;
    throw error;
  });
  return pending;
}

export function scheduleSubscriptionBackground() {
  if (pending || getBackgroundPolicy().constrained) return () => {};
  return scheduleBackgroundTask('subscription:background', loadSubscriptionBackground);
}
