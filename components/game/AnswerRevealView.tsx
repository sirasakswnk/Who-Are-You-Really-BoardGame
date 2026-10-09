'use client';

import { useState } from 'react';
import type { Scenario, PlayerSeat, RevealedEvidence } from '@/lib/game/types';

interface AnswerRevealViewProps {
  hasAcknowledged?: boolean;
  actionBlocked?: boolean;
  scenario: Scenario | null;
  clueIndex: number;
  mySeat: 0 | 1;
  players: [PlayerSeat | null, PlayerSeat | null];
  revealedAnswers: Array<{ clueIndex: number; answers: [string, string] }>;
  evidence?: RevealedEvidence[];
  onAcknowledgeReveal: () => Promise<void>;
}

export default function AnswerRevealView({
  actionBlocked = false,
  hasAcknowledged = false,
  scenario,
  clueIndex,
  mySeat,
  players,
  revealedAnswers,
  evidence = [],
  onAcknowledgeReveal,
}: AnswerRevealViewProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const opponentSeat = mySeat === 0 ? 1 : 0;
  const me = players[mySeat];
  const opponent = players[opponentSeat];

  // Current clue answers
  const currentRevealed = revealedAnswers.find((r) => r.clueIndex === clueIndex);
  const myAnswerId = currentRevealed?.answers[mySeat];
  const opponentAnswerId = currentRevealed?.answers[opponentSeat];

  const getOptionLabel = (optionId: string | undefined, seat: 0 | 1): string => {
    const captured = evidence.find(entry => entry.clueIndex === clueIndex)?.answers[seat];
    if (captured !== undefined) return captured;
    if (!optionId || !scenario) return '—';
    const found = scenario.options.find((o) => o.id === optionId);
    return found ? found.label : 'ไม่พบข้อความคำตอบ';
  };

  const handleAcknowledge = async () => {
    if (actionBlocked || isSubmitting || hasAcknowledged) return;
    setIsSubmitting(true);
    try {
      await onAcknowledgeReveal();
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
            {getOptionLabel(myAnswerId, mySeat)}
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
            {getOptionLabel(opponentAnswerId, opponentSeat)}
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
                  <div className="evidence-text">
                    <p>{evidence.find(entry => entry.clueIndex === r.clueIndex)?.prompt ?? 'ไม่มีสถานการณ์ของข้อเดิม'}</p>
                    {me?.displayName}: <em>{evidence.find(entry => entry.clueIndex === r.clueIndex)?.answers[mySeat] ?? 'ไม่มีข้อความคำตอบของข้อเดิม'}</em>
                    {' | '}{opponent?.displayName}: <em>{evidence.find(entry => entry.clueIndex === r.clueIndex)?.answers[opponentSeat] ?? 'ไม่มีข้อความคำตอบของข้อเดิม'}</em>
                  </div>
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
            disabled={isSubmitting || actionBlocked}
          >
            {isSubmitting ? 'กำลังบันทึก...' : 'วิเคราะห์เสร็จแล้ว ไปขั้นทายบทบาท! ➔'}
          </button>
        )}
      </div>
    </div>
  );
}
