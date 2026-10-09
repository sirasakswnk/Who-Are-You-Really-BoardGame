import { roomJson } from '@/lib/server/roomJson';
import { verifyAuthToken } from '@/lib/server/auth';
import { joinRoom } from '@/lib/server/roomService';
import { roomHttpError } from '@/lib/server/roomHttpError';
import { fields, profile, readBody, roomCode } from '@/lib/server/commandSchema';


export async function POST(req: Request) {
  try {
    const auth = await verifyAuthToken(req);
    if (!auth) {
      return roomJson(
        {
          error:
            'Unauthorized: ไม่สามารถยืนยันตัวตนได้ (โปรดตรวจสอบ /api/diagnostics ว่า FIREBASE_CLIENT_EMAIL และ FIREBASE_PRIVATE_KEY บน Vercel พร้อมใช้งานหรือไม่)',
        },
        { status: 401 }
      );
    }

    const body = fields(await readBody(req), ['code', 'displayName', 'avatarId']);
    const code = roomCode(body.code);
    const { displayName, avatarId } = profile(body.displayName, body.avatarId);

    const result = await joinRoom(code, auth.uid, displayName, avatarId);
    if (!result.success) {
      return roomJson({ error: result.error }, { status: result.status ?? 403 });
    }

    return roomJson(
      { code, seat: result.seat },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  } catch (err: unknown) {
    return roomHttpError(err);
  }
}
