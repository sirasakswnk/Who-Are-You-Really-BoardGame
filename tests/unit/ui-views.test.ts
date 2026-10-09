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
import AbandonedView from '@/components/game/AbandonedView';
import RoomConnectionStatus from '@/components/game/RoomConnectionStatus';
import { clientSnapshot } from '../helpers/clientSnapshot';
import { SCENARIOS, stripEditorial } from '@/content/scenarios';
import { ROLES, PlayerSeat, type RoundResult } from '@/lib/game/types';

describe('F04 server-owned submission flags after reload', () => {
  const scenario = stripEditorial(SCENARIOS[0]);
  it('shows the role wait state from the persisted acknowledgement', () => {
    const html = renderToString(React.createElement(RoleIntroView, {
      myRole: 'saver', roundIndex: 0, hasAcknowledged: true, onAcknowledgeRole: async () => {},
    }));
    expect(html).toContain('กำลังรออีกฝ่าย'); expect(html).not.toContain('acknowledge-role-btn');
  });
  it('shows a locked answer after reload and does not offer another submission', () => {
    const html = renderToString(React.createElement(AnsweringView, {
      scenario, clueIndex: 0, myCommittedAnswer: scenario.options[0].id, opponentHasAnswered: false, onSubmitAnswer: async () => {},
    }));
    expect(html).toContain('ล็อกคำตอบแล้ว'); expect(html).not.toContain('submit-answer-btn');
  });
  it('shows the reveal wait state from the persisted acknowledgement', () => {
    const html = renderToString(React.createElement(AnswerRevealView, {
      scenario, clueIndex: 0, mySeat: 0, players: [mockPlayer0, mockPlayer1], revealedAnswers: [],
      hasAcknowledged: true, onAcknowledgeReveal: async () => {},
    }));
    expect(html).toContain('รออีกฝ่ายพร้อม'); expect(html).not.toContain('proceed-decide-btn');
  });
  it.each([false, true])('shows a waiting decision with hasGuessed=%s instead of another continue/ack', hasGuessed => {
    const html = renderToString(React.createElement(DecidingView, {
      clueIndex: 0, myRole: 'saver', hasGuessed, myGuessedRole: hasGuessed ? 'comfort' : null,
      myGuessedClueIndex: hasGuessed ? 0 : null, hasSubmitted: true, onSubmitDecision: async () => {},
    }));
    expect(html).toContain('รออีกฝ่ายพร้อม'); expect(html).not.toContain('continue-clue-btn');
    expect(html).not.toContain('lock-guess-btn'); expect(html).not.toContain('proceed-btn');
  });
  it('shows next-round waiting from persisted readiness', () => {
    const html = renderToString(React.createElement(RoundRevealView, {
      roundSummary: { roundIndex: 0, roles: ['saver', 'comfort'], guesses: ['comfort', 'saver'], guessClueIndex: [0, 0], scores: [5, 5], reason: ['', ''] },
      roundIndex: 0, mySeat: 0, players: [mockPlayer0, mockPlayer1], matchScores: [5, 5],
      hasAcknowledged: true, onNextRoundReady: async () => {},
    }));
    expect(html).toContain('waiting-opponent-banner'); expect(html).not.toContain('next-round-btn');
  });
  it('disables an otherwise valid acknowledgement while a request is unresolved', () => {
    const html = renderToString(React.createElement(RoleIntroView, {
      myRole: 'saver', roundIndex: 0, hasAcknowledged: false, actionBlocked: true, onAcknowledgeRole: async () => {},
    }));
    expect(html).toMatch(/class="[^"]*acknowledge-role-btn[^"]*"[^>]*disabled=""/);
  });
});

