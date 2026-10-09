'use client';

import { useState } from 'react';
import { RoleId, ROLES, ROLE_IDS, CLUES_PER_ROUND, SCORE_TABLE, DecisionAction } from '@/lib/game/types';

interface DecidingViewProps {
  clueIndex: number;
  myRole: RoleId | null;
  hasGuessed: boolean;
  myGuessedRole: RoleId | null;
  myGuessedClueIndex: number | null;
  onSubmitDecision: (decision: DecisionAction) => Promise<void>;
}

export default function DecidingView({
  clueIndex,
  myRole,
  hasGuessed,
  myGuessedRole,
  myGuessedClueIndex,
  onSubmitDecision,
}: DecidingViewProps) {
  const [selectedRole, setSelectedRole] = useState<RoleId | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Local scratchpad suspicion state: Record<RoleId, 'suspect' | 'cleared' | 'none'>
  const [scratchpad, setScratchpad] = useState<Record<string, 'suspect' | 'cleared' | 'none'>>({});

  const isFinalClue = clueIndex === CLUES_PER_ROUND - 1; // Clue 4 (index 3)
  const currentPoints = SCORE_TABLE[clueIndex] ?? 2;

  const toggleScratchpad = (roleId: RoleId, tag: 'suspect' | 'cleared') => {
    setScratchpad((prev) => ({
      ...prev,
      [roleId]: prev[roleId] === tag ? 'none' : tag,
    }));
  };

  const handleContinue = async () => {
    if (isFinalClue || hasGuessed || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSubmitDecision({ type: 'continue' });
      setHasSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmGuess = async () => {
    if (!selectedRole || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSubmitDecision({ type: 'guess', roleId: selectedRole });
      setShowConfirmModal(false);
      setHasSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAckAlreadyGuessed = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSubmitDecision({ type: 'ack' });
      setHasSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="deciding-container">
      {/* Header */}
      <div className="deciding-header">
        <span className="case-stamp">ขั้นตัดสินใจ: อนุมานตัวตนเพื่อน 🕵️</span>
        <h2 className="deciding-title">เพื่อนของคุณน่าจะเป็นใคร?</h2>
        <div className="deciding-pts-info">
          ทายถูกตอนนี้ได้รับ: <strong>+{currentPoints} คะแนน</strong>
        </div>
      </div>

      {/* Case 1: Player ALREADY guessed in an earlier clue */}
      {hasGuessed ? (
        <div className="already-guessed-panel">
          <div className="locked-guess-box">
            <span className="locked-icon">🔒</span>
            <div className="locked-details">
              <div className="locked-title">คุณได้ส่งคำทายไปแล้ว</div>
              <div className="locked-val">
                คุณทายว่าเพื่อนคือ: <strong>{myGuessedRole ? ROLES[myGuessedRole].name : '—'}</strong>
              </div>
              <div className="locked-sub">
                (ส่งคำทายหลังข้อที่ {(myGuessedClueIndex ?? 0) + 1})
              </div>
            </div>
          </div>
          <p className="locked-hint">
            คุณสามารถช่วยตอบสถานการณ์ต่อไปเพื่อเป็นหลักฐานให้เพื่อนได้
          </p>
        </div>
      ) : (
        /* Case 2: Player has NOT guessed yet */
        <div className="suspect-selection-panel">
          {isFinalClue && (
            <div className="forced-guess-alert">
              ⚠️ <strong>ข้อสุดท้ายแล้ว!</strong> คุณต้องเลือกบทบาทและล็อกคำทายตอนนี้ ไม่สามารถกดดูต่อได้
            </div>
          )}

          <p className="suspect-subtitle">
            ตัดบทบาทของคุณออกแล้ว เหลือ 5 ผู้ต้องสงสัย (แตะการ์ดเพื่อเลือกคำทาย หรือแตะแท็กเพื่อช่วยทดบันทึก)
          </p>

          {/* 6 Roles list (own role disabled) */}
          <div className="suspects-grid" role="radiogroup" aria-label="ผู้ต้องสงสัย 5 บทบาท">
            {ROLE_IDS.map((roleId) => {
              const info = ROLES[roleId];
              const isOwnRole = roleId === myRole;
              const isSelected = selectedRole === roleId;
              const note = scratchpad[roleId] ?? 'none';

              if (isOwnRole) {
                return (
                  <div key={roleId} className="suspect-card is-self-eliminated" aria-disabled="true">
                    <div className="suspect-card-header">
                      <span className="suspect-name-striked">{info.name}</span>
                      <span className="self-tag">บทของคุณ (ตัดออก)</span>
                    </div>
                    <p className="suspect-desc-muted">{info.description}</p>
                  </div>
                );
              }

              return (
                <div
                  key={roleId}
                  className={`suspect-card ${isSelected ? 'selected' : ''} note-${note}`}
                  onClick={() => setSelectedRole(roleId)}
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={0}
                >
                  <div className="suspect-card-header">
                    <span className={`suspect-name role-${roleId}`}>{info.name}</span>
                    <div className="scratchpad-tags" onClick={(e) => e.stopPropagation()}>
                      <button
                        className={`tag-btn suspect ${note === 'suspect' ? 'active' : ''}`}
                        onClick={() => toggleScratchpad(roleId, 'suspect')}
                        title="ทำเครื่องหมายว่าน่าสงสัย"
                      >
                        ? สงสัย
                      </button>
                      <button
                        className={`tag-btn clear ${note === 'cleared' ? 'active' : ''}`}
                        onClick={() => toggleScratchpad(roleId, 'cleared')}
                        title="ทำเครื่องหมายว่าตัดออก"
                      >
                        ✕ ตัด
                      </button>
                    </div>
                  </div>
                  <p className="suspect-desc">{info.description}</p>
                  {isSelected && <div className="suspect-selected-badge">✓ เลือกทายบทนี้</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div className="deciding-footer">
        {hasSubmitted ? (
          <div className="waiting-opponent-banner">
            <div className="spinner-dots"><span /><span /><span /></div>
            <span>รออีกฝ่ายพร้อมไปต่อ...</span>
          </div>
        ) : hasGuessed ? (
          <button
            className="btn btn-primary btn-lg proceed-btn"
            onClick={handleAckAlreadyGuessed}
            disabled={isSubmitting}
          >
            พร้อมไปต่อ ➔
          </button>
        ) : (
          <div className="deciding-button-row">
            {!isFinalClue && (
              <button
                className="btn btn-secondary btn-lg continue-clue-btn"
                onClick={handleContinue}
                disabled={isSubmitting}
              >
                ดูสถานการณ์ต่อไป (ข้อ {clueIndex + 2})
              </button>
            )}
            <button
              className="btn btn-primary btn-lg lock-guess-btn"
              onClick={() => setShowConfirmModal(true)}
              disabled={!selectedRole || isSubmitting}
            >
              ล็อกคำทาย! 🔒 (+{currentPoints} แต้ม)
            </button>
          </div>
        )}
      </div>

      {/* Lock Confirmation Modal */}
      {showConfirmModal && selectedRole && (
        <div className="confirm-modal-backdrop" onClick={() => setShowConfirmModal(false)}>
          <div className="confirm-modal-box" onClick={(e) => e.stopPropagation()}>
            <h3 className="confirm-modal-title">ยืนยันการล็อกคำทาย?</h3>
            <p className="confirm-modal-text">
              คุณต้องการทายว่าเพื่อนคือ: <strong>&ldquo;{ROLES[selectedRole].name}&rdquo;</strong> ใช่หรือไม่?
            </p>
            <p className="confirm-modal-warning">
              * คำเตือน: ทายได้เพียงครั้งเดียวในรอบนี้ และไม่สามารถเปลี่ยนคำทายได้อีก!
            </p>
            <div className="confirm-modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowConfirmModal(false)}>
                เปลี่ยนใจเลือกใหม่
              </button>
              <button className="btn btn-primary" onClick={handleConfirmGuess} disabled={isSubmitting}>
                {isSubmitting ? 'กำลังส่งคำทาย...' : 'ยืนยันล็อกคำทาย!'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
