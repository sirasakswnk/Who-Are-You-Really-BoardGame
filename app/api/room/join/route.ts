import { NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/server/auth';
import { joinRoom } from '@/lib/server/roomService';


export async function POST(req: Request) {
  const auth = await verifyAuthToken(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized: missing or invalid token' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const code = typeof body.code === 'string' ? body.code.toUpperCase().trim() : '';
    const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : 'Player 2';
    const avatarId = typeof body.avatarId === 'string' ? body.avatarId : 'fox';

    if (!code) {
      return NextResponse.json({ error: 'Missing room code' }, { status: 400 });
    }

    const result = await joinRoom(code, auth.uid, displayName, avatarId);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 403 });
    }

    return NextResponse.json(
      { code, seat: result.seat },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
