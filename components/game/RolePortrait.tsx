import Image from 'next/image';
import type { ActiveRoleId, RoleId } from '@/lib/game/types';
import RoleObjectArt from './RoleObjectArt';
import styles from './RolePortrait.module.css';

const ROLE_PORTRAITS: Partial<Record<RoleId, string>> = {
  alien: '/images/roles/alien.webp',
  spy: '/images/roles/spy.webp',
  vampire: '/images/roles/vampire.webp',
  time_traveler: '/images/roles/time_traveler.webp',
  thief: '/images/roles/thief.webp',
  ghost: '/images/roles/ghost.webp',
} satisfies Record<ActiveRoleId, string>;

export default function RolePortrait({ role, className, sizes = '96px' }: {
  role: RoleId;
  className?: string;
  sizes?: string;
}) {
  const src = ROLE_PORTRAITS[role];
  const portraitClass = `${styles.portrait} ${className ?? ''}`;
  // Retained rooms with the old catalog must not acquire a new role's portrait.
  if (!src) return <RoleObjectArt role={role} className={portraitClass} />;

  return <Image src={src} width={512} height={512} sizes={sizes}
    className={portraitClass} alt="" data-role-portrait={role} />;
}
