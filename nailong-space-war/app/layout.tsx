import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '奶龙打飞机｜太空作战试玩',
  description: '化身觉醒宇宙飞行能力的奶龙，在霓虹星海中突破敌阵、升级武器并挑战巨型 Boss。',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
