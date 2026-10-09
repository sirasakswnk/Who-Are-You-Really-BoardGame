import { roomJson } from '@/lib/server/roomJson';
import { verifyAuthToken } from '@/lib/server/auth';
import { getRoomProjections } from '@/lib/server/roomService';
import { roomHttpError } from '@/lib/server/roomHttpError';


export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const auth = await verifyAuthToken(req);
  if (!auth) {
    return roomJson({ error: 'Unauthorized: missing or invalid token' }, { status: 401 });
  }

  const { code: rawCode } = await params;
  const code = rawCode.toUpperCase().trim();

  try {
    return roomJson(await getRoomProjections(code, auth.uid), {
      status: 200, headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return roomHttpError(error);
  }
}
