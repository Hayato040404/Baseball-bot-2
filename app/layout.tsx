import type { Metadata } from 'next';
import './globals.css';
import { ensureServerSchedulerStarted } from '@/lib/server-scheduler';

export const metadata: Metadata = {
  title: 'NPB Live Bot',
  description: 'スポーツナビのNPB試合を監視して、得点とテキスト速報を表示するPWA',
  manifest: '/manifest.json',
  themeColor: '#0b1020',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  ensureServerSchedulerStarted();

  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
