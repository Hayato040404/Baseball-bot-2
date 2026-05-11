import webpush from 'web-push';
import type { GameSnapshot, PlayEvent } from './types';
import {
  addSubscription,
  getSubscriptions,
  removeSubscription,
  type StoredPushSubscription,
} from './subscriptions';

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
};

let configured = false;

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

function configureWebPush() {
  if (configured) return;

  const publicKey = requireEnv('VAPID_PUBLIC_KEY');
  const privateKey = requireEnv('VAPID_PRIVATE_KEY');
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

function base64UrlToUint8Array(base64Url: string) {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = Buffer.from(base64, 'base64');
  return new Uint8Array(raw);
}

export function getPublicVapidKey() {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || '';
}

export function isPushReady() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export async function subscribeFromClient(subscription: PushSubscriptionJSON) {
  if (!subscription.endpoint) {
    throw new Error('Push subscription endpoint is missing.');
  }

  if (!subscription.keys?.p256dh || !subscription.keys?.auth) {
    throw new Error('Push subscription keys are missing.');
  }

  const sub: StoredPushSubscription = {
    endpoint: subscription.endpoint,
    expirationTime: subscription.expirationTime ?? null,
    keys: {
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
  };

  await addSubscription(sub);
}

export async function unsubscribeFromClient(endpoint: string) {
  await removeSubscription(endpoint);
}

export async function sendPushToAll(payload: PushPayload) {
  if (!isPushReady()) return { sent: 0, removed: 0 };

  configureWebPush();

  const subs = await getSubscriptions();
  let sent = 0;
  let removed = 0;
  const serialized = JSON.stringify(payload);

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            expirationTime: sub.expirationTime ?? undefined,
            keys: sub.keys,
          },
          serialized
        );
        sent += 1;
      } catch (error: any) {
        const status = error?.statusCode;
        if (status === 404 || status === 410) {
          await removeSubscription(sub.endpoint);
          removed += 1;
        }
      }
    })
  );

  return { sent, removed };
}

export function createScorePush(snapshot: GameSnapshot, newest?: PlayEvent | null): PushPayload {
  const home = snapshot.homeTeam;
  const away = snapshot.awayTeam;
  const hs = snapshot.homeScore ?? 0;
  const as = snapshot.awayScore ?? 0;

  const body = newest
    ? `${home} ${hs} - ${as} ${away}\n${newest.inning} ${newest.team ? `/${newest.team}` : ''} ${newest.text}`
    : `${home} ${hs} - ${as} ${away}`;

  return {
    title: `得点が更新されました ${hs}-${as}`,
    body,
    url: snapshot.textUrl,
    tag: `npb-score-${snapshot.gameUrl}`,
    data: {
      gameUrl: snapshot.gameUrl,
      textUrl: snapshot.textUrl,
      homeTeam: home,
      awayTeam: away,
      homeScore: snapshot.homeScore,
      awayScore: snapshot.awayScore,
    },
  };
}

export function toPushSubscriptionJson(raw: unknown): PushSubscriptionJSON {
  const sub = raw as PushSubscriptionJSON;
  if (!sub || typeof sub.endpoint !== 'string' || !sub.keys) {
    throw new Error('Invalid push subscription');
  }
  return sub;
}

export function publicKeyToUint8Array(key: string) {
  return base64UrlToUint8Array(key);
}
