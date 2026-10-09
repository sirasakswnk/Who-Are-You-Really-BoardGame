/**
 * Game type definitions
 * Core types for the Who Are You Really? game engine
 */

/** The 6 role identifiers */
export type RoleId = 'saver' | 'comfort' | 'explorer' | 'companion' | 'impatient' | 'cautious';

/** All valid role IDs */
export const ROLE_IDS: readonly RoleId[] = [
  'saver', 'comfort', 'explorer', 'companion', 'impatient', 'cautious',
] as const;

/** Role metadata for display */
export interface RoleInfo {
  id: RoleId;
  name: string;        // Thai display name
  description: string; // Card description
}

/** Role catalog */
export const ROLES: Record<RoleId, RoleInfo> = {
  saver: {
    id: 'saver',
    name: 'คนประหยัด',
    description: 'ให้ความสำคัญกับการเก็บเงิน เลือกสิ่งที่เสียเงินน้อยกว่า แม้ต้องลำบากขึ้นบ้าง',
  },
  comfort: {
    id: 'comfort',
    name: 'คนรักสบาย',
    description: 'เลือกสิ่งที่สะดวก ใช้แรงน้อย และไม่ยุ่งยาก ยอมจ่ายเพิ่มเพื่อความสบาย',
  },
  explorer: {
    id: 'explorer',
    name: 'นักผจญภัย',
    description: 'ชอบลองสิ่งใหม่ เลือกประสบการณ์ที่ไม่เคยทำมากกว่าสิ่งเดิมที่คุ้นเคย',
  },
  companion: {
    id: 'companion',
    name: 'คนรักเพื่อน',
    description: 'อยากอยู่และทำกิจกรรมกับเพื่อน เลือกตามกลุ่มมากกว่าทำสิ่งที่ชอบคนเดียว',
  },
  impatient: {
    id: 'impatient',
    name: 'คนใจร้อน',
    description: 'อยากได้ผลทันที ไม่ชอบรอ เลือกทางที่เริ่มหรือเสร็จได้เร็วกว่า',
  },
  cautious: {
    id: 'cautious',
    name: 'คนระมัดระวัง',
    description: 'เน้นความปลอดภัยและความแน่นอน เลือกสิ่งที่ไว้ใจได้มากกว่าการเสี่ยง',
  },
};

/** Game phases (state machine states) */
export type GamePhase =
  | 'LOBBY'
  | 'ROLE_INTRO'
  | 'ANSWERING'
  | 'ANSWER_REVEAL'
  | 'DECIDING'
  | 'ROUND_REVEAL'
  | 'MATCH_RESULT';

/** Scoring: points for guessing correctly at each clue index (clues 0, 1, 2, 3) */
export const SCORE_TABLE: readonly number[] = [5, 4, 3, 2] as const;
export const ROUNDS_PER_MATCH = 4;
export const CLUES_PER_ROUND = 4;

/** A scenario option */
export interface ScenarioOption {
  id: string;
  label: string;
}

/** Scenario categories */
export type ScenarioCategory = 'travel' | 'food' | 'shopping' | 'leisure' | 'friends' | 'daily';

/** A game scenario (client-facing, no editorial metadata) */
export interface Scenario {
  id: string;
  version: number;
  category: ScenarioCategory;
  prompt: string;
  options: ScenarioOption[];
}

/** Editorial metadata for scenario creation (server-only) */
export interface ScenarioEditorial {
  plausibleOptionsByRole: Record<RoleId, string[]>;
  rationaleByRole: Record<RoleId, string>;
  difficulty: 'broad' | 'distinguishing';
  tags: string[];
}

/** Server scenario with editorial metadata */
export interface ScenarioWithEditorial extends Scenario {
  editorial: ScenarioEditorial;
}

/** Player seat assignment */
export interface PlayerSeat {
  uid: string;
  displayName: string;
  avatarId: string;
  seat: 0 | 1;
  isHost: boolean;
  ready: boolean;
}

/** Decision envelope submitted during DECIDING phase */
export type DecisionAction =
  | { type: 'continue' }
  | { type: 'guess'; roleId: RoleId }
  | { type: 'ack' }; // for players who already guessed in an earlier clue

