# NPB Live Bot

スポーツナビの NPB 日程ページから DeNA 戦を見つけ、試合トップとテキスト速報を監視する Next.js / PWA アプリです。

## 変更点

- 14:00〜22:00 JST の間だけスクレイピング
- ブラウザ寄りのヘッダで取得
- 得点が変わったときだけバックグラウンド Push 通知
- Web service のサーバー内で 15 分ごとに巡回
- モバイル対応 UI

## 必須環境変数

Render ではダッシュボードの Environment Variables で設定します。

- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_SUBJECT`（任意、例 `mailto:you@example.com`）

ローカル開発では `.env.local` を使ってOKです。

## ローカル用 `.env.local`

```env
KV_REST_API_URL=
KV_REST_API_TOKEN=
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_SUBJECT=mailto:you@example.com
```

## VAPID キー作成

```bash
npx web-push generate-vapid-keys
```

`VAPID_PUBLIC_KEY` と `NEXT_PUBLIC_VAPID_PUBLIC_KEY` には同じ公開鍵を入れます。`VAPID_PRIVATE_KEY` はサーバー側専用です。

## Render での動かし方

`render.yaml` は Web service のみを定義しています。初回アクセス時にサーバー巡回を開始し、その後 15 分ごとに更新します。

## 仕組み

1. 初回アクセス時にサーバー内スケジューラを起動
2. 日程ページから DeNA 戦リンクを探す
3. 試合トップからスコアを読む
4. テキスト速報を取得して差分を保持
5. 前回からスコアが変わったら Push を送る
6. Service Worker が通知を表示する
