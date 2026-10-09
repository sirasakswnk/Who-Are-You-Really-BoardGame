import { roomJson } from '@/lib/server/roomJson';
import { verifyAuthToken } from '@/lib/server/auth';
import { createRoom } from '@/lib/server/roomService';
import { roomHttpError } from '@/lib/server/roomHttpError';
import { fields, profile, readBody, createRequestId } from '@/lib/server/commandSchema';


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

    const body = fields(await readBody(req), ['displayName', 'avatarId', 'requestId']);
    const { displayName, avatarId } = profile(body.displayName, body.avatarId);
    const requestId = createRequestId(body.requestId);
    const result = await createRoom(auth.uid, displayName, avatarId, requestId);

    return roomJson(result, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err: unknown) {
    return roomHttpError(err);
  }
}