describe('F05 departure and connection UI', () => {
  it('shows a termination reason without declaring a winner or revealing a role', () => {
    const html = renderToString(React.createElement(AbandonedView, { displayName: 'คู่เล่น', busy: true, onLeave: () => {} }));
    expect(html).toContain('ไม่มีผู้ชนะเต็มเกม'); expect(html).toContain('เกมยุติแล้ว');
    expect(html).toMatch(/<button[^>]*disabled=""/); expect(html).not.toContain('saver');
  });
  it('distinguishes unknown presence from offline and shows retained seats after confirmed disconnection', () => {
    const snapshot = clientSnapshot();
    const unknown = renderToString(React.createElement(RoomConnectionStatus, { snapshot, presence: { known: false, online: {}, error: null } }));
    expect(unknown).toContain('กำลังตรวจการเชื่อมต่อ'); expect(unknown).not.toContain('หลุดการเชื่อมต่อ');
    const offline = renderToString(React.createElement(RoomConnectionStatus, { snapshot, presence: { known: true, online: {}, error: null } }));
    expect(offline).toContain('ที่นั่งยังถูกเก็บไว้');
  });
  it('uses only the caller submission flag for the neutral barrier label while the opponent is online', () => {
    const snapshot = clientSnapshot('DECIDING'); snapshot.private.decisionSubmitted = true;
    const html = renderToString(React.createElement(RoomConnectionStatus, { snapshot, presence: { known: true, online: { guest: true }, error: null } }));
    expect(html).toContain('สอง ออนไลน์'); expect(html).toContain('กำลังรอให้ครบทั้งสองคน');
    expect(html).not.toContain('ทาย'); expect(html).not.toContain('saver');
  });
});

describe('F06 content snapshots and persisted notes UI', () => {
  it('renders previous answers from their own scenario snapshot even when option ids are reused', () => {
    const scenario = { ...stripEditorial(SCENARIOS[0]), options: [{ id: 'raw-choice-a', label: 'ข้อความข้อปัจจุบัน' }, { id: 'raw-choice-b', label: 'ข้อความข้อปัจจุบัน B' }] };
    const html = renderToString(React.createElement(AnswerRevealView, {
      scenario, clueIndex: 1, mySeat: 0, players: [mockPlayer0, mockPlayer1], onAcknowledgeReveal: async () => {},
      revealedAnswers: [{ clueIndex: 0, answers: ['raw-choice-a', 'raw-choice-b'] }, { clueIndex: 1, answers: ['raw-choice-a', 'raw-choice-b'] }],
      evidence: [{ clueIndex: 0, scenarioId: 'old', scenarioVersion: 1, prompt: 'สถานการณ์เดิม', answers: ['คำตอบเดิม A', 'คำตอบเดิม B'] },
        { clueIndex: 1, scenarioId: 'now', scenarioVersion: 2, prompt: 'สถานการณ์ปัจจุบัน', answers: ['ข้อความข้อปัจจุบัน', 'ข้อความข้อปัจจุบัน B'] }],
    }));
    for (const text of ['สถานการณ์เดิม', 'คำตอบเดิม A', 'คำตอบเดิม B', 'ข้อความข้อปัจจุบัน']) expect(html).toContain(text);
    expect(html).not.toContain('raw-choice');
  });
  it('renders all completed evidence, guesses, guess timing and reasons with no raw role or option id', () => {
    const html = renderToString(React.createElement(MatchResultView, {
      mySeat: 1, players: [mockPlayer0, mockPlayer1], matchScores: [14, 14], rematchRequests: [false, false],
      onRequestRematch: async () => {}, onBackToHome: () => {}, roundHistory: Array.from({ length: 4 }, (_, roundIndex): RoundResult => ({
        roundIndex, roles: ['saver', 'comfort'], guesses: ['comfort', 'saver'], guessClueIndex: [roundIndex, roundIndex], scores: [5 - roundIndex, 5 - roundIndex],
        reason: ['ทายตรงกับบทบาท', 'ทายตรงกับบทบาท'], evidence: [{ clueIndex: 0, scenarioId: 'unused-in-ui', scenarioVersion: 1, prompt: `หลักฐานรอบ ${roundIndex + 1}`, answers: ['คำตอบของคนแรก', 'คำตอบของคนที่สอง'] }],
      })),
    }));
    for (const text of ['หลักฐานรอบ 1', 'หลักฐานรอบ 4', 'หลังข้อที่ 4', 'ทายตรงกับบทบาท', 'คำตอบของคนแรก', 'คำตอบของคนที่สอง']) expect(html).toContain(text);
    expect(html).not.toContain('unused-in-ui'); expect(html).not.toContain('saver');
  });
  it('shows retained suspicion tags after the decision view remounts', () => {
    const html = renderToString(React.createElement(DecidingView, { clueIndex: 2, myRole: 'saver', hasGuessed: false,
      myGuessedRole: null, myGuessedClueIndex: null, scratchpad: { comfort: 'suspect', explorer: 'cleared' }, onSubmitDecision: async () => {} }));
    expect(html).toContain('note-suspect'); expect(html).toContain('note-cleared'); expect(html).toContain('aria-pressed="true"');
  });
});

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
