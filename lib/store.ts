import { kv } from '@vercel/kv';
import type { BotState } from './types';

const DEFAULT_STATE: BotState = {
  snapshot: null,
  latestEventKey: null,
  lastUpdateAt: null,
  events: [],
  notificationsEnabled: false,
};

declare global {
  // eslint-disable-next-line no-var
  var __NPB_BOT_STATE__: BotState | undefined;
}

function getMemoryState(): BotState {
  if (!globalThis.__NPB_BOT_STATE__) {
    globalThis.__NPB_BOT_STATE__ = structuredClone(DEFAULT_STATE);
  }
  return globalThis.__NPB_BOT_STATE__;
}

function useKV() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

export async function getState(): Promise<BotState> {
  if (useKV()) {
    const state = await kv.get<BotState>('npb:state');
    return state ?? structuredClone(DEFAULT_STATE);
  }
  return getMemoryState();
}

export async function setState(state: BotState): Promise<void> {
  if (useKV()) {
    await kv.set('npb:state', state);
    return;
  }
  globalThis.__NPB_BOT_STATE__ = state;
}

export async function patchState(patch: Partial<BotState>): Promise<BotState> {
  const current = await getState();
  const next = { ...current, ...patch };
  await setState(next);
  return next;
}
