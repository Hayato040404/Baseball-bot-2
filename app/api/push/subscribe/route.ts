import { NextResponse } from 'next/server';
import { subscribeFromClient, toPushSubscriptionJson, isPushReady } from '@/lib/push';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    if (!isPushReady()) {
      return NextResponse.json({ ok: false, error: 'VAPID not configured' }, { status: 400 });
    }
    const body = await req.json();
    const subscription = toPushSubscriptionJson(body?.subscription);
    await subscribeFromClient(subscription);
    return NextResponse.json({ ok: true }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
