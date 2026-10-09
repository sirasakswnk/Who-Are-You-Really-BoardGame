'use client';

import { useState } from 'react';
import { Scenario, PlayerSeat } from '@/lib/game/types';

interface AnswerRevealViewProps {
  scenario: Scenario | null;
  clueIndex: number;
  mySeat: 0 | 1;
  players: [PlayerSeat | null, PlayerSeat | null];
  revealedAnswers: Array<{ clueIndex: number; answers: [string, string] }>;
  onAcknowledgeReveal: () => Promise<void>;
}

export default function AnswerRevealView({
  scenario,
  clueIndex,
  mySeat,
  players,
  revealedAnswers,
  onAcknowledgeReveal,
}: AnswerRevealViewProps) {
  const [hasAcknowledged, setHasAcknowledged] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const opponentSeat = mySeat === 0 ? 1 : 0;
  const me = players[mySeat];
  const opponent = players[opponentSeat];

  // Current clue answers
  const currentRevealed = revealedAnswers.find((r) => r.clueIndex === clueIndex);
  const myAnswerId = currentRevealed?.answers[mySeat];
  const opponentAnswerId = currentRevealed?.answers[opponentSeat];

  const getOptionLabel = (optionId: string | undefined): string => {
    if (!optionId || !scenario) return '—';
    const found = scenario.options.find((o) => o.id === optionId);
    return found ? found.label : optionId;
  };

  const handleAcknowledge = async () => {
    setIsSubmitting(true);
    try {
      await onAcknowledgeReveal();
      setHasAcknowledged(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="reveal-container">
      {/* Header */}
      <div className="reveal-header">
        <span className="case-stamp">หลักฐานข้อที่ {clueIndex + 1} ถูกเปิดเผยแล้ว! 🔍</span>
        <h2 className="reveal-title">เปรียบเทียบคำตอบของทั้งสองฝ่าย</h2>
        {scenario && <p className="reveal-prompt-quote">&ldquo;{scenario.prompt}&rdquo;</p>}
      </div>

      {/* Side-by-Side Answers Comparison */}
      <div className="reveal-comparison-grid">
        {/* My Answer */}
        <div className="reveal-player-card my-card">
          <div className="reveal-player-header">
            <svg className="reveal-avatar" width="36" height="36" viewBox="0 0 80 80">
              <use href={`#av-${me?.avatarId ?? 'cat'}`} />
            </svg>
            <div className="reveal-name-col">
              <span className="reveal-name">{me?.displayName ?? 'คุณ'} (คุณ)</span>
              <span className="reveal-tag">คำตอบที่คุณเลือก</span>
            </div>
          </div>
          <div className="reveal-answer-box">
            {getOptionLabel(myAnswerId)}
          </div>
        </div>

        {/* Opponent Answer */}
        <div className="reveal-player-card opp-card">
          <div className="reveal-player-header">
            <svg className="reveal-avatar" width="36" height="36" viewBox="0 0 80 80">
              <use href={`#av-${opponent?.avatarId ?? 'fox'}`} />
            </svg>
            <div className="reveal-name-col">
              <span className="reveal-name">{opponent?.displayName ?? 'เพื่อน'}</span>
              <span className="reveal-tag">คำตอบที่เพื่อนเลือก</span>
            </div>
          </div>
          <div className="reveal-answer-box">
            {getOptionLabel(opponentAnswerId)}
          </div>
        </div>
      </div>

      {/* Evidence History (Previous clues in this round) */}
      {revealedAnswers.length > 1 && (
        <div className="evidence-history-section">
          <h4 className="evidence-history-title">ประวัติคำตอบในรอบนี้:</h4>
          <div className="evidence-list">
            {revealedAnswers
              .filter((r) => r.clueIndex < clueIndex)
              .map((r) => (
                <div key={r.clueIndex} className="evidence-item">
                  <span className="evidence-clue-badge">ข้อ {r.clueIndex + 1}</span>
                  <span className="evidence-text">
                    {me?.displayName}: <em>{r.answers[mySeat]}</em> | {opponent?.displayName}: <em>{r.answers[opponentSeat]}</em>
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div className="reveal-footer">
        {hasAcknowledged ? (
          <div className="waiting-opponent-banner">
            <div className="spinner-dots"><span /><span /><span /></div>
            <span>รออีกฝ่ายพร้อมไปขั้นทายบทบาท...</span>
          </div>
        ) : (
          <button
            className="btn btn-primary btn-lg proceed-btn proceed-decide-btn"
            onClick={handleAcknowledge}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'กำลังบันทึก...' : 'วิเคราะห์เสร็จแล้ว ไปขั้นทายบทบาท! ➔'}
          </button>
        )}
      </div>
    </div>
  );
}
