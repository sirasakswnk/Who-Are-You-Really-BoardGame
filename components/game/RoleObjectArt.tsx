import type { ReactNode } from 'react';
import type { RoleId } from '@/lib/game/types';

// Decorative objects only: the role name and complete description remain text.
const OBJECTS: Partial<Record<RoleId, ReactNode>> = {
  alien: (
    <>
      <path d="M41 43c0-23 30-23 30 0" fill="var(--identity-tint)" />
      <path d="M47 36c2-6 7-9 12-9" stroke="var(--paper)" strokeWidth="4" />
      <ellipse cx="56" cy="48" rx="34" ry="11" fill="var(--identity-accent)" />
      <path d="M29 51c7 14 47 14 54 0" fill="var(--identity-tint)" />
      <path d="M42 62 32 78m38-16 10 16" />
      <path d="M44 66h24l9 18H35Z" fill="var(--identity-tint)" stroke="none" opacity=".7" />
      <circle cx="40" cy="48" r="2.5" fill="var(--paper)" stroke="none" />
      <circle cx="56" cy="50" r="2.5" fill="var(--paper)" stroke="none" />
      <circle cx="72" cy="48" r="2.5" fill="var(--paper)" stroke="none" />
    </>
  ),
  spy: (
    <g transform="rotate(-7 56 50)">
      <rect x="35" y="20" width="45" height="49" rx="4" fill="var(--paper)" />
      <path d="M45 30h23m-23 8h16m-16 8h23" stroke="var(--identity-accent)" />
      <rect x="20" y="40" width="73" height="41" rx="5" fill="var(--identity-tint)" />
      <path d="m23 44 33 25 34-25M23 77l24-18m42 18L65 59" />
      <circle cx="56" cy="65" r="9" fill="var(--identity-accent)" />
      <path d="m52 65 3 3 5-6" stroke="var(--paper)" />
    </g>
  ),
  vampire: (
    <>
      <path d="M88 13a14 14 0 1 0 7 22c-13 1-18-13-7-22Z" fill="var(--mustard)" />
      <path d="M54 38v41c0 13-17 13-17 1" />
      <path d="M19 57c2-31 65-31 69 0-7-7-14-7-22 0-8-7-16-7-23 0-9-7-16-7-24 0Z" fill="var(--identity-accent)" />
      <path d="M54 35c-9 4-13 12-11 22m11-22c8 4 13 12 12 22M54 29v6" />
      <path d="m28 72-4 5m59-9 5 5" stroke="var(--identity-accent)" />
    </>
  ),
  time_traveler: (
    <>
      <path d="M33 18c-19-5-20 21-4 21" stroke="var(--identity-accent)" />
      <rect x="48" y="13" width="16" height="10" rx="3" fill="var(--identity-accent)" />
      <circle cx="56" cy="54" r="32" fill="var(--identity-accent)" />
      <circle cx="56" cy="54" r="24" fill="var(--paper)" />
      <path d="M56 35v4m0 30v4M37 54h4m30 0h4m-32-13 3 3m20 20 3 3m0-26-3 3M43 67l3-3" />
      <path d="M56 42v12l12 6" strokeWidth="3" />
      <circle cx="56" cy="54" r="3" fill="var(--identity-accent)" />
    </>
  ),
  thief: (
    <>
      <path d="m21 38 15-18h40l15 18-35 45Z" fill="var(--identity-tint)" />
      <path d="m21 38 35 45 14-45Zm70 0L56 83 42 38Z" fill="var(--identity-accent)" />
      <path d="M21 38h70M36 20l6 18 14-18 14 18 6-18M42 38l14 45 14-45" />
      <path d="m83 69 2-5 2 5 5 2-5 2-2 5-2-5-5-2Z" fill="var(--mustard)" stroke="none" />
      <path d="M28 14v7m-3-3h6" stroke="var(--identity-accent)" />
    </>
  ),
  ghost: (
    <>
      <path d="M58 14c-6-1-9 6-3 9l3 2m0 0L31 37h54Z" stroke="var(--identity-accent)" />
      <path d="M37 34c11-7 28-7 38 0l9 48-13-6-10 7-10-7-14 6 4-25-15 9Z" fill="var(--paper)" />
      <path d="m50 38-4 25m19-24 4 28" stroke="var(--identity-accent)" opacity=".6" />
      <ellipse cx="52" cy="47" rx="2" ry="3" fill="var(--identity-accent)" stroke="none" />
      <ellipse cx="65" cy="47" rx="2" ry="3" fill="var(--identity-accent)" stroke="none" />
      <path d="m90 44 2-5 2 5 5 2-5 2-2 5-2-5-5-2Z" fill="var(--identity-accent)" stroke="none" />
    </>
  ),
};

const LEGACY_OBJECT = (
  <>
    <path d="M23 28h28l8 9h29v43H23Z" fill="var(--identity-tint)" />
    <rect x="36" y="22" width="39" height="48" rx="4" fill="var(--paper)" />
    <path d="M45 35h21m-21 8h15m-15 8h21M23 47h65v33H23Z" fill="var(--identity-accent)" />
    <rect x="47" y="57" width="23" height="10" rx="2" fill="var(--paper)" />
  </>
);

export default function RoleObjectArt({ role, className }: { role: RoleId; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 112 96" fill="none" aria-hidden="true" focusable="false">
      <circle cx="56" cy="49" r="39" fill="var(--identity-tint)" opacity=".75" />
      <ellipse cx="56" cy="86" rx="32" ry="4" fill="currentColor" opacity=".08" />
      <path d="M13 24h6m-3-3v6m78 48h5m-2.5-2.5v5" stroke="var(--identity-accent)" strokeWidth="2" strokeLinecap="round" opacity=".7" />
      <g stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
        {OBJECTS[role] ?? LEGACY_OBJECT}
      </g>
    </svg>
  );
}
