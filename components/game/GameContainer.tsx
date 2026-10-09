'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ensureAnonymousAuth, rtdb } from '@/lib/firebase/client';
import { ref, onValue, off } from 'firebase/database';
import {
  PlayerSeat,
  GamePhase,
  Scenario,
  RoundResult,
  RoleId,
  DecisionAction,
} from '@/lib/game/types';
import GameHeader from './GameHeader';
import LobbyView from './LobbyView';
import RoleIntroView from './RoleIntroView';
import AnsweringView from './AnsweringView';
import AnswerRevealView from './AnswerRevealView';
import DecidingView from './DecidingView';
import RoundRevealView from './RoundRevealView';
import MatchResultView from './MatchResultView';
import RulesModal from './RulesModal';

interface GameContainerProps {
  roomCode: string;
}

interface PublicState {
  code: string;
  phase: GamePhase;
  matchId: string;
  roundIndex: number;
  clueIndex: number;
  matchScores: [number, number];
  players: [PlayerSeat | null, PlayerSeat | null];
  scenario: Scenario | null;
  revealedAnswers: Array<{ clueIndex: number; answers: [string, string] }>;
  roundSummary: RoundResult | null;
  rematchRequests: [boolean, boolean];
}

interface PrivateState {
  role: RoleId | null;
  guess: RoleId | null;
  guessClueIndex: number | null;
  committedAnswer: string | null;
  hasGuessed: boolean;
}

function normalizePublicState(pub: Partial<PublicState> | null | undefined, code: string): PublicState {
  return {
    code: pub?.code || code,
    phase: pub?.phase || 'LOBBY',
    matchId: pub?.matchId || '',
    roundIndex: pub?.roundIndex ?? 0,
    clueIndex: pub?.clueIndex ?? 0,
    matchScores: Array.isArray(pub?.matchScores)
      ? [pub.matchScores[0] ?? 0, pub.matchScores[1] ?? 0]
      : [0, 0],
    players: Array.isArray(pub?.players)
      ? [pub.players[0] ?? null, pub.players[1] ?? null]
      : [null, null],
    scenario: pub?.scenario ?? null,
    revealedAnswers: Array.isArray(pub?.revealedAnswers) ? pub.revealedAnswers : [],
    roundSummary: pub?.roundSummary ?? null,
    rematchRequests: Array.isArray(pub?.rematchRequests)
      ? [Boolean(pub.rematchRequests[0]), Boolean(pub.rematchRequests[1])]
      : [false, false],
  };
}

function normalizePrivateState(priv: Partial<PrivateState> | null | undefined): PrivateState {
  return {
    role: priv?.role ?? null,
    guess: priv?.guess ?? null,
    guessClueIndex: priv?.guessClueIndex ?? null,
    committedAnswer: priv?.committedAnswer ?? null,
    hasGuessed: Boolean(priv?.hasGuessed),
  };
}

