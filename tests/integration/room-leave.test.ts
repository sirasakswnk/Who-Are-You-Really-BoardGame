import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoomService } from '../../lib/server/roomService';
import { decodeRoomRecord } from '../../lib/server/roomSchema';
import * as roomStore from '../../lib/server/roomStore';
import { fakeRTDB } from '../helpers/fakeRTDB';
import { POST } from '../../app/api/room/leave/route';
import type { ClientCommand } from '../../lib/game/commands';

let db: ReturnType<typeof fakeRTDB>;
const service = () => createRoomService(db.store(), { rolePair: () => ['saver', 'comfort'] });
const record = (code: string) => decodeRoomRecord(db.values.get(`rooms/${code}`), code)!;
function context(code: string) {
  const view = record(code).public;
  return { actionId: randomUUID(), matchId: view.matchId, roundId: view.roundId, clueIndex: view.clueIndex };
}
const command = (code: string, uid: string, action: ClientCommand) => service().dispatchGameAction(code, uid, { ...context(code), action });
beforeEach(() => { db = fakeRTDB(); vi.restoreAllMocks(); });
async function lobby(two = true) {
  const { code } = await service().createRoom('host', 'หนึ่ง', 'cat');
  if (two) await service().joinRoom(code, 'guest', 'สอง', 'fox');
  return code;
}
async function started() {
  const code = await lobby();
  await service().setPlayerReady(code, 'host', true, context(code));
  await service().setPlayerReady(code, 'guest', true, context(code));
  await service().startMatch(code, 'host', context(code)); return code;
}
async function answering() {
  const code = await started();
  await command(code, 'host', { type: 'ROLE_ACK' }); await command(code, 'guest', { type: 'ROLE_ACK' });
  return code;
}
async function deciding(code: string) {
  const optionId = record(code).public.scenario!.options[0].id;
  await command(code, 'host', { type: 'SUBMIT_ANSWER', optionId }); await command(code, 'guest', { type: 'SUBMIT_ANSWER', optionId });
  await command(code, 'host', { type: 'REVEAL_ACK' }); await command(code, 'guest', { type: 'REVEAL_ACK' });
}

