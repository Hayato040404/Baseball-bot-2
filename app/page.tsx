'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { BotState, PlayEvent } from '@/lib/types';
import { getPublicVapidKey, publicKeyToUint8Array } from '@/lib/push-client';

const fmt = new Intl.DateTimeFormat('ja-JP', {
  dateStyle: 'medium',
  timeStyle: 'medium',
});

function scoreText(n: number | null) {
  return n === null ? '—' : String(n);
}

export default function Page() {
  const [state, setState] = useState<BotState | null>(null);
  const [loading, setLoading] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [pushStatus, setPushStatus] = useState<'idle' | 'subscribed' | 'unsupported' | 'error'>('idle');
  const initializedRef = useRef(false);
  const snapshot = state?.snapshot ?? null;
  const sortedEvents = useMemo(() => state?.events ?? [], [state]);

  async function refreshState() {
    try {
      const live = await fetch('/api/live', { cache: 'no-store' });
      const data = await live.json();
      if (data?.ok && data.snapshot) {
        const nextState: BotState = {
          snapshot: data.snapshot,
          events: data.events ?? [],
          latestEventKey: data.events?.[0]?.key ?? null,
          lastUpdateAt: data.updatedAt ?? new Date().toISOString(),
          notificationsEnabled: false,
        };
        setState(nextState);
      } else {
        const res = await fetch('/api/state', { cache: 'no-store' });
        const fallback = (await res.json()) as BotState;
        setState(fallback);
      }
      if (!initializedRef.current) initializedRef.current = true;
    } finally {
      setLoading(false);
    }
  }

  async function enableNotifications() {
    if (typeof Notification === 'undefined') return;
    const result = await Notification.requestPermission();
    setPermission(result);
  }

  async function subscribePush() {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || typeof Notification === 'undefined') {
        setPushStatus('unsupported');
        return;
      }
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);
      if (permissionResult !== 'granted') return;

      const vapid = getPublicVapidKey();
      if (!vapid) {
        setPushStatus('unsupported');
        return;
      }

      const reg = await navigator.serviceWorker.register('/sw.js');
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: publicKeyToUint8Array(vapid),
        });
      }

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      if (!res.ok) throw new Error(await res.text());
      setPushStatus('subscribed');
    } catch {
      setPushStatus('error');
    }
  }

  useEffect(() => {
    refreshState();
    const timer = setInterval(refreshState, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  return (
    <main>
      <div className="shell">
        <section className="hero">
          <div className="kicker">NPB LIVE BOT</div>
          <h1 className="title">スポーツナビの一球・テキスト速報を自動監視</h1>
          <p className="sub">
            日程ページからDeNA戦を見つけ、試合トップとテキスト速報を取得して、得点変化時はPush通知を飛ばします。
          </p>
        </section>

        <section className="grid">
          <div className="card">
            <div className="row" style={{ marginBottom: 12 }}>
              <h2>試合スコア</h2>
              <span className="state">{snapshot?.status ?? (loading ? '読み込み中' : '未取得')}</span>
            </div>

            <div className="scoreboard">
              <div className="team">
                <div className="name">{snapshot?.homeTeam ?? 'ホーム'}</div>
                <div className="score">{scoreText(snapshot?.homeScore ?? null)}</div>
              </div>
              <div className="center">
                <div style={{ fontSize: 34, fontWeight: 800 }}>—</div>
                <div className="badge">vs</div>
              </div>
              <div className="team" style={{ justifyItems: 'end' }}>
                <div className="name">{snapshot?.awayTeam ?? 'アウェイ'}</div>
                <div className="score">{scoreText(snapshot?.awayScore ?? null)}</div>
              </div>
            </div>

            <div className="meta" style={{ marginTop: 12 }}>
              <div>試合ページ: {snapshot?.gameUrl ?? '—'}</div>
              <div>速報ページ: {snapshot?.textUrl ?? '—'}</div>
              <div>最終更新: {state?.lastUpdateAt ? fmt.format(new Date(state.lastUpdateAt)) : '—'}</div>
            </div>

            <div className="actions" style={{ marginTop: 14 }}>
              <button className="btn primary" onClick={enableNotifications}>
                通知権限を付与
              </button>
              <button className="btn primary" onClick={subscribePush}>
                バックグラウンドPushを有効化
              </button>
              <button className="btn" onClick={refreshState}>
                最新状態を再取得
              </button>
            </div>

            <p className="sub" style={{ marginTop: 12, fontSize: 13 }}>
              通知権限: {permission} / Push: {pushStatus}
            </p>
          </div>

          <div className="card">
            <div className="row" style={{ marginBottom: 12 }}>
              <h2>監視中のプレイ</h2>
              <span className="badge">{sortedEvents.length}件</span>
            </div>

            <div className="feed">
              {sortedEvents.slice(0, 8).length ? (
                sortedEvents.slice(0, 8).map((play) => (
                  <article className="play" key={play.key}>
                    <div className="inning">{play.inning}</div>
                    <div className="text">{play.text}</div>
                  </article>
                ))
              ) : (
                <article className="play">
                  <div className="text">まだデータがありません。Vercel Cron が15分ごとに /api/cron を叩くと更新されます。</div>
                </article>
              )}
            </div>
          </div>
        </section>

        <section className="card">
          <h2>運用メモ</h2>
          <div className="meta">
            <div>・Push通知には VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY が必要です。</div>
            <div>・Vercel KV があれば購読データと状態を永続化できます。</div>
            <div>・スクレイピングは 14:00〜22:00 JST の間だけ実行する前提です。</div>
          </div>
        </section>

        <div className="footer">NPB Live Bot / mobile ready / Vercel deploy target</div>
      </div>
    </main>
  );
}
