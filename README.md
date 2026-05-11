# NPB Live Bot

Render の Web Service で動く、スポーツナビの NPB 試合監視ボットです。

## できること
- 日程ページから DeNA 戦の試合リンクを探す
- 試合トップからスコアと状態を取得する
- テキスト速報からプレイを取得する
- 得点変化時に Push 通知を送る
- モバイル対応の PWA 画面で最新情報を表示する

## 環境変数
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_SUBJECT`（任意）

## ローカル
```bash
yarn install
yarn dev
```

`.env.local` に上記を設定してください。

## Render
- Web Service を作成
- Build Command: `yarn install && yarn build`
- Start Command: `yarn start`
- Environment Variables を設定

## 補足
- スクレイピングは 14:00〜22:00 JST の間だけ動きます
- サーバー巡回は `/api/live` が呼ばれたタイミングで起動します


## UI
Apple-like glassmorphism dashboard with a large hero panel, live score glass card, and vertical text feed.
