import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { createRoomService } from '../helpers/testClient';
import { createFirebaseRoomStore, RoomStorageError } from '../../lib/server/roomStore';

// Explicit opt-in only. Never load .env or use a deployed database for this test.
const host = process.env.F02_RTDB_EMULATOR_HOST;
if (host && !/^(127\.0\.0\.1|localhost):\d+$/.test(host)) throw new Error('F02 emulator tests require a local loopback host');
const databaseURL = `http://${host ?? '127.0.0.1:19243'}?ns=mock-f02-${randomUUID()}`;
const store = () => createFirebaseRoomStore({ databaseURL, accessToken: async () => 'owner' });
const instance = () => createRoomService(store(), { rolePair: () => ['saver', 'comfort'] });

describe.skipIf(!host)('Real RTDB emulator CAS across independent instances', () => {
  afterAll(async () => {
    // Remove only this suite's isolated local namespace, never shared live data.
    const cleanup = new URL(databaseURL);
    cleanup.pathname = '/.json';
    await fetch(cleanup, { method: 'DELETE', headers: { Authorization: 'Bearer owner' }, signal: AbortSignal.timeout(5000) });
  });
  it('joins atomically and retains both answers submitted from independent clients', async () => {
    const { code } = await instance().createRoom('host', 'หนึ่ง', 'cat');
    const joins = await Promise.all([
      instance().joinRoom(code, 'guest', 'สอง', 'fox'),
      instance().joinRoom(code, 'third', 'สาม', 'owl'),
    ]);
    expect(joins.filter(r => r.success)).toHaveLength(1);
    const guest = joins[0].success ? 'guest' : 'third';
    await Promise.all([instance().setPlayerReady(code, 'host', true), instance().setPlayerReady(code, guest, true)]);
    expect(await instance().startMatch(code, 'host')).toEqual({ success: true });
    await Promise.all([
      instance().dispatchGameAction(code, 'host', 'role-host', { type: 'ROLE_ACK', seat: 0 }),
      instance().dispatchGameAction(code, guest, 'role-guest', { type: 'ROLE_ACK', seat: 1 }),
    ]);
    const view = await instance().getRoomProjections(code, 'host');
    const options = view.public.scenario!.options;
    const answers = await Promise.all([
      instance().dispatchGameAction(code, 'host', 'answer-host', { type: 'SUBMIT_ANSWER', seat: 0, clueIndex: 0, optionId: options[0].id }),
      instance().dispatchGameAction(code, guest, 'answer-guest', { type: 'SUBMIT_ANSWER', seat: 1, clueIndex: 0, optionId: options[1].id }),
    ]);
    expect(answers).toEqual([{ success: true }, { success: true }]);
    const result = await instance().getRoomProjections(code, 'host');
    expect(result.public.phase).toBe('ANSWER_REVEAL');
    expect(result.public.revealedAnswers[0].answers).toEqual([options[0].id, options[1].id]);
  }, 20000);
  it('recovers a lost room-create response without creating another room', async () => {
    let loseResponse = true;
    const transport: typeof fetch = async (input, init) => {
      const response = await fetch(input, init);
      if (init?.method === 'PUT' && new URL(String(input)).pathname.startsWith('/rooms/') && loseResponse) {
        loseResponse = false;
        await response.json();
        throw new Error('Lost response after real commit');
      }
      return response;
    };
    const unreliable = createRoomService(createFirebaseRoomStore({ databaseURL, accessToken: async () => 'owner', fetch: transport }));
    await expect(unreliable.createRoom('recover-host', 'หนึ่ง', 'cat', 'create-retry')).rejects.toBeInstanceOf(RoomStorageError);
    const recovered = await instance().createRoom('recover-host', 'หนึ่ง', 'cat', 'create-retry');
    expect((await instance().getRoomProjections(recovered.code, 'recover-host')).seat).toBe(0);
  }, 20000);
});
