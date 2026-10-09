import { NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/server/auth';
import { memoryRooms } from '@/lib/server/roomService';


export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const auth = await verifyAuthToken(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized: missing or invalid token' }, { status: 401 });
  }

  const { code: rawCode } = await params;
  const code = rawCode.toUpperCase().trim();

  const room = memoryRooms.get(code);
  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  if (!room.members[auth.uid]) {
    return NextResponse.json({ error: 'Not a member of this room' }, { status: 403 });
  }

  return NextResponse.json(
    {
      public: room.public,
      private: room.private[auth.uid],
      seat: room.members[auth.uid].seat,
      isHost: room.members[auth.uid].isHost,
    },
    {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    }
  );
}
