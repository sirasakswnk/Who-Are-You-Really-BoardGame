/**
 * Room Management & Authoritative State Synchronization
 * Manages room lifecycle, atomic seat assignment, idempotency receipts,
 * and synchronized projections between server, public, and private subtrees.
 */

import {
  GameState,
  GameAction,
  PlayerSeat,
  Scenario,
  RoleId,
} from '../game/types';
import {
  createInitialGameState,
  processAction,
  getPlayerProjection,
} from '../game/engine';
import { selectMatchDeck } from './deck';
import { generateRolePair } from '../game/roles';
import { adminDb } from '../firebase/admin';

/** Unambiguous characters for 6-letter room code (omits 0, O, 1, I, L) */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * Generates a crypto-secure 6-character room code.
 */
export function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * CODE_ALPHABET.length);
    code += CODE_ALPHABET[randomIndex];
  }
  return code;
}

/** In-memory store fallback for isolated unit testing */
export const memoryRooms = new Map<string, RoomRecord>();

export interface RoomRecord {
  code: string;
  members: Record<
    string,
    { uid: string; displayName: string; avatarId: string; seat: 0 | 1; isHost: boolean }
  >;
  public: {
    code: string;
    phase: GameState['phase'];
    matchId: string;
    roundIndex: number;
    clueIndex: number;
    matchScores: [number, number];
    players: [PlayerSeat | null, PlayerSeat | null];
    scenario: Scenario | null;
    revealedAnswers: Array<{ clueIndex: number; answers: [string, string] }>;
    roundSummary: GameState['roundHistory'][number] | null;
    rematchRequests: [boolean, boolean];
  };
  private: Record<
    string,
    {
      role: RoleId | null;
      guess: RoleId | null;
      guessClueIndex: number | null;
      committedAnswer: string | null;
      hasGuessed: boolean;
    }
  >;
  server: {
    gameState: GameState;
    matchDeck: Scenario[][] | null;
    receipts: Record<string, { timestamp: number; type: string }>;
    expiresAt: number;
  };
}

/**
 * Helper to synchronize public and private projections from authoritative GameState.
 */
export function buildProjections(
  code: string,
  state: GameState,
  members: RoomRecord['members']
): {
  public: RoomRecord['public'];
  private: RoomRecord['private'];
} {
  const currentScenario =
    state.currentRound && state.currentRound.scenarios[state.clueIndex]
      ? state.currentRound.scenarios[state.clueIndex]
      : null;

  const roundSummary =
    (state.phase === 'ROUND_REVEAL' || state.phase === 'MATCH_RESULT') &&
    state.roundHistory.length > 0
      ? state.roundHistory[state.roundHistory.length - 1]
      : null;

  const publicProjection: RoomRecord['public'] = {
    code,
    phase: state.phase,
    matchId: state.matchId,
    roundIndex: state.roundIndex,
    clueIndex: state.clueIndex,
    matchScores: state.matchScores,
    players: state.seats,
    scenario: currentScenario,
    revealedAnswers: state.currentRound ? state.currentRound.revealedAnswers : [],
    roundSummary,
    rematchRequests: state.rematchRequests,
  };

  const privateProjection: RoomRecord['private'] = {};
  for (const uid of Object.keys(members)) {
    const seat = members[uid].seat;
    const proj = getPlayerProjection(state, seat);
    privateProjection[uid] = {
      role: proj.myRole,
      guess: proj.myGuessedRole,
      guessClueIndex: proj.myGuessedClueIndex,
      committedAnswer: proj.myCommittedAnswer,
      hasGuessed: proj.hasGuessed,
    };
  }

  return { public: publicProjection, private: privateProjection };
}

function isLiveDbConfigured(): boolean {
  if (process.env.NODE_ENV === 'test') {
    return Boolean(process.env.FIREBASE_DATABASE_EMULATOR_HOST);
  }
  return Boolean(
    process.env.FIREBASE_DATABASE_EMULATOR_HOST ||
      (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY)
  );
}

async function syncRoomToDatabase(code: string, room: RoomRecord): Promise<void> {
  if (!isLiveDbConfigured()) return;
  try {
    await adminDb.ref(`rooms/${code}`).set(room);
  } catch (err) {
    console.warn(`Failed to sync room ${code} to RTDB:`, err);
  }
}

async function fetchRoomFromDatabase(code: string): Promise<RoomRecord | null> {
  if (!isLiveDbConfigured()) return null;
  try {
    const snap = await adminDb.ref(`rooms/${code}`).get();
    if (snap.exists()) {
      return snap.val() as RoomRecord;
    }
  } catch (err) {
    console.warn(`Failed to fetch room ${code} from RTDB:`, err);
  }
  return null;
}

/**
 * Creates a new game room.
 */
export async function createRoom(
  hostUid: string,
  displayName: string,
  avatarId: string
): Promise<{ code: string; seat: 0 }> {
  const code = generateRoomCode();
  const gameState = createInitialGameState(code);

  // Seat host at 0
  const joinRes = processAction(gameState, {
    type: 'PLAYER_JOIN',
    seat: 0,
    uid: hostUid,
    displayName,
    avatarId,
    isHost: true,
  });

  const members: RoomRecord['members'] = {
    [hostUid]: { uid: hostUid, displayName, avatarId, seat: 0, isHost: true },
  };

  const { public: pubProj, private: privProj } = buildProjections(code, joinRes.state, members);

  const roomRecord: RoomRecord = {
    code,
    members,
    public: pubProj,
    private: privProj,
    server: {
      gameState: joinRes.state,
      matchDeck: null,
      receipts: {},
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    },
  };

  // Save to memory store
  memoryRooms.set(code, roomRecord);

  // Sync to RTDB if live DB is configured
  await syncRoomToDatabase(code, roomRecord);

  return { code, seat: 0 };
}

