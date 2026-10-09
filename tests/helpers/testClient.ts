import { randomUUID } from 'node:crypto';
import { beforeEach } from 'vitest';
import * as services from '../../lib/server/roomService';
import { getRoomStore, type RoomStore } from '../../lib/server/roomStore';
import type { ActionContext } from '../../lib/game/commands';
import type { GameAction } from '../../lib/game/types';

export { createRoom, joinRoom, getRoomProjections, generateRoomCode, memoryRooms } from '../../lib/server/roomService';

// F01/F02 scenarios use readable action labels. This test-only client converts
// them to UUID envelopes and retains the original context for exact retries.
const contexts = new Map<string, Promise<ActionContext>>();
beforeEach(() => contexts.clear());
function testClient(service: ReturnType<typeof services.createRoomService>) {
  async function context(code: string, uid: string, label: string = randomUUID()): Promise<ActionContext> {
    const key = JSON.stringify([code, uid, label]);
    if (!contexts.has(key)) contexts.set(key, (async () => {
      const actionId = randomUUID();
      try {
        const { public: view } = await service.getRoomProjections(code, uid);
        return { actionId, matchId: view.matchId, roundId: view.roundId, clueIndex: view.clueIndex };
      } catch (error) {
        // Membership/missing/expiry tests still reach the committed authorization check.
        if (error instanceof services.RoomServiceError && [403, 404, 410].includes(error.status)) {
          return { actionId, matchId: 'unknown', roundId: null, clueIndex: 0 };
        }
        throw error;
      }
    })());
    return contexts.get(key)!;
  }
  return {
    ...service,
    async setPlayerReady(code: string, uid: string, ready: boolean) {
      return service.setPlayerReady(code, uid, ready, await context(code, uid));
    },
    async startMatch(code: string, uid: string) {
      return service.startMatch(code, uid, await context(code, uid));
    },
    async dispatchGameAction(code: string, uid: string, label: string, action: GameAction) {
      const { seat: _seat, clueIndex: requestedClue, ...choice } = action as GameAction & { seat?: number; clueIndex?: number };
      void _seat;
      const binding = await context(code, uid, label);
      return service.dispatchGameAction(code, uid, {
        ...binding, ...(requestedClue !== undefined ? { clueIndex: requestedClue } : {}), action: choice,
      });
    },
  };
}
export const createRoomService = (store: RoomStore, options?: Parameters<typeof services.createRoomService>[1]) => testClient(services.createRoomService(store, options));
export const setPlayerReady = (code: string, uid: string, ready: boolean) => createRoomService(getRoomStore()).setPlayerReady(code, uid, ready);
export const startMatch = (code: string, uid: string) => createRoomService(getRoomStore()).startMatch(code, uid);
export const dispatchGameAction = (code: string, uid: string, id: string, action: GameAction) => createRoomService(getRoomStore()).dispatchGameAction(code, uid, id, action);
