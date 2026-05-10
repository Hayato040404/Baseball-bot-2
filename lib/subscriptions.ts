import { kv } from '@vercel/kv';

export type StoredPushSubscription = PushSubscriptionJSON & {
  endpoint: string;
};

const KEY = 'npb:push-subs';

declare global {
  // eslint-disable-next-line no-var
  var __NPB_PUSH_SUBS__: StoredPushSubscription[] | undefined;
}

function useKV() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

function getMemorySubs(): StoredPushSubscription[] {
  if (!globalThis.__NPB_PUSH_SUBS__) globalThis.__NPB_PUSH_SUBS__ = [];
  return globalThis.__NPB_PUSH_SUBS__;
}

export async function getSubscriptions(): Promise<StoredPushSubscription[]> {
  if (useKV()) {
    return (await kv.get<StoredPushSubscription[]>(KEY)) ?? [];
  }
  return getMemorySubs();
}

export async function saveSubscriptions(subs: StoredPushSubscription[]): Promise<void> {
  if (useKV()) {
    await kv.set(KEY, subs);
    return;
  }
  globalThis.__NPB_PUSH_SUBS__ = subs;
}

export async function addSubscription(sub: StoredPushSubscription): Promise<void> {
  const subs = await getSubscriptions();
  const filtered = subs.filter((s) => s.endpoint !== sub.endpoint);
  filtered.unshift(sub);
  await saveSubscriptions(filtered);
}

export async function removeSubscription(endpoint: string): Promise<void> {
  const subs = await getSubscriptions();
  await saveSubscriptions(subs.filter((s) => s.endpoint !== endpoint));
}
