import { runRefreshCycle } from './refresh';

declare global {
  // eslint-disable-next-line no-var
  var __NPB_SERVER_SCHEDULER_STARTED__: boolean | undefined;
  // eslint-disable-next-line no-var
  var __NPB_SERVER_SCHEDULER_TIMER__: ReturnType<typeof setInterval> | undefined;
  // eslint-disable-next-line no-var
  var __NPB_SERVER_SCHEDULER_RUNNING__: boolean | undefined;
}

async function tick() {
  if (globalThis.__NPB_SERVER_SCHEDULER_RUNNING__) return;
  globalThis.__NPB_SERVER_SCHEDULER_RUNNING__ = true;
  try {
    await runRefreshCycle({ allowPush: true });
  } catch (error) {
    console.error('[npb-scheduler] refresh failed:', error);
  } finally {
    globalThis.__NPB_SERVER_SCHEDULER_RUNNING__ = false;
  }
}

export function ensureServerSchedulerStarted() {
  if (globalThis.__NPB_SERVER_SCHEDULER_STARTED__) return;

  globalThis.__NPB_SERVER_SCHEDULER_STARTED__ = true;
  void tick();

  globalThis.__NPB_SERVER_SCHEDULER_TIMER__ = setInterval(() => {
    void tick();
  }, 15 * 60 * 1000);

  globalThis.__NPB_SERVER_SCHEDULER_TIMER__?.unref?.();
}
