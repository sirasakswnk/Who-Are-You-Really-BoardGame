import React from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import HomeCard from '@/components/HomeCard';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/lib/firebase/client', () => ({ ensureAnonymousAuth: vi.fn() }));

afterEach(() => { vi.unstubAllGlobals(); });

it('keeps the initial markup identical with a saved profile and an invite URL', () => {
  const serverHtml = renderToString(React.createElement(HomeCard));
  const getItem = vi.fn(() => JSON.stringify({ name: 'นักสืบ', avatar: 'fox' }));
  const setItem = vi.fn();
  vi.stubGlobal('localStorage', { getItem, setItem });
  vi.stubGlobal('window', { location: { search: '?room=K7M2QP' } });

  const initialClientHtml = renderToString(React.createElement(HomeCard));
  expect(initialClientHtml).toBe(serverHtml);
  expect(initialClientHtml).toContain('data-state="idle"');
  expect(getItem).not.toHaveBeenCalled();
  expect(setItem).not.toHaveBeenCalled();
});
