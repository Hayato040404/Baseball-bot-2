import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NPB Live Bot',
  description: 'スポーツナビのNPB試合を監視して、得点とテキスト速報を表示するPWA',
  manifest: '/manifest.json',
  themeColor: '#0b1020',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
