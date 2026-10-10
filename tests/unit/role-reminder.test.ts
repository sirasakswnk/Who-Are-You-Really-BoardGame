import { describe, expect, it } from 'vitest';
import { createElement, Fragment } from 'react';
import { renderToString } from 'react-dom/server';
import GameHeader from '@/components/game/GameHeader';
import AnsweringView from '@/components/game/AnsweringView';
import AnswerRevealView from '@/components/game/AnswerRevealView';
import DecidingView from '@/components/game/DecidingView';
import { SCENARIOS, stripEditorial } from '@/content/scenarios';
import { ROLE_IDS, ROLES, type GamePhase, type RoleId } from '@/lib/game/types';

function header(phase: GamePhase, role: RoleId | null, acknowledged: boolean) {
  return renderToString(createElement(Fragment, null, createElement(GameHeader, {
    roomCode: 'TEST01', phase, roundIndex: 0, clueIndex: 0, mySeat: 0,
    scores: [0, 0], onOpenRules: () => {}, onLeaveRoom: () => {},
    myRole: role, roleAcknowledged: acknowledged, roleContextKey: 'match-one:round-one',
  }), phase === 'ANSWERING' ? createElement(AnsweringView, {
    scenario: stripEditorial(SCENARIOS[0]), clueIndex: 0,
    myCommittedAnswer: null, opponentHasAnswered: false, onSubmitAnswer: async () => {},
    myRole: role, roleAcknowledged: acknowledged, roleContextKey: 'match-one:round-one',
  }) : phase === 'ANSWER_REVEAL' ? createElement(AnswerRevealView, {
    scenario: stripEditorial(SCENARIOS[0]), clueIndex: 0, mySeat: 0, players: [null, null],
    revealedAnswers: [], onAcknowledgeReveal: async () => {},
    myRole: role, roleAcknowledged: acknowledged, roleContextKey: 'match-one:round-one',
  }) : phase === 'DECIDING' ? createElement(DecidingView, {
    clueIndex: 0, myRole: role, hasGuessed: false, myGuessedRole: null, myGuessedClueIndex: null,
    onSubmitDecision: async () => {}, roleAcknowledged: acknowledged, roleContextKey: 'match-one:round-one',
  }) : null));
}

describe('Role reminder visibility from the current private role acknowledgement', () => {
  const phases: GamePhase[] = ['LOBBY', 'ROLE_INTRO', 'ANSWERING', 'ANSWER_REVEAL',
    'DECIDING', 'ROUND_REVEAL', 'MATCH_RESULT', 'ABANDONED', 'CLOSED'];

  it.each(phases)('does not offer a role reminder before acknowledgement in %s', phase => {
    expect(header(phase, 'saver', false)).not.toContain('role-reminder-row');
  });
  it.each(phases)('does not offer a role reminder when the private role is absent in %s', phase => {
    expect(header(phase, null, true)).not.toContain('role-reminder-row');
  });
  it.each(['LOBBY','ROUND_REVEAL','MATCH_RESULT','ABANDONED','CLOSED'] as GamePhase[])(
    'hides the reminder outside the secret-role part of a round in %s', phase => {
      expect(header(phase, 'saver', true)).not.toContain('role-reminder-row');
    });
  it.each(['ROLE_INTRO','ANSWERING','ANSWER_REVEAL','DECIDING'] as GamePhase[])(
    'offers the reminder at the screen controls after acknowledgement in %s', phase => {
      const html = header(phase, 'saver', true);
      expect(html).toContain('role-reminder-row');
      if (phase === 'ANSWERING') {
        expect(html.indexOf('role-reminder-row')).toBeGreaterThan(html.indexOf('scenario-folder-tab'));
        expect(html.indexOf('role-reminder-row')).toBeLessThan(html.indexOf('scenario-meta-row'));
      } else if (phase === 'ANSWER_REVEAL') {
        expect(html.indexOf('role-reminder-row')).toBeGreaterThan(html.indexOf('reveal-folder-tab'));
        expect(html.indexOf('role-reminder-row')).toBeLessThan(html.indexOf('reveal-header'));
      } else if (phase === 'DECIDING') {
        expect(html.indexOf('role-reminder-row')).toBeGreaterThan(html.indexOf('deciding-folder-tab'));
        expect(html.indexOf('role-reminder-row')).toBeLessThan(html.indexOf('deciding-header'));
      } else {
        expect(html.indexOf('role-reminder-row')).toBeGreaterThan(html.indexOf('game-header-actions'));
        expect(html.indexOf('role-reminder-row')).toBeLessThan(html.indexOf('aria-label="กติกา"'));
      }
      expect(html).toContain('aria-haspopup="dialog"');
      expect(html).toContain('aria-expanded="false"');
      expect(html).not.toContain('<dialog open');
    });
  it.each(ROLE_IDS)('uses the exact assigned %s role description from the catalog', role => {
    const html=header('ANSWERING',role,true);
    expect(html).toContain(ROLES[role].name);
    expect(html).toContain(ROLES[role].description);
  });
});
