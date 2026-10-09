import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createRoom,
  joinRoom,
  setPlayerReady,
  startMatch,
  dispatchGameAction,
  getRoomProjections,
  memoryRooms,
} from '../helpers/testClient';
import { RoleId } from '../../lib/game/types';
import * as roomStore from '../../lib/server/roomStore';
import { decodeRoomRecord } from '../../lib/server/roomSchema';
import { fakeRTDB } from '../helpers/fakeRTDB';

describe('Resilience, Concurrency & Data Privacy Boundary (tests/integration/resilience-concurrency.test.ts)', () => {
  let database: ReturnType<typeof fakeRTDB>;
  beforeEach(() => {
    memoryRooms.clear();
    database = fakeRTDB();
    // A test inspection mirror only; the API always reads the simulated server.
    database.onPut((path, value) => {
      if (path.startsWith('rooms/')) memoryRooms.set(path.slice(6), decodeRoomRecord(value, path.slice(6))!);
    });
    vi.spyOn(roomStore, 'getRoomStore').mockImplementation(() => database.store());
  });
  afterEach(() => vi.restoreAllMocks());

  /* ─────────────────────────────────────────────────────────────
   * 1. Data Privacy & Leakage Audits
   * ───────────────────────────────────────────────────────────── */
  describe('Data Privacy & Isolation Audits', () => {
    it('guarantees opponent secret role and choices are NEVER exposed in public projection', async () => {
      const { code } = await createRoom('player-0', 'นักสืบหนึ่ง', 'cat');
      await joinRoom(code, 'player-1', 'นักสืบสอง', 'fox');
      await setPlayerReady(code, 'player-0', true);
      await setPlayerReady(code, 'player-1', true);
      await startMatch(code, 'player-0');

      // 1. In ROLE_INTRO phase:
      const p0View = await getRoomProjections(code, 'player-0');
      const p1View = await getRoomProjections(code, 'player-1');

      expect(p0View.public).toBeDefined();
      expect(p0View.private?.role).toBeDefined();
      expect(p1View.private?.role).toBeDefined();

      // P0 private must NOT equal P1 private
      expect(p0View.private?.role).not.toBe(p1View.private?.role);

      // Public projection must NOT contain any role keys or opponent role
      const publicString = JSON.stringify(p0View.public);
      expect(publicString).not.toContain(p0View.private?.role);
      expect(publicString).not.toContain(p1View.private?.role);
      expect(publicString).not.toContain('secretRoles');
      expect(publicString).not.toContain('matchDeck');

      // 2. Both acknowledge role -> advance to ANSWERING
      await dispatchGameAction(code, 'player-0', 'ack-0', { type: 'ROLE_ACK', seat: 0 });
      await dispatchGameAction(code, 'player-1', 'ack-1', { type: 'ROLE_ACK', seat: 1 });

      const roomAfterAck = memoryRooms.get(code)!;
      expect(roomAfterAck.public.phase).toBe('ANSWERING');

      // 3. Player 1 submits answer. Player 0 MUST NOT see Player 1's answer yet!
      const p1Scenario = roomAfterAck.server.gameState.currentRound?.scenarios[0];
      const p1Option = p1Scenario?.options[0].id || 'opt-1';

      await dispatchGameAction(code, 'player-1', 'ans-p1-clue0', {
        type: 'SUBMIT_ANSWER',
        clueIndex: 0,
        optionId: p1Option,
        seat: 1,
      });

      // Fetch Player 0's view:
      const p0ViewDuringAnswer = await getRoomProjections(code, 'player-0');

      // Crucial privacy check: server holds P1 answer, but public projection has NO currentAnswers property!
      expect((p0ViewDuringAnswer.public as unknown as Record<string, unknown>)['currentAnswers']).toBeUndefined();
      // Revealed answers in public must still be completely empty for clue 0
      expect(p0ViewDuringAnswer.public.revealedAnswers).toHaveLength(0);
      // P0 private does not know P1 answer
      expect(p0ViewDuringAnswer.private?.committedAnswer).toBeNull();

      // 4. Player 0 now submits their answer -> moves to ANSWER_REVEAL
      const p0Option = p1Scenario?.options[1].id || 'opt-2';
      await dispatchGameAction(code, 'player-0', 'ans-p0-clue0', {
        type: 'SUBMIT_ANSWER',
        clueIndex: 0,
        optionId: p0Option,
        seat: 0,
      });

      const p0ViewAfterReveal = await getRoomProjections(code, 'player-0');
      expect(p0ViewAfterReveal.public.phase).toBe('ANSWER_REVEAL');
      // NOW and only now are answers revealed in public
      expect(p0ViewAfterReveal.public.revealedAnswers).toHaveLength(1);
      expect(p0ViewAfterReveal.public.revealedAnswers[0].answers).toEqual([p0Option, p1Option]);

      // 5. During DECIDING phase: Player 0 makes a guess. Player 1 MUST NOT see what Player 0 guessed!
      await dispatchGameAction(code, 'player-0', 'rev-ack-0', { type: 'REVEAL_ACK', clueIndex: 0, seat: 0 });
      await dispatchGameAction(code, 'player-1', 'rev-ack-1', { type: 'REVEAL_ACK', clueIndex: 0, seat: 1 });

      const roomDeciding = memoryRooms.get(code)!;
      expect(roomDeciding.public.phase).toBe('DECIDING');

      // Player 0 guesses
      const p0GuessedRole: RoleId = 'saver';
      await dispatchGameAction(code, 'player-0', 'dec-p0-guess', {
        type: 'SUBMIT_DECISION',
        clueIndex: 0,
        decision: { type: 'guess', roleId: p0GuessedRole },
        seat: 0,
      });

      // Player 1 inspects room state while they are still deciding:
      const p1ViewDuringDecision = await getRoomProjections(code, 'player-1');
      const p1PublicStrDuringDec = JSON.stringify(p1ViewDuringDecision.public);

      // Must NOT reveal P0's guessed role
      expect(p1PublicStrDuringDec).not.toContain(p0GuessedRole);
      // Must NOT expose who has guessed in public projection
      expect(p1PublicStrDuringDec).not.toContain('hasGuessed');
      expect(p1ViewDuringDecision.private?.guess).toBeNull();
    });
  });

  /* ─────────────────────────────────────────────────────────────
   * 2. Concurrency & Microsecond Race Conditions
   * ───────────────────────────────────────────────────────────── */
  describe('Concurrency & Idempotency Resilience', () => {
    it('handles concurrent simultaneous answer submissions without race condition or lost state', async () => {
      const { code } = await createRoom('player-0', 'นักสืบหนึ่ง', 'cat');
      await joinRoom(code, 'player-1', 'นักสืบสอง', 'fox');
      await setPlayerReady(code, 'player-0', true);
      await setPlayerReady(code, 'player-1', true);
      await startMatch(code, 'player-0');
      await dispatchGameAction(code, 'player-0', 'ack-0', { type: 'ROLE_ACK', seat: 0 });
      await dispatchGameAction(code, 'player-1', 'ack-1', { type: 'ROLE_ACK', seat: 1 });

      const room = memoryRooms.get(code)!;
      const scenario = room.server.gameState.currentRound!.scenarios[0];

      // Concurrently submit answers in parallel
      const [res0, res1] = await Promise.all([
        dispatchGameAction(code, 'player-0', 'p0-sub-concurrent', {
          type: 'SUBMIT_ANSWER',
          clueIndex: 0,
          optionId: scenario.options[0].id,
          seat: 0,
        }),
        dispatchGameAction(code, 'player-1', 'p1-sub-concurrent', {
          type: 'SUBMIT_ANSWER',
          clueIndex: 0,
          optionId: scenario.options[1].id,
          seat: 1,
        }),
      ]);

      expect(res0.success).toBe(true);
      expect(res1.success).toBe(true);

      // Room state must transition atomically to ANSWER_REVEAL
      const updatedRoom = memoryRooms.get(code)!;
      expect(updatedRoom.public.phase).toBe('ANSWER_REVEAL');
      expect(updatedRoom.public.revealedAnswers).toHaveLength(1);
      expect(updatedRoom.public.revealedAnswers[0].answers).toEqual([
        scenario.options[0].id,
        scenario.options[1].id,
      ]);
    });

    it('handles simultaneous double-clicks with identical actionId idempotently', async () => {
      const { code } = await createRoom('player-0', 'นักสืบหนึ่ง', 'cat');
      await joinRoom(code, 'player-1', 'นักสืบสอง', 'fox');
      await setPlayerReady(code, 'player-0', true);
      await setPlayerReady(code, 'player-1', true);
      await startMatch(code, 'player-0');

      // Send 5 identical actionId requests concurrently (rapid burst)
      const results = await Promise.all(
        Array.from({ length: 5 }).map(() =>
          dispatchGameAction(code, 'player-0', 'rapid-click-idempotent-1', {
            type: 'ROLE_ACK',
            seat: 0,
          })
        )
      );

      // All 5 must succeed (first commits, others return idempotent success)
      for (const res of results) {
        expect(res.success).toBe(true);
      }
    });

    it('rejects duplicate actionId when payload content differs', async () => {
      const { code } = await createRoom('player-0', 'นักสืบหนึ่ง', 'cat');
      await joinRoom(code, 'player-1', 'นักสืบสอง', 'fox');
      await setPlayerReady(code, 'player-0', true);
      await setPlayerReady(code, 'player-1', true);
      await startMatch(code, 'player-0');

      // First action
      const res1 = await dispatchGameAction(code, 'player-0', 'reused-action-id', {
        type: 'ROLE_ACK',
        seat: 0,
      });
      expect(res1.success).toBe(true);

      // Tampered payload with same actionId
      const res2 = await dispatchGameAction(code, 'player-0', 'reused-action-id', {
        type: 'SUBMIT_ANSWER',
        clueIndex: 0,
        optionId: 'fake',
        seat: 0,
      });
      expect(res2.success).toBe(false);
      expect(res2.error).toContain('mismatched payload');
    });
  });

  /* ─────────────────────────────────────────────────────────────
   * 3. Reconnection, Resumption & Edge Cases
   * ───────────────────────────────────────────────────────────── */
  describe('Reconnection & Edge Cases', () => {
    it('seamlessly recovers player state on refresh / seat resumption during game', async () => {
      const { code } = await createRoom('p-reconnect-0', 'สมศักดิ์', 'owl');
      await joinRoom(code, 'p-reconnect-1', 'สมศรี', 'bear');
      await setPlayerReady(code, 'p-reconnect-0', true);
      await setPlayerReady(code, 'p-reconnect-1', true);
      await startMatch(code, 'p-reconnect-0');

      // Advance to answering
      await dispatchGameAction(code, 'p-reconnect-0', 'ack-0', { type: 'ROLE_ACK', seat: 0 });
      await dispatchGameAction(code, 'p-reconnect-1', 'ack-1', { type: 'ROLE_ACK', seat: 1 });

      // Player 0 answers
      const room = memoryRooms.get(code)!;
      const optId = room.server.gameState.currentRound!.scenarios[0].options[0].id;
      await dispatchGameAction(code, 'p-reconnect-0', 'ans-p0', {
        type: 'SUBMIT_ANSWER',
        clueIndex: 0,
        optionId: optId,
        seat: 0,
      });

      // Player 0 drops connection / reloads page and calls joinRoom / getRoomProjections
      const resumeRes = await joinRoom(code, 'p-reconnect-0', 'สมศักดิ์', 'owl');
      expect(resumeRes.success).toBe(true);
      expect(resumeRes.seat).toBe(0);

      const projections = await getRoomProjections(code, 'p-reconnect-0');
      expect(projections.public.phase).toBe('ANSWERING');
      expect(projections.private?.committedAnswer).toBe(optId);
      expect(projections.private?.role).not.toBeNull();
    });

    it('rejects action from unauthorized non-member uid', async () => {
      const { code } = await createRoom('player-0', 'นักสืบหนึ่ง', 'cat');
      await joinRoom(code, 'player-1', 'นักสืบสอง', 'fox');

      const hackRes = await dispatchGameAction(code, 'hacker-999', 'hack-act', {
        type: 'ROLE_ACK',
        seat: 0,
      });

      expect(hackRes.success).toBe(false);
      expect(hackRes.error).toContain('Not a member');
    });

    it('rejects action on non-existent room code', async () => {
      const badRes = await dispatchGameAction('XYZ999', 'player-0', 'act-1', {
        type: 'ROLE_ACK',
        seat: 0,
      });

      expect(badRes.success).toBe(false);
      expect(badRes.error).toContain('Room not found');
    });

    it('rejects interactions on expired room (>24 hours old)', async () => {
      const { code } = await createRoom('player-0', 'นักสืบหนึ่ง', 'cat');
      const room = memoryRooms.get(code)!;

      // Force room expiration
      room.server.expiresAt = Date.now() - 1000;
      database.put(`rooms/${code}`, room);

      const joinAttempt = await joinRoom(code, 'player-1', 'นักสืบสอง', 'fox');
      expect(joinAttempt.success).toBe(false);
      expect(joinAttempt.error).toContain('Room expired');

      const actionAttempt = await dispatchGameAction(code, 'player-0', 'expired-act', {
        type: 'ROLE_ACK',
        seat: 0,
      });
      expect(actionAttempt.success).toBe(false);
      expect(actionAttempt.error).toContain('Room expired');
    });
  });
});
