'use client';

import { useState } from 'react';
import { RoundResult, PlayerSeat, ROLES, ROUNDS_PER_MATCH } from '@/lib/game/types';

interface RoundRevealViewProps {
  hasAcknowledged?: boolean;
  actionBlocked?: boolean;
  roundSummary: RoundResult | null;
  roundIndex: number;
  mySeat: 0 | 1;
  players: [PlayerSeat | null, PlayerSeat | null];
  matchScores: [number, number];
  onNextRoundReady: () => Promise<void>;
}

export default function RoundRevealView({
  actionBlocked = false,
  hasAcknowledged = false,
  roundSummary,
  roundIndex,
  mySeat,
  players,
  matchScores,
  onNextRoundReady,
}: RoundRevealViewProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const opponentSeat = mySeat === 0 ? 1 : 0;
  const me = players[mySeat];
  const opponent = players[opponentSeat];

  const isFinalRound = roundIndex === ROUNDS_PER_MATCH - 1;

  const handleNext = async () => {
    if (actionBlocked || isSubmitting || hasAcknowledged) return;
    setIsSubmitting(true);
    try {
      await onNextRoundReady();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!roundSummary) {
    return (
      <div className="reveal-loading">
        <div className="spinner-dots"><span /><span /><span /></div>
        <p>กำลังคำนวณคะแนนประจำรอบ...</p>
      </div>
    );
  }

  const myActualRole = roundSummary.roles[mySeat];
  const oppActualRole = roundSummary.roles[opponentSeat];

  const myGuess = roundSummary.guesses[mySeat];
  const oppGuess = roundSummary.guesses[opponentSeat];

  const myRoundScore = roundSummary.scores[mySeat];
  const oppRoundScore = roundSummary.scores[opponentSeat];

  const myReason = roundSummary.reason?.[mySeat] ?? '';
  const oppReason = roundSummary.reason?.[opponentSeat] ?? '';

  return (
    <div className="round-reveal-container">
      {/* Header Stamp */}
      <div className="round-reveal-stamp-banner">
        <div className="rubber-stamp-closed">CASE REVEALED</div>
        <h2 className="round-reveal-title">
          เฉลยผลการสืบสวน — รอบที่ {roundIndex + 1}/{ROUNDS_PER_MATCH}
        </h2>
      </div>

      {/* Comparison Reveal Cards */}
      <div className="reveal-cards-grid">
        {/* Your Result Card */}
        <div className="round-result-card my-result">
          <div className="result-card-header">
            <svg className="result-avatar" width="40" height="40" viewBox="0 0 80 80">
              <use href={`#av-${me?.avatarId ?? 'cat'}`} />
            </svg>
            <div>
              <div className="result-player-name">{me?.displayName} (คุณ)</div>
              <div className="result-actual-role">
                บทบาทจริง: <strong>{ROLES[myActualRole].name}</strong>
              </div>
            </div>
          </div>

          <div className="result-guess-section">
            <div className="guess-row">
              <span className="guess-label">คุณทายว่าเพื่อนคือ:</span>
              <span className="guess-value">
                {myGuess ? ROLES[myGuess].name : 'ไม่ได้ส่งคำทาย'}
              </span>
            </div>
            <div className={`score-earned-badge ${myRoundScore > 0 ? 'positive' : 'zero'}`}>
              {myRoundScore > 0 ? `+${myRoundScore} คะแนน` : '+0 คะแนน'}
            </div>
            <div className="result-reason-text">{myReason}</div>
          </div>
        </div>

        {/* Opponent's Result Card */}
        <div className="round-result-card opp-result">
          <div className="result-card-header">
            <svg className="result-avatar" width="40" height="40" viewBox="0 0 80 80">
              <use href={`#av-${opponent?.avatarId ?? 'fox'}`} />
            </svg>
            <div>
              <div className="result-player-name">{opponent?.displayName} (เพื่อน)</div>
              <div className="result-actual-role">
                บทบาทจริง: <strong>{ROLES[oppActualRole].name}</strong>
              </div>
            </div>
          </div>

          <div className="result-guess-section">
            <div className="guess-row">
              <span className="guess-label">เพื่อนทายว่าคุณคือ:</span>
              <span className="guess-value">
                {oppGuess ? ROLES[oppGuess].name : 'ไม่ได้ส่งคำทาย'}
              </span>
            </div>
            <div className={`score-earned-badge ${oppRoundScore > 0 ? 'positive' : 'zero'}`}>
              {oppRoundScore > 0 ? `+${oppRoundScore} คะแนน` : '+0 คะแนน'}
            </div>
            <div className="result-reason-text">{oppReason}</div>
          </div>
        </div>
      </div>

      {/* Cumulative Scoreboard */}
      <div className="cumulative-scoreboard">
        <h4 className="scoreboard-title">คะแนนรวมสะสมหลังรอบที่ {roundIndex + 1}</h4>
        <div className="scoreboard-display">
          <div className="score-side">
            <span className="player-tag">{me?.displayName}</span>
            <span className="score-num">{matchScores[mySeat]}</span>
          </div>
          <div className="score-vs">VS</div>
          <div className="score-side">
            <span className="player-tag">{opponent?.displayName}</span>
            <span className="score-num">{matchScores[opponentSeat]}</span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="round-reveal-footer">
        {hasAcknowledged ? (
          <div className="waiting-opponent-banner">
            <div className="spinner-dots"><span /><span /><span /></div>
            <span>รออีกฝ่ายพร้อมรอบถัดไป...</span>
          </div>
        ) : (
          <button
            className="btn btn-primary btn-lg next-round-btn"
            onClick={handleNext}
            disabled={isSubmitting || actionBlocked}
          >
            {isFinalRound
              ? 'ดูสรุปผลตัดสินทั้งเกม! 🏆'
              : `พร้อมลุยรอบที่ ${roundIndex + 2} ➔`}
          </button>
        )}
      </div>
    </div>
  );
}