describe('F05 atomic leave, lifecycle and authorization', () => {
  it('transfers host without moving seats and accepts a new seat-zero guest', async () => {
    const code = await lobby(); await service().setPlayerReady(code, 'guest', true, context(code));
    expect(await service().leaveRoom(code, 'host', context(code))).toEqual({ success: true });
    let room = record(code);
    expect(room.members.host).toBeUndefined(); expect(room.private.host).toBeUndefined();
    expect(room.public.players[0]).toBeNull(); expect(room.members.guest).toMatchObject({ seat: 1, isHost: true });
    expect(room.public.players[1]?.ready).toBe(false);
    expect(await service().joinRoom(code, 'new', 'สาม', 'owl')).toEqual({ success: true, seat: 0 });
    await service().setPlayerReady(code, 'new', true, context(code)); await service().setPlayerReady(code, 'guest', true, context(code));
    expect(await service().startMatch(code, 'new', context(code))).toMatchObject({ success: false });
    expect(await service().startMatch(code, 'guest', context(code))).toEqual({ success: true });
    room = record(code); expect(room.public.phase).toBe('ROLE_INTRO');
  });
  it('guest departure keeps the host and clears the departing private view', async () => {
    const code = await lobby(); await service().leaveRoom(code, 'guest', context(code));
    expect(record(code).members.host.isHost).toBe(true); expect(record(code).private.guest).toBeUndefined();
    expect(await service().joinRoom(code, 'new', 'สาม', 'owl')).toMatchObject({ success: true, seat: 1 });
  });
  it('closes an empty lobby without deleting the receipt or reusing its code', async () => {
    const code = await lobby(false), binding = context(code);
    await service().leaveRoom(code, 'host', binding);
    expect(record(code).public.phase).toBe('CLOSED'); expect(record(code).members).toEqual({});
    expect(await service().joinRoom(code, 'host', 'หนึ่ง', 'cat')).toMatchObject({ success: false });
    const writes = db.roomWrites;
    expect(await service().leaveRoom(code, 'host', binding)).toEqual({ success: true });
    expect(db.roomWrites).toBe(writes);
  });
  it('serializes two simultaneous lobby departures into a closed room', async () => {
    const code = await lobby(), a = context(code), b = context(code);
    const results = await Promise.all([service().leaveRoom(code, 'host', a), service().leaveRoom(code, 'guest', b)]);
    expect(results.every(result => result.success)).toBe(true); expect(record(code).public.phase).toBe('CLOSED');
    expect(db.conflicts).toBeGreaterThan(0);
  });
  it.each(['ROLE_INTRO', 'ANSWERING', 'ANSWER_REVEAL', 'DECIDING', 'ROUND_REVEAL'] as const)('abandons %s without assigning a full-game winner or leaking the opponent role', async phase => {
    const code = phase === 'ROLE_INTRO' ? await started() : await answering();
    if (phase === 'ANSWER_REVEAL') {
      const optionId = record(code).public.scenario!.options[0].id;
      await command(code, 'host', { type: 'SUBMIT_ANSWER', optionId }); await command(code, 'guest', { type: 'SUBMIT_ANSWER', optionId });
    }
    if (phase === 'DECIDING' || phase === 'ROUND_REVEAL') await deciding(code);
    if (phase === 'ROUND_REVEAL') {
      await command(code, 'host', { type: 'SUBMIT_DECISION', decision: { type: 'guess', roleId: 'comfort' } });
      await command(code, 'guest', { type: 'SUBMIT_DECISION', decision: { type: 'guess', roleId: 'saver' } });
    }
    const before = record(code); expect(before.public.phase).toBe(phase);
    await service().leaveRoom(code, 'host', context(code));
    const after = record(code);
    expect(after.public.phase).toBe('ABANDONED'); expect(after.public.termination).toEqual({ seat: 0, displayName: 'หนึ่ง' });
    expect(after.server.gameState.matchScores).toEqual(before.server.gameState.matchScores);
    expect(after.server.gameState.roundHistory).toEqual(before.server.gameState.roundHistory);
    expect(after.public.roundSummary).toBeNull(); expect(after.private.host).toBeUndefined();
    expect(await service().joinRoom(code, 'third', 'สาม', 'owl')).toMatchObject({ success: false });
    expect(await service().joinRoom(code, 'guest', 'สอง', 'fox')).toMatchObject({ success: true, seat: 1 });
    expect(await command(code, 'guest', { type: 'ROLE_ACK' })).toMatchObject({ success: false });
    await expect(service().getRoomProjections(code, 'host')).rejects.toMatchObject({ status: 403 });
    await service().leaveRoom(code, 'guest', context(code)); expect(record(code).public.phase).toBe('CLOSED');
  });
  it('refresh/reconnect keeps seats and locked roles, but does not allow a third uid to replace an offline member', async () => {
    const code = await answering(), before = record(code), writes = db.roomWrites;
    await service().joinRoom(code, 'guest', 'ชื่อใหม่', 'owl');
    const fresh = await service().getRoomProjections(code, 'guest');
    expect(fresh.seat).toBe(1); expect(fresh.private.role).toBe('comfort'); expect(record(code)).toEqual(before);
    expect(await service().joinRoom(code, 'third', 'สาม', 'owl')).toMatchObject({ success: false });
    expect(db.roomWrites).toBe(writes);
  });
  it('retries after a lost committed response even after membership is removed', async () => {
    const code = await lobby(), binding = context(code); db.loseResponse(`rooms/${code}`);
    await expect(service().leaveRoom(code, 'host', binding)).rejects.toMatchObject({ retryable: true });
    const writes = db.roomWrites;
    expect(await service().leaveRoom(code, 'host', binding)).toEqual({ success: true });
    expect(db.roomWrites).toBe(writes);
    expect(await service().leaveRoom(code, 'host', { ...binding, actionId: randomUUID() })).toMatchObject({ success: false });
    expect(await service().leaveRoom(code, 'outsider', binding)).toMatchObject({ success: false });
    expect(await service().leaveRoom(code, 'host', { ...binding, clueIndex: 1 })).toMatchObject({ success: false });
  });
  it('does not remove members or acknowledge success when the database write fails', async () => {
    const code = await lobby(), before = record(code); db.rejectWrites(true);
    await expect(service().leaveRoom(code, 'host', context(code))).rejects.toMatchObject({ retryable: true });
    expect(record(code)).toEqual(before);
  });
  it('accepts a leave across a same-match clue transition, but rejects old-match departure after rematch', async () => {
    const code = await answering(), binding = context(code); await deciding(code);
    await command(code, 'host', { type: 'SUBMIT_DECISION', decision: { type: 'continue' } });
    await command(code, 'guest', { type: 'SUBMIT_DECISION', decision: { type: 'continue' } });
    expect(record(code).public.clueIndex).toBe(1);
    const stale = { ...binding, matchId: 'old-match' };
    expect(await service().leaveRoom(code, 'host', stale)).toMatchObject({ success: false });
    expect(await service().leaveRoom(code, 'host', binding)).toEqual({ success: true });
  });
  it('preserves completed match results on departure and disables a one-player rematch', async () => {
    const code = await started();
    for (let round = 0; round < 4; round++) {
      await command(code, 'host', { type: 'ROLE_ACK' }); await command(code, 'guest', { type: 'ROLE_ACK' });
      await deciding(code);
      await command(code, 'host', { type: 'SUBMIT_DECISION', decision: { type: 'guess', roleId: 'comfort' } });
      await command(code, 'guest', { type: 'SUBMIT_DECISION', decision: { type: 'guess', roleId: 'saver' } });
      await command(code, 'host', { type: 'NEXT_ROUND_READY' }); await command(code, 'guest', { type: 'NEXT_ROUND_READY' });
    }
    const before = record(code); expect(before.public.phase).toBe('MATCH_RESULT');
    await service().leaveRoom(code, 'host', context(code));
    expect(record(code).public.phase).toBe('MATCH_RESULT'); expect(record(code).public.matchScores).toEqual([20, 20]);
    expect(record(code).public.termination).toBeNull();
    expect(await command(code, 'guest', { type: 'REMATCH_REQUEST' })).toMatchObject({ success: false });
    await service().leaveRoom(code, 'guest', context(code)); expect(record(code).public.phase).toBe('CLOSED');
  });
  it('validates token and whitelist on the HTTP leave endpoint', async () => {
    const code = await lobby(), binding = context(code); vi.spyOn(roomStore, 'getRoomStore').mockImplementation(() => db.store());
    const post = (body: unknown, token = 'mock-token-host') => POST(new Request('http://localhost/api/room/leave', {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    }));
    expect((await POST(new Request('http://localhost/api/room/leave', { method: 'POST' }))).status).toBe(401);
    expect((await post({ code, ...binding, seat: 1 })).status).toBe(400);
    expect((await post({ code, ...binding }, 'mock-token-outsider')).status).toBe(400);
    const result = await post({ code, ...binding }); expect(result.status).toBe(200); expect(result.headers.get('Cache-Control')).toBe('no-store');
    expect((await post({ code, ...binding })).status).toBe(200);
  });
});
