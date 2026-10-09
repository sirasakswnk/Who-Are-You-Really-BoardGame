import { ROLE_IDS, type DecisionAction } from '../game/types';
import type { ActionContext, ActionEnvelope, ClientCommand } from '../game/commands';
import { RoomServiceError } from './roomErrors';

const bad = (): never => { throw new RoomServiceError('ข้อมูลคำขอไม่ถูกต้อง กรุณาโหลดสถานะห้องใหม่', 400); };
const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : bad();
export function fields(value: unknown, allowed: readonly string[]): Record<string, unknown> {
  const data = object(value);
  if (Object.keys(data).some(key => !allowed.includes(key))) bad();
  return data;
}
function text(value: unknown, max: number): string {
  if (typeof value !== 'string' || !value.length || value.length > max || /[\u0000-\u001f\u007f]/.test(value)) bad();
  return value as string;
}
export function roomCode(value: unknown): string {
  if (typeof value !== 'string' || value.length > 12) bad();
  const code = (value as string).trim().toUpperCase();
  return /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/.test(code) ? code : bad();
}
export function profile(name: unknown, avatar: unknown) {
  const displayName = text(typeof name === 'string' ? name.trim() : name, 40);
  if (Array.from(displayName).length > 20) bad();
  if (typeof avatar !== 'string' || !['cat', 'fox', 'bear', 'rabbit', 'frog', 'owl', 'duck', 'robot'].includes(avatar)) bad();
  return { displayName, avatarId: avatar as string };
}
export function createRequestId(value: unknown): string | undefined {
  if (value === undefined) return undefined; // Existing F02 creation identities remain compatible.
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value) ? value : bad();
}
export const CONTEXT_FIELDS = ['actionId', 'matchId', 'roundId', 'clueIndex'] as const;
export function parseContext(value: unknown): ActionContext {
  const data = fields(value, CONTEXT_FIELDS);
  const actionId = text(data.actionId, 36).toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(actionId)) bad();
  const matchId = text(data.matchId, 128);
  const roundId = data.roundId === null ? null : text(data.roundId, 160);
  if (!Number.isInteger(data.clueIndex) || Number(data.clueIndex) < 0 || Number(data.clueIndex) > 3) bad();
  return { actionId, matchId, roundId, clueIndex: data.clueIndex as number };
}
export function contextFromBody(data: Record<string, unknown>): ActionContext {
  return parseContext(Object.fromEntries(CONTEXT_FIELDS.map(key => [key, data[key]])));
}
function decision(value: unknown): DecisionAction {
  const data = object(value);
  if (data.type === 'guess') {
    fields(data, ['type', 'roleId']);
    if (!ROLE_IDS.includes(data.roleId as typeof ROLE_IDS[number])) bad();
    return { type: 'guess', roleId: data.roleId as typeof ROLE_IDS[number] };
  }
  fields(data, ['type']);
  return data.type === 'continue' || data.type === 'ack' ? { type: data.type } : bad();
}
export function parseCommand(value: unknown, lobby = false): ClientCommand {
  const data = object(value);
  switch (data.type) {
    case 'PLAYER_READY':
      fields(data, ['type', 'ready']);
      if (!lobby || typeof data.ready !== 'boolean') bad();
      return { type: 'PLAYER_READY', ready: data.ready as boolean };
    case 'PLAYER_LEAVE':
      fields(data, ['type']);
      return lobby ? { type: 'PLAYER_LEAVE' } : bad();
    case 'START_MATCH':
      fields(data, ['type']);
      return lobby ? { type: 'START_MATCH' } : bad();
    case 'SUBMIT_ANSWER':
      fields(data, ['type', 'optionId']);
      return { type: 'SUBMIT_ANSWER', optionId: text(data.optionId, 128) };
    case 'SUBMIT_DECISION':
      fields(data, ['type', 'decision']);
      return { type: 'SUBMIT_DECISION', decision: decision(data.decision) };
    case 'ROLE_ACK': case 'REVEAL_ACK': case 'NEXT_ROUND_READY': case 'REMATCH_REQUEST':
      fields(data, ['type']);
      return { type: data.type };
    default: return bad();
  }
}
export function parseEnvelope(value: unknown, lobby = false): ActionEnvelope {
  const data = fields(value, [...CONTEXT_FIELDS, 'action']);
  return { ...contextFromBody(data), action: parseCommand(data.action, lobby) };
}

export const MAX_REQUEST_BYTES = 8 * 1024;
/** Bound actual bytes, including chunked requests; Content-Length is not trusted. */
export async function readBody(req: Request): Promise<unknown> {
  if (Number(req.headers.get('content-length')) > MAX_REQUEST_BYTES) throw new RoomServiceError('คำขอมีขนาดใหญ่เกินไป', 413);
  if (!req.body) return bad();
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_REQUEST_BYTES) { void reader.cancel().catch(() => {}); throw new RoomServiceError('คำขอมีขนาดใหญ่เกินไป', 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); } catch { return bad(); }
}