export default function GameContainer({ roomCode }: GameContainerProps) {
  const router = useRouter();

  // Auth & Connection State
  const [currentUserUid, setCurrentUserUid] = useState<string | null>(null);
  const [mySeat, setMySeat] = useState<0 | 1>(0);
  const [isHost, setIsHost] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isRulesOpen, setIsRulesOpen] = useState(false);

  // Synchronized Game State
  const [publicState, setPublicState] = useState<PublicState>({
    code: roomCode,
    phase: 'LOBBY',
    matchId: '',
    roundIndex: 0,
    clueIndex: 0,
    matchScores: [0, 0],
    players: [null, null],
    scenario: null,
    revealedAnswers: [],
    roundSummary: null,
    rematchRequests: [false, false],
  });

  const [privateState, setPrivateState] = useState<PrivateState>({
    role: null,
    guess: null,
    guessClueIndex: null,
    committedAnswer: null,
    hasGuessed: false,
  });

  // Local interaction flags
  const [ackedRound, setAckedRound] = useState<number | null>(null);
  const roleAcked = ackedRound === publicState.roundIndex;

  const tokenRef = useRef<string | null>(null);

  // 1. Authenticate anonymously and sync room
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      try {
        const user = await ensureAnonymousAuth();
        if (!isMounted) return;

        const token = await user.getIdToken();
        tokenRef.current = token;
        setCurrentUserUid(user.uid);

        // Fetch initial projection from API
        const res = await fetch(`/api/room/${roomCode}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const text = await res.text();
        let data: {
          error?: string;
          seat?: number;
          isHost?: boolean;
          public?: unknown;
          private?: unknown;
        } | null = null;
        if (text) {
          try {
            data = JSON.parse(text);
          } catch {
            // not json
          }
        }

        if (!res.ok) {
          throw new Error(data?.error || `Failed to connect to room (HTTP ${res.status})`);
        }

        if (!isMounted || !data) return;

        if (typeof data.seat === 'number') setMySeat(data.seat as 0 | 1);
        if (typeof data.isHost === 'boolean') setIsHost(data.isHost);
        if (data.public) setPublicState(normalizePublicState(data.public, roomCode));
        if (data.private) setPrivateState(normalizePrivateState(data.private));

        setIsLoading(false);
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : 'Connection failed';
        setErrorMsg(msg);
        setIsLoading(false);
      }
    }

    initSession();

    return () => {
      isMounted = false;
    };
  }, [roomCode]);

  // 2. Realtime listener on Firebase RTDB (when configured) with polling fallback
  useEffect(() => {
    if (!currentUserUid) return;

    let publicRef: ReturnType<typeof ref> | null = null;
    let privateRef: ReturnType<typeof ref> | null = null;

    try {
      publicRef = ref(rtdb, `rooms/${roomCode}/public`);
      privateRef = ref(rtdb, `rooms/${roomCode}/private/${currentUserUid}`);

      onValue(
        publicRef,
        (snap) => {
          if (snap.exists()) {
            setPublicState(normalizePublicState(snap.val(), roomCode));
          }
        },
        (error) => {
          // RTDB listen error, silently fallback to polling interval
          console.warn('RTDB public sync error:', error.message);
        }
      );

      onValue(
        privateRef,
        (snap) => {
          if (snap.exists()) {
            setPrivateState(normalizePrivateState(snap.val()));
          }
        },
        (error) => {
          // RTDB listen error, silently fallback to polling interval
          console.warn('RTDB private sync error:', error.message);
        }
      );
    } catch {
      // If client cannot connect to RTDB directly, use polling interval
    }

    // Polling interval fallback for seamless sync across all network conditions
    const pollInterval = setInterval(async () => {
      if (!tokenRef.current) return;
      try {
        const res = await fetch(`/api/room/${roomCode}`, {
          headers: { Authorization: `Bearer ${tokenRef.current}` },
        });
        if (res.ok) {
          const rawText = await res.text();
          if (rawText) {
            try {
              const data = JSON.parse(rawText);
              if (data.public) setPublicState(normalizePublicState(data.public, roomCode));
              if (data.private) setPrivateState(normalizePrivateState(data.private));
              if (typeof data.seat === 'number') setMySeat(data.seat);
              if (typeof data.isHost === 'boolean') setIsHost(data.isHost);
            } catch {
              // Ignore parse error
            }
          }
        }
      } catch {
        // Ignore background polling glitches
      }
    }, 1000);

    return () => {
      clearInterval(pollInterval);
      if (publicRef) off(publicRef);
      if (privateRef) off(privateRef);
    };
  }, [roomCode, currentUserUid]);

  // 3. API Dispatchers
  const callApi = useCallback(
    async (endpoint: string, body: Record<string, unknown>) => {
      const token = tokenRef.current;
      if (!token) throw new Error('Not authenticated');

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const rawText = await res.text();
        let errorMsg = `Server error (${res.status})`;
        if (rawText) {
          try {
            const data = JSON.parse(rawText);
            if (data?.error) errorMsg = data.error;
          } catch {
            if (rawText.length < 150) errorMsg = rawText;
          }
        }
        throw new Error(errorMsg);
      }

      // Immediately poll for updated state
      try {
        const syncRes = await fetch(`/api/room/${roomCode}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (syncRes.ok) {
          const syncText = await syncRes.text();
          if (syncText) {
            try {
              const syncData = JSON.parse(syncText);
              if (syncData.public) setPublicState(normalizePublicState(syncData.public, roomCode));
              if (syncData.private) setPrivateState(normalizePrivateState(syncData.private));
            } catch {
              // Ignore
            }
          }
        }
      } catch {
        // Ignore
      }
    },
    [roomCode]
  );

  const handleToggleReady = async (ready: boolean) => {
    await callApi('/api/room/ready', { code: roomCode, ready });
  };

  const handleStartMatch = async () => {
    await callApi('/api/room/start', { code: roomCode });
  };

  const handleAcknowledgeRole = async () => {
    const actionId = `role-ack-${publicState.roundIndex}-${Date.now()}`;
    await callApi('/api/game/action', {
      code: roomCode,
      actionId,
      action: { type: 'ROLE_ACK' },
    });
    setAckedRound(publicState.roundIndex);
  };

  const handleSubmitAnswer = async (optionId: string) => {
    const actionId = `answer-${publicState.roundIndex}-${publicState.clueIndex}-${Date.now()}`;
    await callApi('/api/game/action', {
      code: roomCode,
      actionId,
      action: {
        type: 'SUBMIT_ANSWER',
        clueIndex: publicState.clueIndex,
        optionId,
      },
    });
  };

  const handleAcknowledgeReveal = async () => {
    const actionId = `reveal-ack-${publicState.roundIndex}-${publicState.clueIndex}-${Date.now()}`;
    await callApi('/api/game/action', {
      code: roomCode,
      actionId,
      action: {
        type: 'REVEAL_ACK',
        clueIndex: publicState.clueIndex,
      },
    });
  };

  const handleSubmitDecision = async (decision: DecisionAction) => {
    const actionId = `decision-${publicState.roundIndex}-${publicState.clueIndex}-${Date.now()}`;
    await callApi('/api/game/action', {
      code: roomCode,
      actionId,
      action: {
        type: 'SUBMIT_DECISION',
        clueIndex: publicState.clueIndex,
        decision,
      },
    });
  };

  const handleNextRoundReady = async () => {
    const actionId = `next-ready-${publicState.roundIndex}-${Date.now()}`;
    await callApi('/api/game/action', {
      code: roomCode,
      actionId,
      action: { type: 'NEXT_ROUND_READY' },
    });
  };

  const handleRequestRematch = async () => {
    const actionId = `rematch-${Date.now()}`;
    await callApi('/api/game/action', {
      code: roomCode,
      actionId,
      action: { type: 'REMATCH_REQUEST' },
    });
  };

  const handleLeaveRoom = () => {
    router.push('/');
  };

  // Loading Screen
  if (isLoading) {
    return (
      <div className="game-loading-screen">
        <div className="spinner-dots"><span /><span /><span /></div>
        <p className="loading-text">กำลังเชื่อมต่อแฟ้มสืบสวน {roomCode}...</p>
      </div>
    );
  }

  // Error Screen
  if (errorMsg) {
    return (
      <div className="game-error-screen">
        <div className="error-box">
          <h2 className="error-title">เกิดข้อผิดพลาดในการเชื่อมต่อ</h2>
          <p className="error-message">{errorMsg}</p>
          <button className="btn btn-primary" onClick={() => router.push('/')}>
            กลับสู่หน้าหลัก
          </button>
        </div>
      </div>
    );
  }

  // Opponent Answered indicator for current clue
  const oppHasAnswered = Boolean(
    (publicState.revealedAnswers ?? []).find((r) => r.clueIndex === publicState.clueIndex) ||
    publicState.phase === 'ANSWER_REVEAL'
  );

  return (
    <div className="game-screen-wrapper">
      {/* Top Header */}
      <GameHeader
        roomCode={roomCode}
        phase={publicState.phase}
        roundIndex={publicState.roundIndex}
        clueIndex={publicState.clueIndex}
        mySeat={mySeat}
        scores={publicState.matchScores}
        onOpenRules={() => setIsRulesOpen(true)}
        onLeaveRoom={handleLeaveRoom}
      />

      {/* Main Game Screen depending on State Machine Phase */}
      <main className="game-main-content">
        {publicState.phase === 'LOBBY' && (
          <LobbyView
            roomCode={roomCode}
            players={publicState.players}
            mySeat={mySeat}
            isHost={isHost}
            onToggleReady={handleToggleReady}
            onStartMatch={handleStartMatch}
            onOpenRules={() => setIsRulesOpen(true)}
          />
        )}

        {publicState.phase === 'ROLE_INTRO' && (
          <RoleIntroView
            myRole={privateState.role}
            roundIndex={publicState.roundIndex}
            hasAcknowledged={roleAcked}
            onAcknowledgeRole={handleAcknowledgeRole}
          />
        )}

        {publicState.phase === 'ANSWERING' && (
          <AnsweringView
            scenario={publicState.scenario}
            clueIndex={publicState.clueIndex}
            myCommittedAnswer={privateState.committedAnswer}
            opponentHasAnswered={oppHasAnswered}
            onSubmitAnswer={handleSubmitAnswer}
          />
        )}

        {publicState.phase === 'ANSWER_REVEAL' && (
          <AnswerRevealView
            scenario={publicState.scenario}
            clueIndex={publicState.clueIndex}
            mySeat={mySeat}
            players={publicState.players}
            revealedAnswers={publicState.revealedAnswers}
            onAcknowledgeReveal={handleAcknowledgeReveal}
          />
        )}

        {publicState.phase === 'DECIDING' && (
          <DecidingView
            clueIndex={publicState.clueIndex}
            myRole={privateState.role}
            hasGuessed={privateState.hasGuessed}
            myGuessedRole={privateState.guess}
            myGuessedClueIndex={privateState.guessClueIndex}
            onSubmitDecision={handleSubmitDecision}
          />
        )}

        {publicState.phase === 'ROUND_REVEAL' && (
          <RoundRevealView
            roundSummary={publicState.roundSummary}
            roundIndex={publicState.roundIndex}
            mySeat={mySeat}
            players={publicState.players}
            matchScores={publicState.matchScores}
            onNextRoundReady={handleNextRoundReady}
          />
        )}

        {publicState.phase === 'MATCH_RESULT' && (
          <MatchResultView
            players={publicState.players}
            mySeat={mySeat}
            matchScores={publicState.matchScores}
            roundHistory={[]}
            rematchRequests={publicState.rematchRequests}
            onRequestRematch={handleRequestRematch}
            onBackToHome={handleLeaveRoom}
          />
        )}
      </main>

      {/* Rules Modal Drawer */}
      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
    </div>
  );
}
