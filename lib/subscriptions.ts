import { kv } from '@vercel/kv';

export type StoredPushSubscription = {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export type PushSubscriptionInput = {
  endpoint?: string;
  expirationTime?: number | null;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

const KEY = 'npb:push-subs';

declare global {
  // eslint-disable-next-line no-var
  var __NPB_PUSH_SUBS__: StoredPushSubscription[] | undefined;
}

function useKV(): boolean {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

function getMemorySubs(): StoredPushSubscription[] {
  if (!globalThis.__NPB_PUSH_SUBS__) {
    globalThis.__NPB_PUSH_SUBS__ = [];
  }
  return globalThis.__NPB_PUSH_SUBS__;
}

export async function getSubscriptions(): Promise<StoredPushSubscription[]> {
  if (useKV()) {
    const list = await kv.get<StoredPushSubscription[]>(KEY);
    return Array.isArray(list) ? list : [];
  }
  return [...getMemorySubs()];
}

export async function saveSubscriptions(subs: StoredPushSubscription[]): Promise<void> {
  if (useKV()) {
    await kv.set(KEY, subs);
    return;
  }
  globalThis.__NPB_PUSH_SUBS__ = [...subs];
}

export async function addSubscription(sub: StoredPushSubscription): Promise<void> {
  const subs = await getSubscriptions();
  const next = subs.filter((s) => s.endpoint !== sub.endpoint);
  next.unshift(sub);
  await saveSubscriptions(next);
}

export async function removeSubscription(endpoint: string): Promise<void> {
  const subs = await getSubscriptions();
  const next = subs.filter((s) => s.endpoint !== endpoint);
  await saveSubscriptions(next);
}
