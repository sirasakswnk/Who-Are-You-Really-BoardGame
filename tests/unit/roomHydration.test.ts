import { beforeEach, describe, expect, it } from 'vitest';
import { createRoomService, memoryRooms } from '../helpers/testClient';
import { decodeRoomRecord, InvalidRoomDataError } from '../../lib/server/roomSchema';
import { fakeRTDB } from '../helpers/fakeRTDB';

let db: ReturnType<typeof fakeRTDB>;
const service = () => createRoomService(db.store());
beforeEach(() => { db = fakeRTDB(); memoryRooms.clear(); });

describe('Room service database hydration (REST store, actual SDK serialization)', () => {
  it('joins seat 1 after a single-player room is reloaded from the database', async () => {
    const { code } = await service().createRoom('host', 'หนึ่ง', 'cat');
    expect(memoryRooms.size).toBe(0);
    expect(await service().joinRoom(code, 'guest', 'สอง', 'fox')).toEqual({ success: true, seat: 1 });
    const room = decodeRoomRecord(db.values.get(`rooms/${code}`), code)!;
    expect(room.schemaVersion).toBe(1);
    expect(room.server.gameState.seats[1]?.uid).toBe('guest');
  });
  it('can resume and submit an answer after an active round with empty answer fields reloads', async () => {
    const { code } = await service().createRoom('host', 'หนึ่ง', 'cat');
    await service().joinRoom(code, 'guest', 'สอง', 'fox');
    await service().setPlayerReady(code, 'host', true);
    await service().setPlayerReady(code, 'guest', true);
    await service().startMatch(code, 'host');
    await service().dispatchGameAction(code, 'host', 'role-host', { type: 'ROLE_ACK', seat: 0 });
    await service().dispatchGameAction(code, 'guest', 'role-guest', { type: 'ROLE_ACK', seat: 1 });
    const room = decodeRoomRecord(db.values.get(`rooms/${code}`), code)!;
    const optionId = room.server.gameState.currentRound!.scenarios[0].options[0].id;
    const resumed = await service().getRoomProjections(code, 'host');
    expect(resumed.private).toMatchObject({ committedAnswer: null, answerSubmitted: false, roleAcknowledged: true });
    expect(await service().dispatchGameAction(code, 'host', 'answer-host', {
      type: 'SUBMIT_ANSWER', seat: 0, clueIndex: 0, optionId,
    })).toEqual({ success: true });
    expect((await service().getRoomProjections(code, 'host')).private.committedAnswer).toBe(optionId);
  });
  it('does not treat a malformed persisted room as missing or cache/write it', async () => {
    const { code } = await service().createRoom('host', 'หนึ่ง', 'cat');
    const room = decodeRoomRecord(db.values.get(`rooms/${code}`), code)!;
    Reflect.deleteProperty(room.server.gameState, 'matchScores');
    db.put(`rooms/${code}`, room);
    const writes = db.roomWrites;
    await expect(service().joinRoom(code, 'guest', 'สอง', 'fox')).rejects.toBeInstanceOf(InvalidRoomDataError);
    expect(memoryRooms.size).toBe(0);
    expect(db.roomWrites).toBe(writes);
  });
  it('keeps missing rooms distinct from schema errors', async () => {
    expect(await service().joinRoom('EMPTY2', 'guest', 'สอง', 'fox')).toEqual({ success: false, error: 'Room not found or expired' });
    expect(db.roomWrites).toBe(0);
  });
});
