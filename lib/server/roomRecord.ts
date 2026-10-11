import type { ContentVersion, GameState, PlayerSeat, RoleId, Scenario, RevealedEvidence, RoundResult } from '../game/types';

/** Unversioned rooms are legacy version 0 and are decoded into version 1. */
export const ROOM_SCHEMA_VERSION = 1;

export interface RoomRecord {
  schemaVersion: typeof ROOM_SCHEMA_VERSION;
  code: string;
  members: Record<string, {
    uid: string; displayName: string; avatarId: string; seat: 0 | 1; isHost: boolean;
  }>;
  public: {
    revision?: number;
    code: string;
    phase: GameState['phase'];
    matchId: string;
    contentVersion?: ContentVersion;
    roundId: string | null;
    roundIndex: number;
    clueIndex: number;
    matchScores: [number, number];
    players: [PlayerSeat | null, PlayerSeat | null];
    scenario: Scenario | null;
    revealedAnswers: Array<{ clueIndex: number; answers: [string, string] }>;
    revealedEvidence: RevealedEvidence[];
    roundHistory: Array<RoundResult & { evidence: RevealedEvidence[] }>;
    roundSummary: GameState['roundHistory'][number] | null;
    rematchRequests: [boolean, boolean];
    termination?: GameState['termination'];
  };
  private: Record<string, {
    revision?: number;
    matchId: string;
    contentVersion?: ContentVersion;
    roundId: string | null;
    phase: GameState['phase'];
    clueIndex: number;
    role: RoleId | null;
    guess: RoleId | null;
    guessClueIndex: number | null;
    committedAnswer: string | null;
    hasGuessed: boolean;
    roleAcknowledged: boolean;
    answerSubmitted: boolean;
    revealAcknowledged: boolean;
    decisionSubmitted: boolean;
    nextRoundReady: boolean;
    rematchRequested: boolean;
  }>;
  server: {
    revision?: number;
    creation?: { uid: string; requestId: string; fingerprint: string };
    gameState: GameState;
    matchDeck: Scenario[][] | null;
    receipts: Record<string, {
      timestamp: number; type: string;
      // Optional only for legacy receipts; these never prove an F03 retry.
      uid?: string; matchId?: string; roundId?: string | null; clueIndex?: number; fingerprint?: string;
    }>;
    expiresAt: number;
  };
}
