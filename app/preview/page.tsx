import { Suspense } from 'react';
import type { Metadata } from 'next';
import AvatarSprite from '@/components/AvatarSprite';
import DeskSprite from '@/components/DeskSprite';
import DeskScene from '@/components/DeskScene';
import GamePreview from '@/components/preview/GamePreview';
import { SCENARIOS, stripEditorial } from '@/content/scenarios';

export const metadata: Metadata = {
  title: 'UI Preview — Who Are You Really?',
  description: 'ดูหน้าตัวอย่างของเกมสำหรับออกแบบ UI',
  robots: { index: false, follow: false },
};

export default function PreviewPage() {
  // Only public scenario text crosses the client boundary, never editorial data.
  const scenarios = SCENARIOS.slice(0, 4).map(stripEditorial);

  return (
    <>
      <AvatarSprite />
      <DeskSprite />
      <DeskScene />
      <Suspense fallback={<p className="detective-loading">กำลังเปิดหน้าตัวอย่าง...</p>}>
        <GamePreview scenarios={scenarios} />
      </Suspense>
    </>
  );
}