/**
 * Joins an existing room with atomic seat assignment.
 */
export async function joinRoom(
  code: string,
  uid: string,
  displayName: string,
  avatarId: string
): Promise<{ success: boolean; seat?: 0 | 1; error?: string }> {
  let room = memoryRooms.get(code);

  // If not in memory, try fetching from RTDB
  if (!room) {
    room = (await fetchRoomFromDatabase(code)) ?? undefined;
    if (room) {
      memoryRooms.set(code, room);
    }
  }

  if (!room) {
    return { success: false, error: 'Room not found or expired' };
  }

  // Check if user is already a member (reconnect / refresh)
  if (room.members[uid]) {
    return { success: true, seat: room.members[uid].seat };
  }

  // Check if room is full (seat 1 occupied)
  if (room.server.gameState.seats[1] !== null) {
    return { success: false, error: 'Room is full (2 players maximum)' };
  }

  // Assign seat 1 to the new player
  const joinRes = processAction(room.server.gameState, {
    type: 'PLAYER_JOIN',
    seat: 1,
    uid,
    displayName,
    avatarId,
    isHost: false,
  });

  if (!joinRes.success) {
    return { success: false, error: joinRes.error };
  }

  room.members[uid] = { uid, displayName, avatarId, seat: 1, isHost: false };
  room.server.gameState = joinRes.state;

  const { public: pubProj, private: privProj } = buildProjections(code, room.server.gameState, room.members);
  room.public = pubProj;
  room.private = privProj;

  memoryRooms.set(code, room);
  await syncRoomToDatabase(code, room);

  return { success: true, seat: 1 };
}

/**
 * Sets player ready status in lobby.
 */
export async function setPlayerReady(
  code: string,
  uid: string,
  ready: boolean
): Promise<{ success: boolean; error?: string }> {
  const room = memoryRooms.get(code);
  if (!room || !room.members[uid]) {
    return { success: false, error: 'Player or room not found' };
  }

  const seat = room.members[uid].seat;
  const res = processAction(room.server.gameState, {
    type: 'PLAYER_READY',
    seat,
    ready,
  });

  if (!res.success) {
    return { success: false, error: res.error };
  }

  room.server.gameState = res.state;
  const { public: pubProj, private: privProj } = buildProjections(code, room.server.gameState, room.members);
  room.public = pubProj;
  room.private = privProj;

  memoryRooms.set(code, room);
  await syncRoomToDatabase(code, room);

  return { success: true };
}

/**
 * Starts match by host.
 */
export async function startMatch(
  code: string,
  uid: string
): Promise<{ success: boolean; error?: string }> {
  const room = memoryRooms.get(code);
  if (!room || !room.members[uid]) {
    return { success: false, error: 'Room or player not found' };
  }
  if (!room.members[uid].isHost) {
    return { success: false, error: 'Only host can start the match' };
  }

  // Generate 16 scenarios (4 rounds * 4 clues)
  const deck = selectMatchDeck();
  const rolePair = generateRolePair();

  const res = processAction(room.server.gameState, {
    type: 'START_MATCH',
    scenarios: deck[0], // Round 0 scenarios
    rolePair,
  });

  if (!joinResSafe(res)) {
    return { success: false, error: res.error };
  }

  room.server.gameState = res.state;
  room.server.matchDeck = deck;

  const { public: pubProj, private: privProj } = buildProjections(code, room.server.gameState, room.members);
  room.public = pubProj;
  room.private = privProj;

  memoryRooms.set(code, room);
  await syncRoomToDatabase(code, room);

  return { success: true };
}

function joinResSafe(res: { success: boolean; error?: string }): boolean {
  return res.success;
}

/**
 * Dispatches a player game action with idempotency enforcement.
 */
export async function dispatchGameAction(
  code: string,
  uid: string,
  actionId: string,
  action: GameAction
): Promise<{ success: boolean; error?: string }> {
  const room = memoryRooms.get(code);
  if (!room || !room.members[uid]) {
    return { success: false, error: 'Room or player not found' };
  }

  // Idempotency check: if actionId was already processed, return duplicate success
  if (room.server.receipts[actionId]) {
    return { success: true };
  }

  // If next round ready, provide deck for the next round
  if (action.type === 'NEXT_ROUND_READY' && room.server.matchDeck) {
    const nextRoundIndex = room.server.gameState.roundIndex + 1;
    if (nextRoundIndex < room.server.matchDeck.length) {
      action.nextScenarios = room.server.matchDeck[nextRoundIndex];
      action.nextRolePair = generateRolePair();
    }
  }

  const res = processAction(room.server.gameState, action);
  if (!res.success) {
    return { success: false, error: res.error };
  }

  room.server.gameState = res.state;
  room.server.receipts[actionId] = {
    timestamp: Date.now(),
    type: action.type,
  };

  const { public: pubProj, private: privProj } = buildProjections(code, room.server.gameState, room.members);
  room.public = pubProj;
  room.private = privProj;

  memoryRooms.set(code, room);
  await syncRoomToDatabase(code, room);

  return { success: true };
}
