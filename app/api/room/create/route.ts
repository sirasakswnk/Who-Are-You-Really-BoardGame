import { NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/server/auth';
import { createRoom } from '@/lib/server/roomService';


export async function POST(req: Request) {
  try {
    const auth = await verifyAuthToken(req);
    if (!auth) {
      return NextResponse.json(
        {
          error:
            'Unauthorized: ไม่สามารถยืนยันตัวตนได้ (โปรดตรวจสอบ /api/diagnostics ว่า FIREBASE_CLIENT_EMAIL และ FIREBASE_PRIVATE_KEY บน Vercel พร้อมใช้งานหรือไม่)',
        },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : 'Player 1';
    const avatarId = typeof body.avatarId === 'string' ? body.avatarId : 'cat';

    const result = await createRoom(auth.uid, displayName, avatarId);

    return NextResponse.json(result, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err: unknown) {
    console.error('POST /api/room/create error:', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
