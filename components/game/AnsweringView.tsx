'use client';

import { useState } from 'react';
import { Scenario } from '@/lib/game/types';

interface AnsweringViewProps {
  scenario: Scenario | null;
  clueIndex: number;
  myCommittedAnswer: string | null;
  opponentHasAnswered: boolean;
  onSubmitAnswer: (optionId: string) => Promise<void>;
}

export default function AnsweringView({
  scenario,
  clueIndex,
  myCommittedAnswer,
  opponentHasAnswered,
  onSubmitAnswer,
}: AnsweringViewProps) {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasCommitted = Boolean(myCommittedAnswer);

  const handleSubmit = async () => {
    if (!selectedOptionId || hasCommitted) return;
    setIsSubmitting(true);
    try {
      await onSubmitAnswer(selectedOptionId);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!scenario) {
    return (
      <div className="answering-loading">
        <div className="spinner-dots"><span /><span /><span /></div>
        <p>กำลังเตรียมสถานการณ์...</p>
      </div>
    );
  }

  const categoryLabels: Record<string, string> = {
    travel: '✈️ การเดินทาง',
    food: '🍜 อาหารการกิน',
    shopping: '🛍️ การซื้อของ',
    leisure: '☕ กิจกรรมวันหยุด',
    friends: '👥 เพื่อนฝูง',
    daily: '🏠 ชีวิตประจำวัน',
  };

  return (
    <div className="answering-container">
      {/* Clue Header */}
      <div className="scenario-meta-row">
        <span className="category-pill">
          {categoryLabels[scenario.category] ?? scenario.category}
        </span>
        <span className="clue-number-pill">ข้อที่ {clueIndex + 1} จาก 4</span>
      </div>

      {/* Scenario Prompt Card */}
      <div className="scenario-card">
        <div className="scenario-prompt-text">{scenario.prompt}</div>
        <div className="scenario-subtext">
          เลือกการกระทำที่ตรงกับลักษณะนิสัยของบทบาทคุณมากที่สุด
        </div>
      </div>

      {/* Opponent Status Indicator */}
      <div className="opponent-status-row">
        <span className="opp-label">สถานะเพื่อน:</span>
        {opponentHasAnswered ? (
          <span className="opp-badge done">เพื่อนส่งคำตอบแล้ว ✓</span>
        ) : (
          <span className="opp-badge pending">กำลังตัดสินใจเลือก...</span>
        )}
      </div>

      {/* Options List */}
      <div className="options-list" role="radiogroup" aria-label="ตัวเลือกการกระทำ">
        {scenario.options.map((opt, idx) => {
          const letter = String.fromCharCode(65 + idx); // A, B, C, D
          const isSelected = hasCommitted
            ? myCommittedAnswer === opt.id
            : selectedOptionId === opt.id;

          return (
            <button
              key={opt.id}
              className={`option-card ${isSelected ? 'selected' : ''} ${hasCommitted ? 'locked' : ''}`}
              onClick={() => !hasCommitted && setSelectedOptionId(opt.id)}
              disabled={hasCommitted}
              role="radio"
              aria-checked={isSelected}
            >
              <div className="option-letter-badge">{letter}</div>
              <div className="option-label-text">{opt.label}</div>
              {isSelected && <div className="option-check-icon">✓</div>}
            </button>
          );
        })}
      </div>

      {/* Submit / Waiting Footer */}
      <div className="answering-footer">
        {hasCommitted ? (
          <div className="answer-submitted-banner">
            <span className="submitted-check">✓</span>
            <div className="submitted-text">
              <strong>ล็อกคำตอบแล้ว!</strong>
              <span>
                {opponentHasAnswered
                  ? 'กำลังเปิดเฉลยคำตอบพร้อมกัน...'
                  : 'รออีกฝ่ายส่งคำตอบเพื่อเปิดดูพร้อมกัน'}
              </span>
            </div>
          </div>
        ) : (
          <button
            className="btn btn-primary btn-lg submit-answer-btn"
            onClick={handleSubmit}
            disabled={!selectedOptionId || isSubmitting}
          >
            {isSubmitting ? 'กำลังส่งคำตอบ...' : 'ยืนยันคำตอบ ➔'}
          </button>
        )}
      </div>
    </div>
  );
}
