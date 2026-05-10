import { NextResponse } from 'next/server';
import { runRefreshCycle } from '@/lib/refresh';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const result = await runRefreshCycle({ allowPush: true });
    return NextResponse.json(result, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
