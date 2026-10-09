import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import React from 'react';
import RulesModal from '@/components/game/RulesModal';
import GameHeader from '@/components/game/GameHeader';
import LobbyView from '@/components/game/LobbyView';
import RoleIntroView from '@/components/game/RoleIntroView';
import AnsweringView from '@/components/game/AnsweringView';
import AnswerRevealView from '@/components/game/AnswerRevealView';
import DecidingView from '@/components/game/DecidingView';
import RoundRevealView from '@/components/game/RoundRevealView';
import MatchResultView from '@/components/game/MatchResultView';
import { SCENARIOS, stripEditorial } from '@/content/scenarios';
import { ROLES, PlayerSeat } from '@/lib/game/types';

const mockPlayer0: PlayerSeat = {
  uid: 'u1',
  displayName: 'Detective A',
  avatarId: 'cat',
  seat: 0,
  isHost: true,
  ready: true,
};

const mockPlayer1: PlayerSeat = {
  uid: 'u2',
  displayName: 'Detective B',
  avatarId: 'fox',
  seat: 1,
  isHost: false,
  ready: false,
};

describe('M4 Mobile UI Views Server Rendering & Contract Tests', () => {
  it('renders RulesModal without throwing', () => {
    const html = renderToString(
      React.createElement(RulesModal, {
        isOpen: true,
        onClose: () => {},
      })
    );
    expect(html).toContain('คู่มือนักสืบ &amp; กติกาการเล่น');
    expect(html).toContain('กฎข้อสำคัญ');
    expect(html).toContain('ตารางคะแนน');
  });

  it('renders GameHeader across different phases', () => {
    const html = renderToString(
      React.createElement(GameHeader, {
        roomCode: 'TEST01',
        phase: 'ANSWERING',
        roundIndex: 1,
        clueIndex: 2,
        mySeat: 0,
        scores: [4, 5],
        onOpenRules: () => {},
        onLeaveRoom: () => {},
      })
    );
    expect(html).toContain('TEST01');
    expect(html).toContain('รอบที่');
    expect(html).toContain('คะแนน:');
  });

  it('renders LobbyView with players', () => {
    const html = renderToString(
      React.createElement(LobbyView, {
        roomCode: 'ABC123',
        players: [mockPlayer0, mockPlayer1],
        mySeat: 0,
        isHost: true,
        onToggleReady: async () => {},
        onStartMatch: async () => {},
        onOpenRules: () => {},
      })
    );
    expect(html).toContain('ABC123');
    expect(html).toContain('Detective A');
    expect(html).toContain('Detective B');
    expect(html).toContain('พร้อมแล้ว');
  });

  it('renders RoleIntroView with secret role and traits', () => {
    const html = renderToString(
      React.createElement(RoleIntroView, {
        myRole: 'saver',
        roundIndex: 0,
        hasAcknowledged: false,
        onAcknowledgeRole: async () => {},
      })
    );
    const roleInfo = ROLES['saver'];
    expect(html).toContain(roleInfo.name);
    expect(html).toContain(roleInfo.description);
    expect(html).toContain('เข้าใจบทบาทแล้ว พร้อมตอบคำถาม!');
  });

  it('renders AnsweringView with active scenario options', () => {
    const scenario = stripEditorial(SCENARIOS[0]);
    const html = renderToString(
      React.createElement(AnsweringView, {
        scenario,
        clueIndex: 0,
        myCommittedAnswer: null,
        opponentHasAnswered: false,
        onSubmitAnswer: async () => {},
      })
    );
    expect(html).toContain(scenario.prompt);
    expect(html).toContain(scenario.options[0].label);
    expect(html).toContain('ยืนยันคำตอบ');
  });

  it('renders AnswerRevealView comparing answers', () => {
    const scenario = stripEditorial(SCENARIOS[0]);
    const html = renderToString(
      React.createElement(AnswerRevealView, {
        scenario,
        clueIndex: 0,
        mySeat: 0,
        players: [mockPlayer0, mockPlayer1],
        revealedAnswers: [
          { clueIndex: 0, answers: [scenario.options[0].id, scenario.options[1].id] },
        ],
        onAcknowledgeReveal: async () => {},
      })
    );
    expect(html).toContain('เปรียบเทียบคำตอบของทั้งสองฝ่าย');
    expect(html).toContain('Detective A');
    expect(html).toContain('Detective B');
    expect(html).toContain(scenario.options[0].label);
    expect(html).toContain(scenario.options[1].label);
  });

  it('renders DecidingView with 6 role suspect dossiers and action buttons', () => {
    const html = renderToString(
      React.createElement(DecidingView, {
        clueIndex: 0,
        myRole: 'saver',
        hasGuessed: false,
        myGuessedRole: null,
        myGuessedClueIndex: null,
        onSubmitDecision: async () => {},
      })
    );
    expect(html).toContain('ตัดบทบาทของคุณออกแล้ว เหลือ 5 ผู้ต้องสงสัย');
    expect(html).toContain('ล็อกคำทาย');
    expect(html).toContain('ดูสถานการณ์ต่อไป');
  });

  it('renders RoundRevealView showing secret roles and round score delta', () => {
    const html = renderToString(
      React.createElement(RoundRevealView, {
        roundSummary: {
          roundIndex: 0,
          roles: ['saver', 'comfort'],
          guesses: ['comfort', null],
          guessClueIndex: [0, null],
          scores: [5, 0],
          reason: ['คุณทายถูกที่เบาะแส 1 (+5 แต้ม)', 'เพื่อนยังไม่ได้ส่งคำทาย (+0 แต้ม)'],
        },
        roundIndex: 0,
        mySeat: 0,
        players: [mockPlayer0, mockPlayer1],
        matchScores: [5, 0],
        onNextRoundReady: async () => {},
      })
    );
    expect(html).toContain('เฉลยผลการสืบสวน');
    expect(html).toContain('Detective A');
    expect(html).toContain('Detective B');
    expect(html).toContain('+5 คะแนน');
    expect(html).toContain('+0 คะแนน');
  });

  it('renders MatchResultView displaying final winner banner and round history', () => {
    const html = renderToString(
      React.createElement(MatchResultView, {
        mySeat: 0,
        players: [mockPlayer0, mockPlayer1],
        matchScores: [14, 8],
        roundHistory: [
          { roundIndex: 0, roles: ['saver', 'comfort'], scores: [5, 0], guesses: ['comfort', null], guessClueIndex: [0, null], reason: ['', ''] },
          { roundIndex: 1, roles: ['explorer', 'companion'], scores: [4, 4], guesses: ['companion', 'explorer'], guessClueIndex: [1, 1], reason: ['', ''] },
          { roundIndex: 2, roles: ['impatient', 'cautious'], scores: [3, 2], guesses: ['cautious', 'impatient'], guessClueIndex: [2, 3], reason: ['', ''] },
          { roundIndex: 3, roles: ['comfort', 'saver'], scores: [2, 2], guesses: ['saver', 'comfort'], guessClueIndex: [3, 3], reason: ['', ''] },
        ],
        rematchRequests: [false, false],
        onRequestRematch: async () => {},
        onBackToHome: () => {},
      })
    );
    expect(html).toContain('ยินดีด้วย! คุณคือนักสืบยอดเยี่ยม!');
    expect(html).toContain('14');
    expect(html).toContain('8');
    expect(html).toContain('สรุปผลการสืบสวนทั้ง 4 รอบ');
    expect(html).toContain('ขอเล่นอีกรอบ (Rematch)');
  });
});
