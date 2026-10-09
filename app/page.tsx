import AvatarSprite from '@/components/AvatarSprite';
import DeskSprite from '@/components/DeskSprite';
import DeskScene from '@/components/DeskScene';
import HomeCard from '@/components/HomeCard';

/**
 * Home page – the entry point of Who Are You Really?
 * Server component that composes the SVG sprites + client-side HomeCard.
 */
export default function HomePage() {
  return (
    <>
      <AvatarSprite />
      <DeskSprite />
      <DeskScene />
      <HomeCard />
    </>
  );
}
