import { createHash, randomInt, randomUUID } from 'node:crypto';
import { LEGACY_CONTENT_VERSION, stateContentVersion, type GameAction, type Scenario } from '../game/types';
import { createInitialGameState, processAction } from '../game/engine';
import { generateRolePair } from '../game/roles';
import { selectMatchDeck } from './deck';
import { ROOM_SCHEMA_VERSION, type RoomRecord } from './roomRecord';
import { buildProjections } from './roomProjection';
import { decodeRoomRecord, InvalidRoomDataError } from './roomSchema';
import { getRoomStore, type RoomStore, type TransactionUpdate } from './roomStore';
import type { ActionContext } from '../game/commands';
import { parseEnvelope, profile, roomCode, createRequestId } from './commandSchema';
import { RoomServiceError } from './roomErrors';
import { enforceRateLimit } from './rateLimit';
import { ROOM_TTL } from './roomMaintenance';

export type { RoomRecord } from './roomRecord';
export { buildProjections } from './roomProjection';
export { memoryRooms } from './roomStore';
export { RoomServiceError } from './roomErrors';

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function generateRoomCode(): string {
  return Array.from({ length: 6 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');
}
type ActionResult = { success: boolean; error?: string; status?: number };
const fail = (error: string, status?: number): TransactionUpdate<ActionResult> => ({ result: { success: false, error, ...(status ? { status } : {}) } });
const success: ActionResult = { success: true };
const withoutRevision = (view: object) => {
  const { revision: _revision, ...content } = view as Record<string, unknown>;
  void _revision;
  return JSON.stringify(content);
};

/** State, projections and receipts are committed at the same room CAS boundary. */
function prepareCommit(previous: RoomRecord | null, next: RoomRecord): RoomRecord {
  const views = buildProjections(next.code, next.server.gameState, next.members);
  views.public.revision = (previous?.public.revision ?? 0) +
    (!previous || withoutRevision(previous.public) !== withoutRevision(views.public) ? 1 : 0);
  for (const [uid, view] of Object.entries(views.private)) {
    const before = previous?.private[uid];
    view.revision = (before?.revision ?? 0) + (!before || withoutRevision(before) !== withoutRevision(view) ? 1 : 0);
  }
  return { ...next, ...views, server: { ...next.server, revision: (previous?.server.revision ?? 0) + 1 } };
}
function creationRequest(value: unknown): { code: string; fingerprint: string; createdAt: number } {
  if (!value || typeof value !== 'object') throw new InvalidRoomDataError();
  const data = value as Record<string, unknown>;
  if (typeof data.code !== 'string' || !/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/.test(data.code) ||
      typeof data.fingerprint !== 'string' || typeof data.createdAt !== 'number' || !Number.isSafeInteger(data.createdAt)) throw new InvalidRoomDataError();
  return { code: data.code, fingerprint: data.fingerprint, createdAt: data.createdAt };
}

/** Independent service instances carry no shared room state. */
export function createRoomService(store: RoomStore, options: {
  codeGenerator?: () => string; clock?: () => number;
  rolePair?: typeof generateRolePair; deck?: () => Scenario[][];
} = {}) {
  const codeGenerator = options.codeGenerator ?? generateRoomCode;
  const clock = options.clock ?? Date.now;
  const roles = options.rolePair ?? generateRolePair;
  const deckForMatch = options.deck ?? selectMatchDeck;
  const mutate = (code: string, change: (room: RoomRecord | null) => TransactionUpdate<ActionResult>) =>
    store.transact(`rooms/${code}`, raw => change(decodeRoomRecord(raw, code)));
  function memberError(room: RoomRecord | null, uid: string, now: number): string | null {
    if (!room) return 'Room not found';
    if (!Object.hasOwn(room.members, uid)) return 'Not a member of this room';
    if (now >= room.server.expiresAt) return 'Room expired';
    return null;
  }
  async function execute(codeInput: string, uid: string, input: unknown, lobby = false): Promise<ActionResult> {
    const code = roomCode(codeInput);
    const envelope = parseEnvelope(input, lobby);
    const { actionId, matchId, roundId, clueIndex, action } = envelope;
    const now = clock();
    await enforceRateLimit(store, uid, lobby ? 'room' : 'game', now);
    // Stable material is prepared once, outside the CAS callback.
    const rolePair = action.type === 'NEXT_ROUND_READY' || action.type === 'START_MATCH' ? roles() : undefined;
    const legacyRolePair = action.type === 'NEXT_ROUND_READY' ? roles(Math.random, LEGACY_CONTENT_VERSION) : undefined;
    const deck = action.type === 'START_MATCH' ? deckForMatch() : undefined;
    const nextMatchId = action.type === 'REMATCH_REQUEST' ? randomUUID() : undefined;
    const key = createHash('sha256').update(JSON.stringify([uid, actionId])).digest('hex');
    const fingerprint = createHash('sha256').update(JSON.stringify(envelope)).digest('hex');
    return mutate(code, room => {
      const commitTime = clock();
      if (!room) return fail('Room not found');
      if (commitTime >= room.server.expiresAt) return fail('Room expired', 410);
      // Only leave receipts remain usable after membership is removed.
      if (action.type !== 'PLAYER_LEAVE') {
        const error = memberError(room, uid, commitTime);
        if (error) return fail(error);
      }
      // A replay is checked before context/phase: a successful command may have advanced them.
      const receipt = room.server.receipts[key];
      if (receipt) {
        return receipt.uid === uid && receipt.type === action.type && receipt.matchId === matchId &&
          receipt.roundId === roundId && receipt.clueIndex === clueIndex && receipt.fingerprint === fingerprint
          ? { result: success } : fail('Duplicate actionId with mismatched payload');
      }
      if (!Object.hasOwn(room.members, uid)) return fail('Not a member of this room');
      const state = room.server.gameState;
      if (state.matchId !== matchId || (action.type !== 'PLAYER_LEAVE' && (room.public.roundId !== roundId || state.clueIndex !== clueIndex))) {
        return fail('คำสั่งมาจากเกม รอบ หรือข้อเก่า กรุณาโหลดสถานะห้องใหม่');
      }
      if (action.type === 'START_MATCH' && !room.members[uid].isHost) return fail('Only host can start the match');
      const seat = room.members[uid].seat;
      let command: GameAction;
      switch (action.type) {
        case 'START_MATCH': command = { type: 'START_MATCH', rolePair, scenarios: deck![0] }; break;
        case 'NEXT_ROUND_READY': command = { type: action.type, seat, nextRolePair: stateContentVersion(state) === LEGACY_CONTENT_VERSION ? legacyRolePair : rolePair, nextScenarios: room.server.matchDeck?.[state.roundIndex + 1] }; break;
        case 'REMATCH_REQUEST': command = { type: action.type, seat, nextMatchId }; break;
        case 'SUBMIT_ANSWER': case 'REVEAL_ACK': case 'SUBMIT_DECISION': command = { ...action, seat, clueIndex }; break;
        default: command = { ...action, seat };
      }
      const result = processAction(state, command);
      if (!result.success) return fail(result.error!);
      if (action.type !== 'PLAYER_LEAVE' && Object.keys(room.server.receipts).length >= 4096) return fail('ห้องนี้รับคำสั่งครบจำนวนแล้ว กรุณาสร้างห้องใหม่');
      const members = action.type === 'PLAYER_LEAVE'
        ? Object.fromEntries(result.state.seats.filter(seat => seat !== null).map(player => [player.uid, {
          uid: player.uid, displayName: player.displayName, avatarId: player.avatarId, seat: player.seat, isHost: player.isHost,
        }])) : room.members;
      const next = prepareCommit(room, {
        ...room, members, server: {
          ...room.server, gameState: result.state,
          expiresAt: JSON.stringify(state) !== JSON.stringify(result.state)
            ? Math.max(room.server.expiresAt, commitTime + ROOM_TTL) : room.server.expiresAt,
          matchDeck: action.type === 'START_MATCH' ? deck! : result.state.phase === 'LOBBY' && action.type === 'REMATCH_REQUEST' ? null : room.server.matchDeck,
          receipts: { ...room.server.receipts, [key]: { timestamp: commitTime, type: action.type, uid, matchId, roundId, clueIndex, fingerprint } },
        },
      });
      return { value: next, result: success };
    });
  }
  return {
    async createRoom(hostUid: string, displayName: string, avatarId: string, requestId: string = randomUUID()): Promise<{ code: string; seat: 0 }> {
      ({ displayName, avatarId } = profile(displayName, avatarId));
      createRequestId(requestId);
      const now = clock();
      await enforceRateLimit(store, hostUid, 'create', now);
      const fingerprint = createHash('sha256').update(JSON.stringify([hostUid, displayName, avatarId])).digest('hex');
      const key = createHash('sha256').update(JSON.stringify([hostUid, requestId])).digest('hex');
      const path = `roomCreationRequests/${key}`;
      const initialCode = codeGenerator();
      let reservation = await store.transact(path, raw => {
        if (raw === null) {
          const value = { code: initialCode, fingerprint, createdAt: now };
          return { value, result: value };
        }
        const current = creationRequest(raw);
        if (current.fingerprint !== fingerprint) throw new RoomServiceError('คำขอสร้างห้องเดิมมีข้อมูลไม่ตรงกัน', 409);
        return { result: current };
      });
      const matchId = randomUUID();
      for (let attempt = 0; attempt < 10; attempt++) {
        if (now >= reservation.createdAt + ROOM_TTL) throw new RoomServiceError('คำขอสร้างห้องหมดอายุ กรุณาสร้างคำขอใหม่', 410);
        const code = reservation.code;
        const gameState = processAction(createInitialGameState(code, matchId), {
          type: 'PLAYER_JOIN', seat: 0, uid: hostUid, displayName, avatarId, isHost: true,
        }).state;
        const members: RoomRecord['members'] = { [hostUid]: { uid: hostUid, displayName, avatarId, seat: 0, isHost: true } };
        const candidate = prepareCommit(null, {
          schemaVersion: ROOM_SCHEMA_VERSION, code, members, ...buildProjections(code, gameState, members),
          server: {
            gameState, matchDeck: null, receipts: {}, expiresAt: reservation.createdAt + ROOM_TTL,
            creation: { uid: hostUid, requestId, fingerprint },
          },
        });
        const claimed = await store.transact(`rooms/${code}`, raw => {
          if (clock() >= candidate.server.expiresAt) throw new RoomServiceError('คำขอสร้างห้องหมดอายุ กรุณาสร้างคำขอใหม่', 410);
          if (raw === null) return { value: candidate, result: true };
          const existing = raw as { server?: { creation?: RoomRecord['server']['creation'] } };
          const receipt = existing.server?.creation;
          if (receipt?.uid === hostUid && receipt.requestId === requestId && receipt.fingerprint === fingerprint) {
            const room = decodeRoomRecord(raw, code)!;
            if (clock() >= room.server.expiresAt) throw new RoomServiceError('Room expired', 410);
            return { result: true };
          }
          return { result: false }; // Occupied/malformed rooms are never overwritten.
        });
        if (claimed) return { code, seat: 0 };
        const nextCode = codeGenerator();
        reservation = await store.transact(path, raw => {
          const current = creationRequest(raw);
          if (current.code !== code) return { result: current };
          const value = { ...current, code: nextCode };
          return { value, result: value };
        });
      }
      throw new RoomServiceError('ยังจองรหัสห้องไม่ได้ กรุณาลองคำขอเดิมอีกครั้ง', 503, true);
    },
    async joinRoom(code: string, uid: string, displayName: string, avatarId: string): Promise<ActionResult & { seat?: 0 | 1 }> {
      code = roomCode(code);
      ({ displayName, avatarId } = profile(displayName, avatarId));
      const now = clock();
      await enforceRateLimit(store, uid, 'room', now);
      return store.transact<ActionResult & { seat?: 0 | 1 }>(`rooms/${code}`, raw => {
        const commitTime = clock();
        const room = decodeRoomRecord(raw, code);
        if (!room) return fail('Room not found or expired');
        if (commitTime >= room.server.expiresAt) return fail('Room expired', 410);
        if (room.server.gameState.phase === 'CLOSED') return fail('ห้องนี้ปิดแล้ว กรุณาสร้างห้องใหม่');
        if (Object.hasOwn(room.members, uid)) return { result: { success: true, seat: room.members[uid].seat } };
        if (room.server.gameState.phase !== 'LOBBY') return fail('ไม่สามารถเข้าร่วมแทนผู้เล่นระหว่างเกมหรือเกมที่ยุติแล้ว');
        const seat = room.server.gameState.seats.findIndex(player => player === null) as 0 | 1 | -1;
        if (seat === -1) return fail('ห้องเต็มแล้ว (เล่นได้สูงสุด 2 คน)');
        const result = processAction(room.server.gameState, { type: 'PLAYER_JOIN', seat, uid, displayName, avatarId, isHost: false });
        if (!result.success) return fail(result.error!);
        const next = prepareCommit(room, {
          ...room, members: { ...room.members, [uid]: { uid, displayName, avatarId, seat, isHost: false } },
          server: { ...room.server, gameState: result.state, expiresAt: Math.max(room.server.expiresAt, commitTime + ROOM_TTL) },
        });
        return { value: next, result: { success: true, seat } };
      });
    },
    async setPlayerReady(code: string, uid: string, ready: boolean, context: ActionContext): Promise<ActionResult> {
      return execute(code, uid, { ...context, action: { type: 'PLAYER_READY', ready } }, true);
    },
    async startMatch(code: string, uid: string, context: ActionContext): Promise<ActionResult> {
      return execute(code, uid, { ...context, action: { type: 'START_MATCH' } }, true);
    },
    async leaveRoom(code: string, uid: string, context: ActionContext): Promise<ActionResult> {
      return execute(code, uid, { ...context, action: { type: 'PLAYER_LEAVE' } }, true);
    },
    async dispatchGameAction(code: string, uid: string, envelope: unknown): Promise<ActionResult> {
      return execute(code, uid, envelope);
    },
    async getRoomProjections(code: string, uid: string) {
      code = roomCode(code);
      await enforceRateLimit(store, uid, 'read', clock());
      const room = decodeRoomRecord(await store.read(`rooms/${code}`), code);
      if (!room) throw new RoomServiceError('Room not found', 404);
      if (!Object.hasOwn(room.members, uid)) throw new RoomServiceError('Not a member of this room', 403);
      if (clock() >= room.server.expiresAt) throw new RoomServiceError('Room expired', 410);
      const member = room.members[uid];
      return { public: room.public, private: room.private[uid], seat: member.seat, isHost: member.isHost };
    },
  };
}
export const createRoom = (uid: string, name: string, avatar: string, requestId?: string) => createRoomService(getRoomStore()).createRoom(uid, name, avatar, requestId);
export const joinRoom = (code: string, uid: string, name: string, avatar: string) => createRoomService(getRoomStore()).joinRoom(code, uid, name, avatar);
export const setPlayerReady = (code: string, uid: string, ready: boolean, context: ActionContext) => createRoomService(getRoomStore()).setPlayerReady(code, uid, ready, context);
export const startMatch = (code: string, uid: string, context: ActionContext) => createRoomService(getRoomStore()).startMatch(code, uid, context);
export const leaveRoom = (code: string, uid: string, context: ActionContext) => createRoomService(getRoomStore()).leaveRoom(code, uid, context);
export const dispatchGameAction = (code: string, uid: string, envelope: unknown) => createRoomService(getRoomStore()).dispatchGameAction(code, uid, envelope);
export const getRoomProjections = (code: string, uid: string) => createRoomService(getRoomStore()).getRoomProjections(code, uid);
