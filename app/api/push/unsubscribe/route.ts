import { NextResponse } from 'next/server';
import { unsubscribeFromClient } from '@/lib/push';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (typeof body?.endpoint !== 'string') {
      return NextResponse.json({ ok: false, error: 'endpoint is required' }, { status: 400 });
    }
    await unsubscribeFromClient(body.endpoint);
    return NextResponse.json({ ok: true }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
