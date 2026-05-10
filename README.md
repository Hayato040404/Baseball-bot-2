# NPB Live Bot

スポーツナビの NPB 日程ページから DeNA 戦を見つけ、試合トップとテキスト速報を監視する Next.js / PWA アプリです。

## 追加したもの

- 14:00〜22:00 JST の間だけスクレイピング
- ブラウザ寄りのヘッダで取得
- 得点が変わったときだけバックグラウンド Push 通知
- Vercel KV による状態保存と Push 購読保存
- モバイル対応 UI

## 必須環境変数

- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`（任意、例 `mailto:you@example.com`）
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`（クライアント用。`VAPID_PUBLIC_KEY` と同じ値でOK）

## VAPID キー作成

`web-push` のキー生成機能で作成します。

```bash
npx web-push generate-vapid-keys
```

## Vercel Cron

`/api/cron` を 15 分ごとに実行します。

## 仕組み

1. `/api/cron` が日程ページから DeNA 戦リンクを探す
2. 試合トップからスコアを読む
3. テキスト速報を取得して差分を保持
4. 前回からスコアが変わったら Push を送る
5. Service Worker が通知を表示する
