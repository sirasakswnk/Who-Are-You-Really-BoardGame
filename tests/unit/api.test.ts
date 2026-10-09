import { describe, it, expect, beforeEach } from 'vitest';
import { POST as createRoute } from '../../app/api/room/create/route';
import { POST as joinRoute } from '../../app/api/room/join/route';
import { POST as readyRoute } from '../../app/api/room/ready/route';
import { POST as startRoute } from '../../app/api/room/start/route';
import { POST as actionRoute } from '../../app/api/game/action/route';
import { GET as getRoomRoute } from '../../app/api/room/[code]/route';
import { memoryRooms } from '../../lib/server/roomService';
import { normalizePrivateKey } from '../../lib/firebase/admin';

describe('API Route Handlers (app/api/*)', () => {
  beforeEach(() => {
    memoryRooms.clear();
  });

  function createAuthRequest(url: string, body?: unknown, token = 'mock-token-host123') {
    return new Request(url, {
      method: body ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  describe('Authentication Enforcement', () => {
    it('returns 401 when Authorization header is missing', async () => {
      const req = new Request('http://localhost:3000/api/room/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: 'Player 1' }),
      });
      const res = await createRoute(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toContain('Unauthorized');
    });
  });

  describe('Room Creation & Joining Flow via API', () => {
    it('creates room and returns room code with Cache-Control: no-store', async () => {
      const req = createAuthRequest(
        'http://localhost:3000/api/room/create',
        { displayName: 'สมชาย', avatarId: 'cat' },
        'mock-token-host123'
      );
      const res = await createRoute(req);
      expect(res.status).toBe(200);
      expect(res.headers.get('Cache-Control')).toBe('no-store');

      const data = await res.json();
      expect(data.code).toHaveLength(6);
      expect(data.seat).toBe(0);

      // Join the room as second player
      const joinReq = createAuthRequest(
        'http://localhost:3000/api/room/join',
        { code: data.code, displayName: 'สมหญิง', avatarId: 'fox' },
        'mock-token-guest456'
      );
      const joinRes = await joinRoute(joinReq);
      expect(joinRes.status).toBe(200);
      const joinData = await joinRes.json();
      expect(joinData.seat).toBe(1);

      // Fetch room projections
      const syncReq = createAuthRequest(
        `http://localhost:3000/api/room/${data.code}`,
        undefined,
        'mock-token-guest456'
      );
      const syncRes = await getRoomRoute(syncReq, { params: Promise.resolve({ code: data.code }) });
      expect(syncRes.status).toBe(200);
      const syncData = await syncRes.json();
      expect(syncData.seat).toBe(1);
      expect(syncData.isHost).toBe(false);
      expect(syncData.public.players[0]?.displayName).toBe('สมชาย');
      expect(syncData.public.players[1]?.displayName).toBe('สมหญิง');
    });

    it('sets players ready and starts match via API', async () => {
      // 1. Create room
      const createReq = createAuthRequest(
        'http://localhost:3000/api/room/create',
        { displayName: 'สมชาย', avatarId: 'cat' },
        'mock-token-host123'
      );
      const createRes = await createRoute(createReq);
      const { code } = await createRes.json();

      // 2. Guest joins
      const joinReq = createAuthRequest(
        'http://localhost:3000/api/room/join',
        { code, displayName: 'สมหญิง', avatarId: 'fox' },
        'mock-token-guest456'
      );
      await joinRoute(joinReq);

      // 3. Both set ready
      const r1 = createAuthRequest('http://localhost:3000/api/room/ready', { code, ready: true }, 'mock-token-host123');
      const r2 = createAuthRequest('http://localhost:3000/api/room/ready', { code, ready: true }, 'mock-token-guest456');
      await readyRoute(r1);
      await readyRoute(r2);

      // 4. Host starts
      const startReq = createAuthRequest('http://localhost:3000/api/room/start', { code }, 'mock-token-host123');
      const startRes = await startRoute(startReq);
      expect(startRes.status).toBe(200);

      // 5. Submit action ROLE_ACK
      const actReq = createAuthRequest(
        'http://localhost:3000/api/game/action',
        { code, actionId: 'act-1', action: { type: 'ROLE_ACK' } },
        'mock-token-host123'
      );
      const actRes = await actionRoute(actReq);
      expect(actRes.status).toBe(200);
    });
  });

  describe('normalizePrivateKey', () => {
    it('returns undefined if input is undefined or empty', () => {
      expect(normalizePrivateKey(undefined)).toBeUndefined();
      expect(normalizePrivateKey('')).toBeUndefined();
    });

    it('replaces literal \\n with real newlines', () => {
      const input = '-----BEGIN PRIVATE KEY-----\\nMIIEvgIBADANBg\\n-----END PRIVATE KEY-----';
      const output = normalizePrivateKey(input);
      expect(output).toBe('-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBg\n-----END PRIVATE KEY-----');
    });

    it('strips enclosing double or single quotes if copied from env files', () => {
      const inputWithDouble = '"-----BEGIN PRIVATE KEY-----\\nABC\\n-----END PRIVATE KEY-----\\n"';
      expect(normalizePrivateKey(inputWithDouble)).toBe('-----BEGIN PRIVATE KEY-----\nABC\n-----END PRIVATE KEY-----\n');

      const inputWithSingle = "'-----BEGIN PRIVATE KEY-----\\nXYZ\\n-----END PRIVATE KEY-----\\n'";
      expect(normalizePrivateKey(inputWithSingle)).toBe('-----BEGIN PRIVATE KEY-----\nXYZ\n-----END PRIVATE KEY-----\n');
    });

    it('normalizes Windows CRLF to LF', () => {
      const input = 'line1\r\nline2\r\nline3';
      expect(normalizePrivateKey(input)).toBe('line1\nline2\nline3');
    });
  });
});
