import { ROLE_IDS, SCORE_TABLE } from '@/lib/game/types';
import type { GamePhase, RoleId, RoundResult, Scenario } from '@/lib/game/types';
import type { RoomSnapshot } from '@/lib/client/roomSnapshot';

export const PREVIEW_PHASES = [
  { phase: 'LOBBY', label: 'เชิญเพื่อน' },
  { phase: 'ROLE_INTRO', label: 'รับบทบาทลับ' },
  { phase: 'ANSWERING', label: 'ตอบสถานการณ์' },
  { phase: 'ANSWER_REVEAL', label: 'เฉลยคำตอบ' },
  { phase: 'DECIDING', label: 'ทายบทบาทเพื่อน' },
  { phase: 'ROUND_REVEAL', label: 'สรุปผลประจำรอบ' },
  { phase: 'MATCH_RESULT', label: 'ผลเกม' },
  { phase: 'ABANDONED', label: 'เกมยุติ' },
] as const satisfies ReadonlyArray<{ phase: GamePhase; label: string }>;

// These standalone screens are UI previews, never phases in the game state machine.
export const PREVIEW_SCREENS = [
  { phase: 'HOME', label: 'หน้าแรก' },
  ...PREVIEW_PHASES,
  { phase: 'ROOM_LOADING', label: 'กำลังโหลดห้อง' },
  { phase: 'ROOM_ERROR', label: 'เชื่อมต่อห้องไม่ได้' },
  { phase: 'ROOM_RECOVERY', label: 'แจ้งปัญหาการเชื่อมต่อ / คำขอค้าง' },
  { phase: 'LEAVE_CONFIRM', label: 'ยืนยันออกจากห้อง' },
  { phase: 'NOT_FOUND', label: 'หน้า 404' },
] as const;

export type PreviewPhase = typeof PREVIEW_PHASES[number]['phase'];
export type PreviewState = 'active' | 'waiting' | 'blocked' | 'guessed';
export interface PreviewOptions {
  phase: PreviewPhase;
  role: RoleId;
  roundIndex: number;
  clueIndex: number;
  seat: 0 | 1;
  state: PreviewState;
}

export interface PreviewInteraction {
  submitted: boolean;
  answer: string | null;
  guess: RoleId | null;
  ready: boolean;
}

// Fixed display examples; these are never submitted to the game engine.
const ROUND_SCORES: Array<[number, number]> = [[5, 0], [4, 3], [0, 5], [2, 2]];

export function createPreviewSnapshot(
  options: PreviewOptions,
  scenarios: Scenario[],
  interaction: PreviewInteraction,
): RoomSnapshot {
  const { phase, role, roundIndex, clueIndex, seat, state } = options;
  const opponentSeat = seat === 0 ? 1 : 0;
  const opponentRole = ROLE_IDS[(ROLE_IDS.indexOf(role) + 1) % ROLE_IDS.length];
  const roles: [RoleId, RoleId] = seat === 0 ? [role, opponentRole] : [opponentRole, role];
  const wrongGuess = ROLE_IDS.find(candidate => !roles.includes(candidate))!;
  const revealedAnswers = scenarios.map((scenario, index) => ({
    clueIndex: index,
    answers: [scenario.options[0].id, scenario.options[2].id] as [string, string],
  }));
  const evidence = scenarios.map((scenario, index) => ({
    clueIndex: index,
    scenarioId: scenario.id,
    scenarioVersion: scenario.version,
    prompt: scenario.prompt,
    answers: [scenario.options[0].label, scenario.options[2].label] as [string, string],
  }));
  const history: Array<RoundResult & { evidence: typeof evidence }> = ROUND_SCORES.map((scores, index) => ({
    roundIndex: index,
    roles,
    guesses: [scores[0] ? roles[1] : wrongGuess, scores[1] ? roles[0] : wrongGuess],
    guessClueIndex: scores.map(score => score ? SCORE_TABLE.indexOf(score) : 0) as [number, number],
    scores,
    reason: scores.map(score => score
      ? `ทายถูกหลังข้อที่ ${SCORE_TABLE.indexOf(score) + 1} ได้ ${score} คะแนน`
      : 'ทายไม่ตรงกับบทบาทของอีกฝ่าย จึงได้ 0 คะแนน') as [string, string],
    evidence,
  }));
  const completedRounds = phase === 'MATCH_RESULT' ? 4 : roundIndex + (phase === 'ROUND_REVEAL' ? 1 : 0);
  const roundHistory = history.slice(0, completedRounds);
  const matchScores: [number, number] = [0, 0];
  for (const round of roundHistory) {
    matchScores[0] += round.scores[0];
    matchScores[1] += round.scores[1];
  }
  const submitted = state === 'waiting' || interaction.submitted;
  const guessed = state === 'guessed' || interaction.guess !== null;
  const roundId = phase === 'LOBBY' ? null : `preview-round-${roundIndex}`;
  const myAnswer = interaction.answer ?? (state === 'waiting' ? scenarios[clueIndex].options[0].id : null);
  const rematchRequests: [boolean, boolean] = [false, false];
  rematchRequests[seat] = submitted;

  return {
    seat,
    isHost: seat === 0,
    public: {
      revision: 1,
      code: 'DEMOUI',
      phase,
      matchId: 'ui-preview',
      roundId,
      roundIndex,
      clueIndex,
      players: [
        { uid: 'preview-host', displayName: 'มะลิ', avatarId: 'cat', seat: 0, isHost: true, ready: seat === 0 ? interaction.ready : true },
        { uid: 'preview-guest', displayName: 'ต้น', avatarId: 'fox', seat: 1, isHost: false, ready: seat === 1 ? interaction.ready : true },
      ],
      matchScores,
      scenario: scenarios[clueIndex],
      revealedAnswers: revealedAnswers.slice(0, clueIndex + 1),
      revealedEvidence: evidence.slice(0, clueIndex + 1),
      roundHistory,
      roundSummary: phase === 'ROUND_REVEAL' ? history[roundIndex] : null,
      rematchRequests,
      termination: phase === 'ABANDONED' ? { seat: opponentSeat, displayName: opponentSeat === 0 ? 'มะลิ' : 'ต้น' } : null,
    },
    private: {
      revision: 1,
      matchId: 'ui-preview',
      roundId,
      phase,
      clueIndex,
      role,
      guess: guessed ? interaction.guess ?? opponentRole : null,
      guessClueIndex: guessed ? Math.max(0, clueIndex - 1) : null,
      committedAnswer: myAnswer,
      hasGuessed: guessed,
      // Entering these sample phases means the role acknowledgement already happened.
      roleAcknowledged: submitted || ['ANSWERING', 'ANSWER_REVEAL', 'DECIDING', 'ROUND_REVEAL', 'MATCH_RESULT'].includes(phase),
      answerSubmitted: myAnswer !== null,
      revealAcknowledged: submitted,
      decisionSubmitted: submitted,
      nextRoundReady: submitted,
      rematchRequested: submitted,
    },
  };
}
