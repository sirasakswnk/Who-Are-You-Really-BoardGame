import { NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/server/auth';
import { createRoom } from '@/lib/server/roomService';


export async function POST(req: Request) {
  const auth = await verifyAuthToken(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized: missing or invalid token' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : 'Player 1';
    const avatarId = typeof body.avatarId === 'string' ? body.avatarId : 'cat';

    const result = await createRoom(auth.uid, displayName, avatarId);

    return NextResponse.json(result, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
