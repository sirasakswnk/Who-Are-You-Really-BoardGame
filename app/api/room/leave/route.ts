import { roomJson } from '@/lib/server/roomJson';
import { verifyAuthToken } from '@/lib/server/auth';
import { leaveRoom } from '@/lib/server/roomService';
import { roomHttpError } from '@/lib/server/roomHttpError';
import { CONTEXT_FIELDS, contextFromBody, fields, readBody, roomCode } from '@/lib/server/commandSchema';

export async function POST(req: Request) {
  const auth = await verifyAuthToken(req);
  if (!auth) return roomJson({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = fields(await readBody(req), ['code', ...CONTEXT_FIELDS]);
    const result = await leaveRoom(roomCode(body.code), auth.uid, contextFromBody(body));
    if (!result.success) return roomJson({ error: result.error }, { status: result.status ?? 400 });
    return roomJson({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return roomHttpError(error); }
}
