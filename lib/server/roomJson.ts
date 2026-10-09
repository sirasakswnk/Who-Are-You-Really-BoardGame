import { NextResponse } from 'next/server';

/** Every room response, including auth/validation errors, bypasses caches. */
export function roomJson(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set('Cache-Control', 'no-store');
  return NextResponse.json(body, { ...init, headers });
}
