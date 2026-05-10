import { NextResponse } from 'next/server';
import { loadBotFeed } from '@/lib/scraper';
import { getState, setState } from '@/lib/store';
import { inScrapeWindowJst } from '@/lib/clock';
import type { BotState } from '@/lib/types';

export const runtime = 'nodejs';

function emptyState(): BotState {
  return {
    snapshot: null,
    latestEventKey: null,
    lastUpdateAt: null,
    events: [],
    notificationsEnabled: false,
  };
}

export async function GET() {
  try {
    if (!inScrapeWindowJst()) {
      const state = await getState();
      return NextResponse.json({ ok: true, skipped: true, state }, { headers: { 'cache-control': 'no-store' } });
    }

    const current = await getState();
    const feed = await loadBotFeed();
    const next: BotState = {
      ...emptyState(),
      ...current,
      snapshot: feed.snapshot,
      lastUpdateAt: new Date().toISOString(),
      events: feed.plays,
      latestEventKey: feed.plays[0]?.key ?? current.latestEventKey,
    };

    await setState(next);

    return NextResponse.json({ ok: true, snapshot: next.snapshot, events: next.events, updatedAt: next.lastUpdateAt }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
