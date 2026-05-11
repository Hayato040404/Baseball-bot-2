'use client';

import { useEffect, useMemo, useState } from 'react';
import type { BotState, PlayEvent } from '@/lib/types';
import { getPublicVapidKey, publicKeyToUint8Array } from '@/lib/push-client';

const timeFmt = new Intl.DateTimeFormat('ja-JP', {
  dateStyle: 'medium',
  timeStyle: 'medium',
});

function scoreText(n: number | null | undefined) {
  return n === null || n === undefined ? '—' : String(n);
}

function safeFormatDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : timeFmt.format(date);
}

function statusTone(status?: string | null) {
  const s = (status ?? '').toLowerCase();
  if (s.includes('試合中') || s.includes('live') || s.includes('進行')) return 'live';
  if (s.includes('終了') || s.includes('終了しました')) return 'done';
  if (s.includes('中止') || s.includes('中断')) return 'warn';
  return 'idle';
}

function badgeLabel(status?: string | null) {
  const tone = statusTone(status);
  if (tone === 'live') return 'LIVE';
  if (tone === 'done') return 'FINAL';
  if (tone === 'warn') return 'CHECK';
  return 'READY';
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="miniStat">
      <div className="miniStatLabel">{label}</div>
      <div className="miniStatValue">{value}</div>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  variant = 'ghost',
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void | Promise<void>;
  variant?: 'ghost' | 'primary';
  disabled?: boolean;
}) {
  return (
    <button
      className={`actionButton ${variant === 'primary' ? 'primary' : ''}`}
      onClick={() => void onClick()}
      disabled={disabled}
      type="button"
    >
      {children}
    </button>
  );
}

function PlayCard({ play, index }: { play: PlayEvent; index: number }) {
  return (
    <article className="playCard">
      <div className="playCardTop">
        <span className="playRank">#{index + 1}</span>
        <span className="playInning">{play.inning}</span>
      </div>
      <div className="playText">{play.text}</div>
      <div className="playMeta">
        <span>{play.team || '—'}</span>
        <span>{play.number ?? '—'}</span>
      </div>
    </article>
  );
}

