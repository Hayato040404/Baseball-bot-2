import { NextResponse } from 'next/server';
import { loadBotFeed } from '@/lib/scraper';
import { getState, setState } from '@/lib/store';
import type { BotState, PlayEvent } from '@/lib/types';
import { createScorePush, sendPushToAll } from '@/lib/push';
import { inScrapeWindowJst } from '@/lib/clock';

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

function scoreChanged(
  prev: { homeScore: number | null; awayScore: number | null } | null,
  next: { homeScore: number | null; awayScore: number | null }
) {
  if (!prev) return false;
  return prev.homeScore !== next.homeScore || prev.awayScore !== next.awayScore;
}

export async function GET() {
  try {
    if (!inScrapeWindowJst()) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'outside_scrape_window' }, { headers: { 'cache-control': 'no-store' } });
    }

    const current = await getState();
    const feed = await loadBotFeed();
    const previousKey = current.latestEventKey;
    const previousSnapshot = current.snapshot;
    const events = feed.plays;

    let newEvents: PlayEvent[] = [];
    let latestKey = previousKey;

    if (!previousKey) {
      latestKey = events[0]?.key ?? null;
    } else {
      const idx = events.findIndex((e) => e.key === previousKey);
      if (idx >= 0) {
        newEvents = events.slice(0, idx);
        latestKey = events[0]?.key ?? previousKey;
      } else {
        latestKey = events[0]?.key ?? previousKey;
      }
    }

    const next: BotState = {
      ...emptyState(),
      ...current,
      snapshot: feed.snapshot,
      latestEventKey: latestKey,
      lastUpdateAt: new Date().toISOString(),
      events,
    };

    await setState(next);

    const didScoreChange = scoreChanged(previousSnapshot, feed.snapshot);
    const newestPlay = newEvents[0] ?? events[0] ?? null;
    const pushResult = didScoreChange ? await sendPushToAll(createScorePush(feed.snapshot, newestPlay)) : { sent: 0, removed: 0 };

    return NextResponse.json(
      {
        ok: true,
        updatedAt: next.lastUpdateAt,
        snapshot: next.snapshot,
        newEvents,
        totalEvents: events.length,
        latestEventKey: latestKey,
        scoreChanged: didScoreChange,
        push: pushResult,
      },
      { headers: { 'cache-control': 'no-store' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
