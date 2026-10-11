import { describe, it, expect } from 'vitest';
import {
  createInitialGameState,
  processAction,
  getPlayerProjection,
} from '../../lib/game/engine';
import { GameState, RoleId } from '../../lib/game/types';

describe('Game Engine State Machine', () => {
  function setupTwoPlayerLobby(): GameState {
    let state = createInitialGameState('ROOM-101');
    const res1 = processAction(state, {
      type: 'PLAYER_JOIN',
      seat: 0,
      uid: 'uid-p0',
      displayName: 'สมชาย',
      avatarId: 'cat',
      isHost: true,
    });
    state = res1.state;

    const res2 = processAction(state, {
      type: 'PLAYER_JOIN',
      seat: 1,
      uid: 'uid-p1',
      displayName: 'สมหญิง',
      avatarId: 'fox',
    });
    state = res2.state;

    state = processAction(state, { type: 'PLAYER_READY', seat: 0, ready: true }).state;
    state = processAction(state, { type: 'PLAYER_READY', seat: 1, ready: true }).state;

    return state;
  }

  describe('Lobby & Start Phase', () => {
    it('prevents starting match if one player is not ready', () => {
      let state = createInitialGameState('ROOM-101');
      state = processAction(state, {
        type: 'PLAYER_JOIN',
        seat: 0,
        uid: 'uid-p0',
        displayName: 'สมชาย',
        avatarId: 'cat',
      }).state;
      state = processAction(state, {
        type: 'PLAYER_JOIN',
        seat: 1,
        uid: 'uid-p1',
        displayName: 'สมหญิง',
        avatarId: 'fox',
      }).state;
      state = processAction(state, { type: 'PLAYER_READY', seat: 0, ready: true }).state;
      // seat 1 is not ready
      const res = processAction(state, { type: 'START_MATCH' });
      expect(res.success).toBe(false);
      expect(res.error).toContain('Both players must be ready');
    });

    it('prevents third player from taking occupied seat', () => {
      const state = setupTwoPlayerLobby();
      const res = processAction(state, {
        type: 'PLAYER_JOIN',
        seat: 0,
        uid: 'uid-intruder',
        displayName: 'คนแปลกหน้า',
        avatarId: 'owl',
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain('already occupied');
    });

    it('starts match when both ready and transitions to ROLE_INTRO', () => {
      const state = setupTwoPlayerLobby();
      const res = processAction(state, {
        type: 'START_MATCH',
        rolePair: ['alien', 'spy'],
      });
      expect(res.success).toBe(true);
      expect(res.state.phase).toBe('ROLE_INTRO');
      expect(res.state.currentRound?.roles).toEqual(['alien', 'spy']);
    });
  });

  describe('Role Intro & Acknowledgment', () => {
    it('transitions to ANSWERING only after both players acknowledge their role', () => {
      let state = setupTwoPlayerLobby();
      state = processAction(state, {
        type: 'START_MATCH',
        rolePair: ['alien', 'spy'],
      }).state;

      // Seat 0 acks
      let res = processAction(state, { type: 'ROLE_ACK', seat: 0 });
      expect(res.success).toBe(true);
      expect(res.state.phase).toBe('ROLE_INTRO');

      // Seat 1 acks
      res = processAction(res.state, { type: 'ROLE_ACK', seat: 1 });
      expect(res.success).toBe(true);
      expect(res.state.phase).toBe('ANSWERING');
      expect(res.state.clueIndex).toBe(0);
    });
  });

  describe('Answering & Reveal Barrier', () => {
    it('locks answers upon submission and transitions to ANSWER_REVEAL when both answer', () => {
      let state = setupTwoPlayerLobby();
      state = processAction(state, {
        type: 'START_MATCH',
        rolePair: ['alien', 'spy'],
      }).state;
      state = processAction(state, { type: 'ROLE_ACK', seat: 0 }).state;
      state = processAction(state, { type: 'ROLE_ACK', seat: 1 }).state;

      // P0 answers
      let res = processAction(state, {
        type: 'SUBMIT_ANSWER',
        seat: 0,
        clueIndex: 0,
        optionId: 'opt-a',
      });
      expect(res.success).toBe(true);
      expect(res.state.phase).toBe('ANSWERING');

      // P0 attempts duplicate answer -> rejected
      const dupRes = processAction(res.state, {
        type: 'SUBMIT_ANSWER',
        seat: 0,
        clueIndex: 0,
        optionId: 'opt-b',
      });
      expect(dupRes.success).toBe(false);
      expect(dupRes.error).toContain('already submitted');

      // P1 answers -> both answered, transitions to ANSWER_REVEAL
      res = processAction(res.state, {
        type: 'SUBMIT_ANSWER',
        seat: 1,
        clueIndex: 0,
        optionId: 'opt-c',
      });
      expect(res.success).toBe(true);
      expect(res.state.phase).toBe('ANSWER_REVEAL');
      expect(res.state.currentRound?.revealedAnswers).toHaveLength(1);
      expect(res.state.currentRound?.revealedAnswers[0].answers).toEqual(['opt-a', 'opt-c']);
    });

    it('requires both players to ack reveal before going to DECIDING', () => {
      let state = setupTwoPlayerLobby();
      state = processAction(state, { type: 'START_MATCH', rolePair: ['alien', 'spy'] }).state;
      state = processAction(state, { type: 'ROLE_ACK', seat: 0 }).state;
      state = processAction(state, { type: 'ROLE_ACK', seat: 1 }).state;
      state = processAction(state, { type: 'SUBMIT_ANSWER', seat: 0, clueIndex: 0, optionId: 'opt-a' }).state;
      state = processAction(state, { type: 'SUBMIT_ANSWER', seat: 1, clueIndex: 0, optionId: 'opt-b' }).state;

      expect(state.phase).toBe('ANSWER_REVEAL');

      state = processAction(state, { type: 'REVEAL_ACK', seat: 0, clueIndex: 0 }).state;
      expect(state.phase).toBe('ANSWER_REVEAL');

      state = processAction(state, { type: 'REVEAL_ACK', seat: 1, clueIndex: 0 }).state;
      expect(state.phase).toBe('DECIDING');
    });
  });

  describe('Decision Barrier & Guess Validation', () => {
    function reachDecidingPhase(clueIndex = 0): GameState {
      let state = setupTwoPlayerLobby();
      state = processAction(state, { type: 'START_MATCH', rolePair: ['alien', 'spy'] }).state;
      state = processAction(state, { type: 'ROLE_ACK', seat: 0 }).state;
      state = processAction(state, { type: 'ROLE_ACK', seat: 1 }).state;
      state = processAction(state, { type: 'SUBMIT_ANSWER', seat: 0, clueIndex, optionId: 'opt-a' }).state;
      state = processAction(state, { type: 'SUBMIT_ANSWER', seat: 1, clueIndex, optionId: 'opt-b' }).state;
      state = processAction(state, { type: 'REVEAL_ACK', seat: 0, clueIndex }).state;
      state = processAction(state, { type: 'REVEAL_ACK', seat: 1, clueIndex }).state;
      return state;
    }

    it('disallows guessing own role', () => {
      const state = reachDecidingPhase(0);
      // P0 role is 'alien'
      const res = processAction(state, {
        type: 'SUBMIT_DECISION',
        seat: 0,
        clueIndex: 0,
        decision: { type: 'guess', roleId: 'alien' },
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain('Cannot guess your own role');
    });

    it('advances to next clue when at least one continues and not final clue', () => {
      let state = reachDecidingPhase(0);

      // P0 continues, P1 continues
      state = processAction(state, {
        type: 'SUBMIT_DECISION',
        seat: 0,
        clueIndex: 0,
        decision: { type: 'continue' },
      }).state;
      state = processAction(state, {
        type: 'SUBMIT_DECISION',
        seat: 1,
        clueIndex: 0,
        decision: { type: 'continue' },
      }).state;

      expect(state.phase).toBe('ANSWERING');
      expect(state.clueIndex).toBe(1);
    });

    it('triggers early round reveal when BOTH players have guessed at clue 0', () => {
      let state = reachDecidingPhase(0);

      // P0 guesses 'spy' (P1's actual role)
      state = processAction(state, {
        type: 'SUBMIT_DECISION',
        seat: 0,
        clueIndex: 0,
        decision: { type: 'guess', roleId: 'spy' },
      }).state;

      // P1 guesses 'alien' (P0's actual role)
      state = processAction(state, {
        type: 'SUBMIT_DECISION',
        seat: 1,
        clueIndex: 0,
        decision: { type: 'guess', roleId: 'alien' },
      }).state;

      // Both guessed -> immediate ROUND_REVEAL!
      expect(state.phase).toBe('ROUND_REVEAL');
      expect(state.matchScores).toEqual([5, 5]); // Both guessed at clue 0 (+5 each)
      expect(state.roundHistory).toHaveLength(1);
    });

    it('requires player who already guessed to submit ack and still answer future clues', () => {
      let state = reachDecidingPhase(0);

      // P0 guesses at clue 0, P1 continues
      state = processAction(state, {
        type: 'SUBMIT_DECISION',
        seat: 0,
        clueIndex: 0,
        decision: { type: 'guess', roleId: 'spy' },
      }).state;
      state = processAction(state, {
        type: 'SUBMIT_DECISION',
        seat: 1,
        clueIndex: 0,
        decision: { type: 'continue' },
      }).state;

      // Advances to clue 1 ANSWERING
      expect(state.phase).toBe('ANSWERING');
      expect(state.clueIndex).toBe(1);

      // P0 (who guessed) MUST still submit an answer
      state = processAction(state, {
        type: 'SUBMIT_ANSWER',
        seat: 0,
        clueIndex: 1,
        optionId: 'opt-a',
      }).state;
      state = processAction(state, {
        type: 'SUBMIT_ANSWER',
        seat: 1,
        clueIndex: 1,
        optionId: 'opt-b',
      }).state;

      expect(state.phase).toBe('ANSWER_REVEAL');
      state = processAction(state, { type: 'REVEAL_ACK', seat: 0, clueIndex: 1 }).state;
      state = processAction(state, { type: 'REVEAL_ACK', seat: 1, clueIndex: 1 }).state;

      expect(state.phase).toBe('DECIDING');

      // P0 tries to guess again -> rejected
      const reguessRes = processAction(state, {
        type: 'SUBMIT_DECISION',
        seat: 0,
        clueIndex: 1,
        decision: { type: 'guess', roleId: 'vampire' },
      });
      expect(reguessRes.success).toBe(false);
      expect(reguessRes.error).toContain('already guessed; must submit ack');

      // P0 submits 'ack' -> succeeds
      const ackRes = processAction(state, {
        type: 'SUBMIT_DECISION',
        seat: 0,
        clueIndex: 1,
        decision: { type: 'ack' },
      });
      expect(ackRes.success).toBe(true);
    });

    it('enforces forced guess at clue 3 (clue 4)', () => {
      // Progress through clues 0, 1, 2 with continues
      let state = reachDecidingPhase(0);
      for (let c = 0; c < 3; c++) {
        state = processAction(state, { type: 'SUBMIT_DECISION', seat: 0, clueIndex: c, decision: { type: 'continue' } }).state;
        state = processAction(state, { type: 'SUBMIT_DECISION', seat: 1, clueIndex: c, decision: { type: 'continue' } }).state;
        if (c < 2) {
          state = processAction(state, { type: 'SUBMIT_ANSWER', seat: 0, clueIndex: c + 1, optionId: 'opt-a' }).state;
          state = processAction(state, { type: 'SUBMIT_ANSWER', seat: 1, clueIndex: c + 1, optionId: 'opt-b' }).state;
          state = processAction(state, { type: 'REVEAL_ACK', seat: 0, clueIndex: c + 1 }).state;
          state = processAction(state, { type: 'REVEAL_ACK', seat: 1, clueIndex: c + 1 }).state;
        }
      }

      // Now at clue 3 ANSWERING
      expect(state.clueIndex).toBe(3);
      expect(state.phase).toBe('ANSWERING');

      state = processAction(state, { type: 'SUBMIT_ANSWER', seat: 0, clueIndex: 3, optionId: 'opt-a' }).state;
      state = processAction(state, { type: 'SUBMIT_ANSWER', seat: 1, clueIndex: 3, optionId: 'opt-b' }).state;
      state = processAction(state, { type: 'REVEAL_ACK', seat: 0, clueIndex: 3 }).state;
      state = processAction(state, { type: 'REVEAL_ACK', seat: 1, clueIndex: 3 }).state;

      expect(state.phase).toBe('DECIDING');

      // Attempting to continue at clue 3 must fail!
      const contRes = processAction(state, {
        type: 'SUBMIT_DECISION',
        seat: 0,
        clueIndex: 3,
        decision: { type: 'continue' },
      });
      expect(contRes.success).toBe(false);
      expect(contRes.error).toContain('Cannot continue at final clue');

      // Valid guesses at clue 3
      state = processAction(state, {
        type: 'SUBMIT_DECISION',
        seat: 0,
        clueIndex: 3,
        decision: { type: 'guess', roleId: 'spy' }, // correct (+2)
      }).state;
      state = processAction(state, {
        type: 'SUBMIT_DECISION',
        seat: 1,
        clueIndex: 3,
        decision: { type: 'guess', roleId: 'vampire' }, // incorrect (0)
      }).state;

      expect(state.phase).toBe('ROUND_REVEAL');
      expect(state.matchScores).toEqual([2, 0]);
    });
  });

  describe('Full 4-Round Match Playthrough & Rematch', () => {
    it('plays through all 4 rounds deterministically and reaches MATCH_RESULT', () => {
      let state = setupTwoPlayerLobby();

      const scriptedRoles: Array<[RoleId, RoleId]> = [
        ['alien', 'spy'],
        ['vampire', 'time_traveler'],
        ['thief', 'ghost'],
        ['spy', 'alien'],
      ];

      // Round 0
      state = processAction(state, {
        type: 'START_MATCH',
        rolePair: scriptedRoles[0],
      }).state;

      for (let r = 0; r < 4; r++) {
        // ROLE_INTRO
        expect(state.phase).toBe('ROLE_INTRO');
        expect(state.roundIndex).toBe(r);
        state = processAction(state, { type: 'ROLE_ACK', seat: 0 }).state;
        state = processAction(state, { type: 'ROLE_ACK', seat: 1 }).state;

        // Clue 0 ANSWERING
        expect(state.phase).toBe('ANSWERING');
        state = processAction(state, { type: 'SUBMIT_ANSWER', seat: 0, clueIndex: 0, optionId: 'opt-a' }).state;
        state = processAction(state, { type: 'SUBMIT_ANSWER', seat: 1, clueIndex: 0, optionId: 'opt-b' }).state;

        // ANSWER_REVEAL
        expect(state.phase).toBe('ANSWER_REVEAL');
        state = processAction(state, { type: 'REVEAL_ACK', seat: 0, clueIndex: 0 }).state;
        state = processAction(state, { type: 'REVEAL_ACK', seat: 1, clueIndex: 0 }).state;

        // DECIDING: Both guess immediately at clue 0
        expect(state.phase).toBe('DECIDING');
        // P0 guesses opponent role, P1 guesses wrong role
        const opponentRole = state.currentRound!.roles[1];
        state = processAction(state, {
          type: 'SUBMIT_DECISION',
          seat: 0,
          clueIndex: 0,
          decision: { type: 'guess', roleId: opponentRole },
        }).state;
        // P1 guesses wrong role (distinct from both P0 actual role and P1 own role)
        const actualP0Role = state.currentRound!.roles[0];
        const ownP1Role = state.currentRound!.roles[1];
        const wrongRole = (['alien', 'spy', 'vampire', 'time_traveler', 'thief', 'ghost'] as const)
          .find((r) => r !== actualP0Role && r !== ownP1Role)!;
        state = processAction(state, {
          type: 'SUBMIT_DECISION',
          seat: 1,
          clueIndex: 0,
          decision: { type: 'guess', roleId: wrongRole },
        }).state;

        // ROUND_REVEAL
        expect(state.phase).toBe('ROUND_REVEAL');

        // Transition to next round or match result
        state = processAction(state, {
          type: 'NEXT_ROUND_READY',
          seat: 0,
          nextRolePair: scriptedRoles[(r + 1) % 4],
        }).state;
        state = processAction(state, {
          type: 'NEXT_ROUND_READY',
          seat: 1,
          nextRolePair: scriptedRoles[(r + 1) % 4],
        }).state;
      }

      // After 4 rounds, must be in MATCH_RESULT
      expect(state.phase).toBe('MATCH_RESULT');
      expect(state.roundHistory).toHaveLength(4);
      // P0 got 5 pts each round * 4 = 20 pts. P1 got 0 pts each round = 0 pts.
      expect(state.matchScores).toEqual([20, 0]);

      // Rematch request from both players resets back to LOBBY
      state = processAction(state, { type: 'REMATCH_REQUEST', seat: 0 }).state;
      expect(state.phase).toBe('MATCH_RESULT');
      state = processAction(state, { type: 'REMATCH_REQUEST', seat: 1, nextMatchId: 'match-rematch' }).state;
      expect(state.phase).toBe('LOBBY');
      expect(state.matchScores).toEqual([0, 0]);
      expect(state.roundHistory).toHaveLength(0);
    });
  });

  describe('Privacy & Projections', () => {
    it('never exposes opponent secret role or unrevealed answers in player projection', () => {
      let state = setupTwoPlayerLobby();
      state = processAction(state, {
        type: 'START_MATCH',
        rolePair: ['alien', 'spy'],
      }).state;
      state = processAction(state, { type: 'ROLE_ACK', seat: 0 }).state;
      state = processAction(state, { type: 'ROLE_ACK', seat: 1 }).state;

      // P0 answers, P1 has not answered
      state = processAction(state, {
        type: 'SUBMIT_ANSWER',
        seat: 0,
        clueIndex: 0,
        optionId: 'opt-a',
      }).state;

      const proj0 = getPlayerProjection(state, 0);
      const proj1 = getPlayerProjection(state, 1);

      // P0 projection checks
      expect(proj0.myRole).toBe('alien');
      expect(proj0.myCommittedAnswer).toBe('opt-a');
      expect(proj0.opponentHasAnswered).toBe(false);

      // P1 projection checks: must NOT know P0 role or P0 answer!
      expect(proj1.myRole).toBe('spy');
      expect(proj1.myCommittedAnswer).toBeNull();
      expect(proj1.opponentHasAnswered).toBe(true); // P1 knows P0 answered
      expect(proj1.revealedAnswers).toEqual([]);     // but options are hidden
    });

    it('never exposes opponent decision or guess during DECIDING phase', () => {
      let state = setupTwoPlayerLobby();
      state = processAction(state, { type: 'START_MATCH', rolePair: ['alien', 'spy'] }).state;
      state = processAction(state, { type: 'ROLE_ACK', seat: 0 }).state;
      state = processAction(state, { type: 'ROLE_ACK', seat: 1 }).state;
      state = processAction(state, { type: 'SUBMIT_ANSWER', seat: 0, clueIndex: 0, optionId: 'opt-a' }).state;
      state = processAction(state, { type: 'SUBMIT_ANSWER', seat: 1, clueIndex: 0, optionId: 'opt-b' }).state;
      state = processAction(state, { type: 'REVEAL_ACK', seat: 0, clueIndex: 0 }).state;
      state = processAction(state, { type: 'REVEAL_ACK', seat: 1, clueIndex: 0 }).state;

      // P1 submits a guess
      state = processAction(state, {
        type: 'SUBMIT_DECISION',
        seat: 1,
        clueIndex: 0,
        decision: { type: 'guess', roleId: 'alien' },
      }).state;

      // Check P0's projection: P0 must NOT know whether P1 guessed or continued!
      const proj0 = getPlayerProjection(state, 0);
      expect(proj0.bothDecisionsSubmitted).toBe(false);
      expect(proj0.roundSummary).toBeNull();
      const projRecord = proj0 as unknown as Record<string, unknown>;
      expect(projRecord['opponentDecision']).toBeUndefined();
      expect(projRecord['opponentGuess']).toBeUndefined();
    });
  });
});
