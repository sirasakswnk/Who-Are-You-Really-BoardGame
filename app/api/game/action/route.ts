import { NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/server/auth';
import { dispatchGameAction, memoryRooms } from '@/lib/server/roomService';
import { GameAction } from '@/lib/game/types';


export async function POST(req: Request) {
  const auth = await verifyAuthToken(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized: missing or invalid token' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const code = typeof body.code === 'string' ? body.code.toUpperCase().trim() : '';
    const actionId = typeof body.actionId === 'string' ? body.actionId.trim() : '';
    const rawAction = body.action;

    if (!code || !actionId || !rawAction) {
      return NextResponse.json(
        { error: 'Missing required fields: code, actionId, or action' },
        { status: 400 }
      );
    }

    const room = memoryRooms.get(code);
    if (!room || !room.members[auth.uid]) {
      return NextResponse.json({ error: 'Player or room not found' }, { status: 404 });
    }

    const seat = room.members[auth.uid].seat;

    // Attach caller's seat to action to guarantee authenticity
    const gameAction: GameAction = {
      ...rawAction,
      seat,
    };

    const result = await dispatchGameAction(code, auth.uid, actionId, gameAction);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true }, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