/** Round result saved in history */
export interface RoundResult {
  roundIndex: number;
  roles: [RoleId, RoleId];                         // [seat0, seat1]
  guesses: [RoleId | null, RoleId | null];         // [seat0, seat1]
  guessClueIndex: [number | null, number | null];  // clue index where each guessed
  scores: [number, number];                        // points earned in this round [seat0, seat1]
  reason: [string, string];                        // explanation in Thai
}

/** Active round state */
export interface RoundState {
  roundIndex: number;
  roles: [RoleId, RoleId];                                      // secret roles [seat0, seat1]
  scenarios: Scenario[];                                        // 4 scenarios for this round
  roleAcks: [boolean, boolean];                                 // role intro acks
  currentAnswers: [string | null, string | null];               // optionId for current clue
  revealedAnswers: Array<{ clueIndex: number; answers: [string, string] }>; // history of answers
  revealAcks: [boolean, boolean];                               // answer reveal acks
  currentDecisions: [DecisionAction | null, DecisionAction | null]; // decisions for current clue
  guesses: [RoleId | null, RoleId | null];                      // locked guesses for this round
  guessClueIndex: [number | null, number | null];               // clue index when guessed
  roundScores: [number, number] | null;                         // calculated at ROUND_REVEAL
  nextRoundReady: [boolean, boolean];                           // round reveal ready flags
}

/** Complete match state managed by the server engine */
export interface GameState {
  roomId: string;
  matchId: string;
  phase: GamePhase;
  seats: [PlayerSeat | null, PlayerSeat | null];
  roundIndex: number;                                           // 0..3
  clueIndex: number;                                            // 0..3
  matchScores: [number, number];                                // cumulative scores [seat0, seat1]
  roundHistory: RoundResult[];
  currentRound: RoundState | null;
  rematchRequests: [boolean, boolean];
}

/** Actions that can be dispatched to the game engine */
export type GameAction =
  | { type: 'PLAYER_JOIN'; seat: 0 | 1; uid: string; displayName: string; avatarId: string; isHost?: boolean }
  | { type: 'PLAYER_LEAVE'; seat: 0 | 1 }
  | { type: 'PLAYER_READY'; seat: 0 | 1; ready: boolean }
  | { type: 'START_MATCH'; matchId?: string; rolePair?: [RoleId, RoleId]; scenarios?: Scenario[] }
  | { type: 'ROLE_ACK'; seat: 0 | 1 }
  | { type: 'SUBMIT_ANSWER'; seat: 0 | 1; clueIndex: number; optionId: string }
  | { type: 'REVEAL_ACK'; seat: 0 | 1; clueIndex: number }
  | { type: 'SUBMIT_DECISION'; seat: 0 | 1; clueIndex: number; decision: DecisionAction }
  | { type: 'NEXT_ROUND_READY'; seat: 0 | 1; nextRolePair?: [RoleId, RoleId]; nextScenarios?: Scenario[] }
  | { type: 'REMATCH_REQUEST'; seat: 0 | 1 };

/** Sanitized player projection (what a specific player's client receives) */
export interface PlayerProjection {
  roomId: string;
  matchId: string;
  phase: GamePhase;
  mySeat: 0 | 1;
  players: [PlayerSeat | null, PlayerSeat | null];
  roundIndex: number;
  clueIndex: number;
  matchScores: [number, number];
  roundHistory: RoundResult[];

  // Private to this seat
  myRole: RoleId | null;
  myGuessedRole: RoleId | null;
  myGuessedClueIndex: number | null;
  hasGuessed: boolean;
  myCommittedAnswer: string | null;

  // Round information
  currentScenario: Scenario | null;
  opponentHasAnswered: boolean;                                  // Boolean only! Option hidden until reveal
  revealedAnswers: Array<{ clueIndex: number; answers: [string, string] }>;
  
  // Decision phase info: NEVER exposes opponent's guess or decision type!
  bothDecisionsSubmitted: boolean;

  // Round summary (only populated during ROUND_REVEAL & MATCH_RESULT)
  roundSummary: RoundResult | null;

  // Rematch
  rematchRequests: [boolean, boolean];
}

/** Result of processing an action through the game engine */
export interface EngineResult {
  success: boolean;
  state: GameState;
  error?: string;
}
