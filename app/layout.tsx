import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NPB Live Bot',
  description: 'スポーツナビのNPB試合を監視して、得点とテキスト速報を表示するPWA',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'NPB Live Bot',
    statusBarStyle: 'black-translucent',
  },
};

export const viewport: Viewport = {
  themeColor: '#05070c',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
