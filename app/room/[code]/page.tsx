import { Suspense } from 'react';
import type { Metadata } from 'next';
import AvatarSprite from '@/components/AvatarSprite';
import DeskSprite from '@/components/DeskSprite';
import DeskScene from '@/components/DeskScene';
import GameContainer from '@/components/game/GameContainer';
import { RoomLoadingView } from '@/components/game/RoomAccessViews';

interface RoomPageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: RoomPageProps): Promise<Metadata> {
  const { code } = await params;
  return {
    title: `ห้อง ${code.toUpperCase()} — Who Are You Really?`,
    description: 'เว็บเกมสืบหาตัวตน ตอบตามบทบาทลับ จับตัวตนเพื่อนให้ได้',
  };
}

async function RoomContent({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const roomCode = code.toUpperCase().trim();

  return (
    <div className="room-page-layout">
      <GameContainer roomCode={roomCode} />
    </div>
  );
}

export default function RoomPage({ params }: RoomPageProps) {
  return (
    <>
      {/* SVG Sprites */}
      <AvatarSprite />
      <DeskSprite />
      <DeskScene />

      {/* Game App Container with Suspense boundary for Next.js 16 prerendering */}
      <Suspense fallback={<RoomLoadingView />}>
        <RoomContent params={params} />
      </Suspense>
    </>
  );
}
