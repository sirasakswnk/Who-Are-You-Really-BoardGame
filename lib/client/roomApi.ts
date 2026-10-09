export interface TokenUser { uid: string; getIdToken(forceRefresh?: boolean): Promise<string> }
export class RoomApiError extends Error {
  constructor(message: string, readonly status = 0, readonly retryable = true, readonly uncertain = false, readonly retryAfterMs = 0) { super(message); }
}
function message(status: number, error: unknown): string {
  if (typeof error === 'string' && /[\u0e00-\u0e7f]/.test(error)) return error;
  if (status === 401) return 'ยืนยันตัวตนไม่สำเร็จ กรุณาลองเชื่อมต่อใหม่';
  if (status === 403) return 'คุณไม่มีสิทธิ์เข้าห้องนี้';
  if (status === 404) return 'ไม่พบห้องนี้ กรุณาตรวจสอบรหัสห้อง';
  if (status === 410) return 'ห้องนี้หมดอายุแล้ว กรุณาสร้างห้องใหม่';
  if (status === 429) return 'ส่งคำขอถี่เกินไป กรุณารอหนึ่งนาทีแล้วลองใหม่';
  if (status >= 500) return 'server ยังยืนยันผลไม่ได้ กรุณาตรวจสถานะหรือลองคำขอเดิมอีกครั้ง';
  return 'คำสั่งนี้ใช้กับสถานะปัจจุบันไม่ได้ กรุณาโหลดสถานะห้องใหม่';
}

/** Refresh exactly once on 401, preserving the serialized POST body. */
export function createRoomApi(getUser: () => TokenUser | null, expectedUid: string, transport: typeof fetch = fetch, timeoutMs = 12_000) {
  return async (url: string, body?: unknown, signal?: AbortSignal): Promise<unknown> => {
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) controller.abort();
    const timer = setTimeout(abort, timeoutMs);
    const serialized = body === undefined ? undefined : JSON.stringify(body);
    let posted = false;
    const aborted = new Promise<never>((_, reject) => {
      controller.signal.addEventListener('abort', () => reject(new RoomApiError('การเชื่อมต่อขาดหายหรือหมดเวลา กรุณาตรวจสถานะแล้วลองคำขอเดิม', 0, true, posted)), { once: true });
    });
    const attempt = async () => {
      for (let index = 0; index < 2; index++) {
        const user = getUser();
        if (!user || user.uid !== expectedUid) throw new RoomApiError('บัญชีผู้เล่นเปลี่ยนไป กรุณากลับเข้าห้องด้วยบัญชีเดิม', 401, false);
        const token = await user.getIdToken(index === 1);
        if (controller.signal.aborted) throw new RoomApiError('การเชื่อมต่อถูกยกเลิก', 0, true, posted);
        if (getUser()?.uid !== expectedUid) throw new RoomApiError('บัญชีผู้เล่นเปลี่ยนไป กรุณากลับเข้าห้องด้วยบัญชีเดิม', 401, false);
        posted = body !== undefined;
        const response = await transport(url, {
          method: body === undefined ? 'GET' : 'POST', cache: 'no-store', signal: controller.signal,
          headers: { Authorization: `Bearer ${token}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, body: serialized,
        });
        if (response.status === 401 && index === 0) { await response.body?.cancel(); continue; }
        let data: Record<string, unknown> | null = null;
        try { data = await response.json(); } catch { /* Non-JSON errors are mapped to a safe message. */ }
        if (!response.ok) throw new RoomApiError(message(response.status, data?.error), response.status,
          response.status === 401 || response.status === 429 || response.status >= 500 || data?.retryable === true,
          posted && response.status >= 500, response.status === 429 ? 60_000 : 0);
        if (!data || (posted && data.success !== true)) throw new RoomApiError('ได้รับข้อมูลไม่สมบูรณ์ กรุณาตรวจสถานะห้องอีกครั้ง', 502, true, posted);
        return data;
      }
    };
    try {
      if (controller.signal.aborted) throw new RoomApiError('การเชื่อมต่อถูกยกเลิก');
      return await Promise.race([attempt(), aborted]);
    } catch (error) {
      if (error instanceof RoomApiError) throw error;
      throw new RoomApiError('เชื่อมต่อ server ไม่สำเร็จ กรุณาตรวจสถานะแล้วลองคำขอเดิม', 0, true, posted);
    } finally {
      clearTimeout(timer); signal?.removeEventListener('abort', abort);
    }
  };
}
