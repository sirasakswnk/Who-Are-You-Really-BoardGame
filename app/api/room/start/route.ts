import { roomJson } from '@/lib/server/roomJson';
import { verifyAuthToken } from '@/lib/server/auth';
import { startMatch } from '@/lib/server/roomService';
import { roomHttpError } from '@/lib/server/roomHttpError';
import { CONTEXT_FIELDS, contextFromBody, fields, readBody, roomCode } from '@/lib/server/commandSchema';


export async function POST(req: Request) {
  const auth = await verifyAuthToken(req);
  if (!auth) {
    return roomJson({ error: 'Unauthorized: missing or invalid token' }, { status: 401 });
  }

  try {
    const body = fields(await readBody(req), ['code', ...CONTEXT_FIELDS]);
    const result = await startMatch(roomCode(body.code), auth.uid, contextFromBody(body));
    if (!result.success) {
      return roomJson({ error: result.error }, { status: result.status ?? 400 });
    }

    return roomJson({ success: true }, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err: unknown) {
    return roomHttpError(err);
  }
}
