'use client';

import { useState } from 'react';
import { GamePhase, ROUNDS_PER_MATCH, CLUES_PER_ROUND } from '@/lib/game/types';

interface GameHeaderProps {
  roomCode: string;
  phase: GamePhase;
  roundIndex: number;
  clueIndex: number;
  mySeat: 0 | 1;
  scores: [number, number];
  onOpenRules: () => void;
  onLeaveRoom: () => void;
  leaveBlocked?: boolean;
}

export default function GameHeader({
  roomCode,
  phase,
  roundIndex,
  clueIndex,
  mySeat,
  scores,
  onOpenRules,
  onLeaveRoom,
  leaveBlocked = false,
}: GameHeaderProps) {
  const [showConfirmLeave, setShowConfirmLeave] = useState(false);
  const [copied, setCopied] = useState(false);

  const opponentSeat = mySeat === 0 ? 1 : 0;
  const myScore = scores[mySeat] ?? 0;
  const opponentScore = scores[opponentSeat] ?? 0;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const isPlayingPhase =
    phase === 'ROLE_INTRO' ||
    phase === 'ANSWERING' ||
    phase === 'ANSWER_REVEAL' ||
    phase === 'DECIDING' ||
    phase === 'ROUND_REVEAL';

  return (
    <header className="game-header">
      <div className="game-header-top">
        {/* Room Code Badge */}
        <button
          className="room-code-badge"
          onClick={handleCopyCode}
          title="แตะเพื่อคัดลอกรหัสห้อง"
          aria-label={`รหัสห้อง ${roomCode}`}
        >
          <span className="room-code-label">รหัสห้อง:</span>
          <span className="room-code-val">{roomCode}</span>
          <span className="room-code-copy-icon">{copied ? '✓' : '📋'}</span>
        </button>

        {/* Action Controls */}
        <div className="game-header-actions">
          <button
            className="header-icon-btn"
            onClick={onOpenRules}
            title="ดูกติกาและบทบาท"
            aria-label="กติกา"
          >
            📖
          </button>
          <button
            className="header-icon-btn header-btn-leave"
            disabled={leaveBlocked}
            onClick={() => setShowConfirmLeave(true)}
            title="ออกจากห้อง"
            aria-label="ออกจากห้อง"
          >
            🚪
          </button>
        </div>
      </div>

      {/* Progress & Score Bar (shown during active gameplay) */}
      {isPlayingPhase && (
        <div className="game-header-sub">
          <div className="game-progress-info">
            <span className="round-badge">
              รอบที่ {roundIndex + 1}/{ROUNDS_PER_MATCH}
            </span>
            <div className="clue-dots" aria-label={`ข้อที่ ${clueIndex + 1} จาก ${CLUES_PER_ROUND}`}>
              {Array.from({ length: CLUES_PER_ROUND }, (_, i) => (
                <span
                  key={i}
                  className={`clue-dot ${i < clueIndex ? 'done' : ''} ${i === clueIndex ? 'active' : ''}`}
                  title={`สถานการณ์ที่ ${i + 1}`}
                />
              ))}
            </div>
          </div>

          <div className="game-score-badge">
            <span className="score-label">คะแนน:</span>
            <span className="score-my">{myScore}</span>
            <span className="score-sep">-</span>
            <span className="score-opp">{opponentScore}</span>
          </div>
        </div>
      )}

      {/* Leave Confirmation Dialog */}
      {showConfirmLeave && (
        <div className="confirm-modal-backdrop" onClick={() => setShowConfirmLeave(false)}>
          <div className="confirm-modal-box" onClick={(e) => e.stopPropagation()}>
            <h3 className="confirm-modal-title">ออกจากห้อง?</h3>
            <p className="confirm-modal-text">
              {phase === 'LOBBY' ? 'ที่นั่งของคุณจะว่าง และโอนเจ้าห้องให้ผู้เล่นที่เหลือ'
                : phase === 'ABANDONED' || phase === 'MATCH_RESULT' ? 'ออกจากห้องนี้และกลับหน้าหลัก'
                : 'หากออกจากห้อง เกมนี้จะยุติและไม่มีผู้ชนะเต็มเกม'}
            </p>
            <div className="confirm-modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowConfirmLeave(false)}>
                ยกเลิก
              </button>
              <button
                className="btn btn-danger"
                disabled={leaveBlocked}
                onClick={() => {
                  setShowConfirmLeave(false);
                  if (!leaveBlocked) onLeaveRoom();
                }}
              >
                ออกจากห้อง
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
