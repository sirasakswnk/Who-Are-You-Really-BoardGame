import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateRoomCode,
  createRoom,
  joinRoom,
  setPlayerReady,
  startMatch,
  dispatchGameAction,
  memoryRooms,
} from '../../lib/server/roomService';

describe('Room Service (lib/server/roomService.ts)', () => {
  beforeEach(() => {
    memoryRooms.clear();
  });

  describe('Room Code Generation', () => {
    it('generates 6-character room codes without confusing characters (0, O, 1, I, L)', () => {
      for (let i = 0; i < 50; i++) {
        const code = generateRoomCode();
        expect(code).toHaveLength(6);
        expect(code).toMatch(/^[A-Z2-9]+$/);
        expect(code).not.toMatch(/[01OIL]/);
      }
    });
  });

  describe('Room Lifecycle & Seating', () => {
    it('creates a room with host as seat 0', async () => {
      const res = await createRoom('host-123', 'สมชาย', 'cat');
      expect(res.code).toHaveLength(6);
      expect(res.seat).toBe(0);

      const room = memoryRooms.get(res.code);
      expect(room).toBeDefined();
      expect(room?.members['host-123']).toEqual({
        uid: 'host-123',
        displayName: 'สมชาย',
        avatarId: 'cat',
        seat: 0,
        isHost: true,
      });
      expect(room?.public.phase).toBe('LOBBY');
      expect(room?.public.players[0]?.uid).toBe('host-123');
      expect(room?.public.players[1]).toBeNull();
    });

    it('allows second player to join as seat 1', async () => {
      const { code } = await createRoom('host-123', 'สมชาย', 'cat');
      const joinRes = await joinRoom(code, 'guest-456', 'สมหญิง', 'fox');

      expect(joinRes.success).toBe(true);
      expect(joinRes.seat).toBe(1);

      const room = memoryRooms.get(code);
      expect(room?.public.players[1]?.uid).toBe('guest-456');
    });

    it('rejects a 3rd player atomically when room is full', async () => {
      const { code } = await createRoom('host-123', 'สมชาย', 'cat');
      await joinRoom(code, 'guest-456', 'สมหญิง', 'fox');

      const thirdJoin = await joinRoom(code, 'guest-789', 'คนแปลกหน้า', 'owl');
      expect(thirdJoin.success).toBe(false);
      expect(thirdJoin.error).toContain('Room is full');
    });

    it('allows existing player to resume / reconnect to their assigned seat', async () => {
      const { code } = await createRoom('host-123', 'สมชาย', 'cat');
      await joinRoom(code, 'guest-456', 'สมหญิง', 'fox');

      // Guest resumes
      const resumeGuest = await joinRoom(code, 'guest-456', 'สมหญิง', 'fox');
      expect(resumeGuest.success).toBe(true);
      expect(resumeGuest.seat).toBe(1);

      // Host resumes
      const resumeHost = await joinRoom(code, 'host-123', 'สมชาย', 'cat');
      expect(resumeHost.success).toBe(true);
      expect(resumeHost.seat).toBe(0);
    });
  });

  describe('Match Start & Projection Privacy Boundaries', () => {
    it('requires both players to be ready before host can start', async () => {
      const { code } = await createRoom('host-123', 'สมชาย', 'cat');
      await joinRoom(code, 'guest-456', 'สมหญิง', 'fox');

      // Attempt start before ready
      const startFail = await startMatch(code, 'host-123');
      expect(startFail.success).toBe(false);

      // Set ready
      await setPlayerReady(code, 'host-123', true);
      await setPlayerReady(code, 'guest-456', true);

      // Non-host attempts start -> rejected
      const nonHostStart = await startMatch(code, 'guest-456');
      expect(nonHostStart.success).toBe(false);
      expect(nonHostStart.error).toContain('Only host');

      // Host starts -> succeeds
      const startSuccess = await startMatch(code, 'host-123');
      expect(startSuccess.success).toBe(true);

      const room = memoryRooms.get(code)!;
      expect(room.public.phase).toBe('ROLE_INTRO');
      expect(room.server.matchDeck).toHaveLength(4);

      // Privacy checks
      const p0Private = room.private['host-123'];
      const p1Private = room.private['guest-456'];

      expect(p0Private.role).not.toBeNull();
      expect(p1Private.role).not.toBeNull();
      expect(p0Private.role).not.toBe(p1Private.role); // Different roles

      // Public projection MUST NOT reveal secret roles
      const publicRecord = room.public as unknown as Record<string, unknown>;
      expect(publicRecord['roles']).toBeUndefined();
      expect(publicRecord['secretRoles']).toBeUndefined();
    });
  });

  describe('Game Action Idempotency', () => {
    it('ignores duplicate action requests with identical actionId (idempotency receipt)', async () => {
      const { code } = await createRoom('host-123', 'สมชาย', 'cat');
      await joinRoom(code, 'guest-456', 'สมหญิง', 'fox');
      await setPlayerReady(code, 'host-123', true);
      await setPlayerReady(code, 'guest-456', true);
      await startMatch(code, 'host-123');

      // Dispatch ROLE_ACK
      const res1 = await dispatchGameAction(code, 'host-123', 'act-ack-1', {
        type: 'ROLE_ACK',
        seat: 0,
      });
      expect(res1.success).toBe(true);

      // Re-send same actionId
      const res2 = await dispatchGameAction(code, 'host-123', 'act-ack-1', {
        type: 'ROLE_ACK',
        seat: 0,
      });
      expect(res2.success).toBe(true);
    });
  });
});