export default function Page() {
  const [state, setState] = useState<BotState | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [pushStatus, setPushStatus] = useState<'idle' | 'subscribed' | 'unsupported' | 'error'>(
    'idle'
  );
  const [error, setError] = useState<string | null>(null);

  const snapshot = state?.snapshot ?? null;
  const sortedEvents = useMemo(() => state?.events ?? [], [state]);
  const latestPlay = sortedEvents[0] ?? null;
  const tone = statusTone(snapshot?.status);
  const lastUpdated = safeFormatDate(state?.lastUpdateAt);
  const eventCount = sortedEvents.length;

  async function refreshState() {
    setRefreshing(true);
    setError(null);
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
        if (!res.ok) throw new Error(`state fetch failed: ${res.status}`);
        const fallback = (await res.json()) as BotState;
        setState(fallback);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '状態の取得に失敗しました');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function enableNotifications() {
    if (typeof Notification === 'undefined') return;
    const result = await Notification.requestPermission();
    setPermission(result);
  }

  async function subscribePush() {
    try {
      if (
        !('serviceWorker' in navigator) ||
        !('PushManager' in window) ||
        typeof Notification === 'undefined'
      ) {
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
    void refreshState();
    const timer = setInterval(() => {
      void refreshState();
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  return (
    <main className="pageShell">
      <div className="ambient ambientA" />
      <div className="ambient ambientB" />
      <div className="container">
        <header className="topBar">
          <div className="brandMark">
            <div className="brandDot" />
            <div>
              <div className="brandName">NPB Live Bot</div>
              <div className="brandSub">Render web service / PWA / push</div>
            </div>
          </div>

          <div className={`liveBadge ${tone}`}>
            <span className="liveDot" />
            <span>{badgeLabel(snapshot?.status)}</span>
          </div>
        </header>

        <section className="heroPanel">
          <div className="heroCopy">
            <div className="eyebrow">Baseball, distilled.</div>
            <h1>一球速報を、静かに美しく、即座に届ける。</h1>
            <p>
              スポーツナビの日程ページからDeNA戦を見つけ、試合トップとテキスト速報を巡回。
              得点が動いた瞬間だけ、バックグラウンド Push で通知します。
            </p>

            <div className="heroStats">
              <MiniStat label="最終更新" value={lastUpdated} />
              <MiniStat label="監視プレイ" value={`${eventCount}件`} />
              <MiniStat label="通知" value={pushStatus} />
            </div>

            {error ? <div className="errorBanner">{error}</div> : null}

            <div className="heroActions">
              <ActionButton variant="primary" onClick={refreshState} disabled={refreshing}>
                {refreshing ? '更新中…' : '最新状態を再取得'}
              </ActionButton>
              <ActionButton onClick={enableNotifications}>通知権限を付与</ActionButton>
              <ActionButton onClick={subscribePush}>Pushを有効化</ActionButton>
            </div>
          </div>

          <div className="scoreGlass">
            <div className="scoreHeader">
              <div>
                <div className="scoreLabel">LIVE SCORE</div>
                <div className="scoreTitle">{snapshot?.title ?? '試合を取得中'}</div>
              </div>
              <div className="scoreChip">{snapshot?.status ?? (loading ? '読み込み中' : '未取得')}</div>
            </div>

            <div className="scoreboard">
              <div className="teamCard home">
                <div className="teamKind">HOME</div>
                <div className="teamName">{snapshot?.homeTeam ?? 'ホーム'}</div>
                <div className="teamScore">{scoreText(snapshot?.homeScore)}</div>
              </div>

              <div className="versusOrb" aria-hidden="true">
                <div className="versusLine" />
                <div className="versusText">VS</div>
              </div>

              <div className="teamCard away">
                <div className="teamKind">AWAY</div>
                <div className="teamName">{snapshot?.awayTeam ?? 'アウェイ'}</div>
                <div className="teamScore">{scoreText(snapshot?.awayScore)}</div>
              </div>
            </div>

            <div className="scoreMeta">
              <div>
                <span className="metaLabel">試合ページ</span>
                <a href={snapshot?.gameUrl ?? '#'} target="_blank" rel="noreferrer">
                  {snapshot?.gameUrl ?? '—'}
                </a>
              </div>
              <div>
                <span className="metaLabel">速報ページ</span>
                <a href={snapshot?.textUrl ?? '#'} target="_blank" rel="noreferrer">
                  {snapshot?.textUrl ?? '—'}
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="contentGrid">
          <section className="panel panelWide">
            <div className="sectionHead">
              <div>
                <div className="sectionKicker">TEXT FEED</div>
                <h2>監視中のプレイ</h2>
              </div>
              <div className="countPill">{eventCount}件</div>
            </div>

            <div className="feedList">
              {sortedEvents.length ? (
                sortedEvents.slice(0, 8).map((play, index) => (
                  <PlayCard play={play} index={index} key={play.key} />
                ))
              ) : (
                <div className="emptyState">
                  まだデータがありません。サーバーの巡回でテキスト速報を読み込み次第、ここに流れます。
                </div>
              )}
            </div>
          </section>

          <aside className="panel sidePanel">
            <div className="sectionHead">
              <div>
                <div className="sectionKicker">NOW</div>
                <h2>現在の状態</h2>
              </div>
            </div>

            <div className="sideStack">
              <MiniStat label="通知権限" value={permission} />
              <MiniStat label="Push状態" value={pushStatus} />
              <MiniStat label="状態" value={snapshot?.status ?? '—'} />
              <MiniStat label="最終更新URL" value={snapshot?.textUrl ? 'あり' : '—'} />
            </div>

            <div className="noteBox">
              <div className="noteTitle">運用メモ</div>
              <ul>
                <li>Push通知は VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY が必要です。</li>
                <li>購読は KV_REST_API_URL / KV_REST_API_TOKEN で永続化します。</li>
                <li>スクレイピングは 14:00〜22:00 JST だけ動かします。</li>
              </ul>
            </div>

            {latestPlay ? (
              <div className="latestMini">
                <div className="sectionKicker">LATEST</div>
                <div className="latestText">{latestPlay.text}</div>
              </div>
            ) : null}
          </aside>
        </section>

        <footer className="footerBar">
          <span>mobile ready</span>
          <span>·</span>
          <span>Render web service</span>
          <span>·</span>
          <span>Apple-like UI refresh</span>
        </footer>
      </div>
    </main>
  );
}
