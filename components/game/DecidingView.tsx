'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { RoleId, ROLES, ROLE_IDS, CLUES_PER_ROUND, SCORE_TABLE, DecisionAction } from '@/lib/game/types';
import type { NoteTag, SuspicionNotes } from '@/lib/client/roundNotes';
import RoleReminder from './RoleReminder';
import styles from './DecidingView.module.css';

interface DecidingViewProps {
  hasSubmitted?: boolean;
  actionBlocked?: boolean;
  clueIndex: number;
  myRole: RoleId | null;
  roleAcknowledged?: boolean;
  roleContextKey?: string;
  hasGuessed: boolean;
  myGuessedRole: RoleId | null;
  myGuessedClueIndex: number | null;
  onSubmitDecision: (decision: DecisionAction) => Promise<void>;
  scratchpad?: SuspicionNotes;
  onToggleNote?: (role: RoleId, tag: NoteTag) => void;
}

export default function DecidingView({
  actionBlocked = false,
  hasSubmitted = false,
  clueIndex,
  myRole,
  roleAcknowledged = false,
  roleContextKey,
  hasGuessed,
  myGuessedRole,
  myGuessedClueIndex,
  onSubmitDecision,
  scratchpad = {},
  onToggleNote,
}: DecidingViewProps) {
  const [selectedRole, setSelectedRole] = useState<RoleId | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const confirmationRef = useRef<HTMLDialogElement>(null);
  const lockButtonRef = useRef<HTMLButtonElement>(null);
  const documentId = useId();

  // Keep the confirmation above the folder and contain keyboard focus while it is open.
  useEffect(() => {
    if (!showConfirmModal) return;
    const dialog = confirmationRef.current;
    if (!dialog) return;
    const lockButton = lockButtonRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    return () => {
      document.body.style.overflow = previousOverflow;
      if (dialog.open) dialog.close();
      lockButton?.focus({ preventScroll: true });
    };
  }, [showConfirmModal]);

  const isFinalClue = clueIndex === CLUES_PER_ROUND - 1; // Clue 4 (index 3)
  const currentPoints = SCORE_TABLE[clueIndex] ?? 2;

  const toggleScratchpad = (roleId: RoleId, tag: 'suspect' | 'cleared') => {
    onToggleNote?.(roleId, tag);
  };

  const handleContinue = async () => {
    if (isFinalClue || hasGuessed || isSubmitting || hasSubmitted || actionBlocked) return;
    setIsSubmitting(true);
    try {
      await onSubmitDecision({ type: 'continue' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmGuess = async () => {
    if (!selectedRole || isSubmitting || hasSubmitted || actionBlocked) return;
    setIsSubmitting(true);
    setShowConfirmModal(false);
    try {
      await onSubmitDecision({ type: 'guess', roleId: selectedRole });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAckAlreadyGuessed = async () => {
    if (isSubmitting || hasSubmitted || actionBlocked) return;
    setIsSubmitting(true);
    try {
      await onSubmitDecision({ type: 'ack' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`deciding-container ${styles.folder}`}>
      <div className={`deciding-folder-tabs ${styles.folderTabs}`}>
        <span className={`deciding-folder-tab ${styles.tab}`}>ทายบทบาท</span>
        {myRole && roleAcknowledged && (
          <RoleReminder key={`${roleContextKey ?? clueIndex}:${myRole}`} role={myRole} placement="folder-tab" />
        )}
      </div>
      <span className={styles.spine} aria-hidden="true" />
      <svg className={styles.clip} viewBox="0 0 32 64" fill="none" aria-hidden="true">
        <path d="M10 47V14a8 8 0 0 1 16 0v36a11 11 0 0 1-22 0V21a5 5 0 0 1 10 0v29a2 2 0 0 1-4 0" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      {/* Header */}
      <div className={`deciding-header ${styles.header}`}>
        <div className={styles.metadata}>
          <span className={styles.clueLabel}>หลังสถานการณ์ที่ {clueIndex + 1}/{CLUES_PER_ROUND}</span>
          <span className={styles.analysisStamp}>แฟ้มวิเคราะห์</span>
        </div>
        <h2 className={`deciding-title ${styles.title}`}>เพื่อนของคุณน่าจะเป็นใคร?</h2>
        <p className={styles.caption}>ใช้คำตอบที่เปิดเผยเป็นหลักฐาน แล้วเลือกบทบาทที่คุณคิดว่าตรงกับเพื่อน</p>
        <div className={`deciding-pts-info ${styles.points}`}>
          ทายถูกตอนนี้ได้รับ: <strong>+{currentPoints} คะแนน</strong>
        </div>
      </div>

      {/* Case 1: Player ALREADY guessed in an earlier clue */}
      {hasGuessed ? (
        <div className={`already-guessed-panel ${styles.lockedPaper}`}>
          <span className={styles.lockedStamp}>ล็อกคำทายแล้ว</span>
          <div className={`locked-guess-box ${styles.lockedBox}`}>
            <div className={`locked-details ${styles.lockedDetails}`}>
              <div className={`locked-title ${styles.lockedTitle}`}>คุณได้ส่งคำทายไปแล้ว</div>
              <div className={`locked-val ${styles.lockedValue}`}>
                คุณทายว่าเพื่อนคือ: <strong>{myGuessedRole ? ROLES[myGuessedRole].name : '—'}</strong>
              </div>
              <div className={`locked-sub ${styles.lockedSub}`}>
                (ส่งคำทายหลังข้อที่ {(myGuessedClueIndex ?? 0) + 1})
              </div>
            </div>
          </div>
          <p className={`locked-hint ${styles.lockedHint}`}>
            คุณสามารถช่วยตอบสถานการณ์ต่อไปเพื่อเป็นหลักฐานให้เพื่อนได้
          </p>
        </div>
      ) : (
        /* Case 2: Player has NOT guessed yet */
        <div className={styles.selectionPanel}>
          {isFinalClue && (
            <div className={`forced-guess-alert ${styles.finalAlert}`}>
              <strong>ข้อสุดท้ายแล้ว!</strong> คุณต้องเลือกบทบาทและล็อกคำทายตอนนี้ ไม่สามารถกดดูต่อได้
            </div>
          )}

          <p className={`suspect-subtitle ${styles.subtitle}`}>
            <strong>ตัดบทบาทของคุณออกแล้ว เหลือ 5 ผู้ต้องสงสัย</strong>
            <span>แตะใบประวัติเพื่อเลือกคำทาย หรือใช้แท็กช่วยจดบันทึก</span>
          </p>

          {/* 6 Roles list (own role disabled) */}
          <div className={`suspects-grid ${styles.grid}`} role="radiogroup" aria-label="ผู้ต้องสงสัย 5 บทบาท">
            {ROLE_IDS.map((roleId, index) => {
              const info = ROLES[roleId];
              const isOwnRole = roleId === myRole;
              const isSelected = selectedRole === roleId;
              const note = scratchpad[roleId] ?? 'none';

              if (isOwnRole) {
                return (
                  <div key={roleId} className={`suspect-card is-self-eliminated ${styles.card} ${styles.ownCard}`} aria-disabled="true">
                    <span className={styles.fileNumber} aria-hidden="true">ใบประวัติ / 0{index + 1}</span>
                    <div className={`suspect-card-header ${styles.cardHeader}`}>
                      <span className={`suspect-name-striked ${styles.ownName}`}>{info.name}</span>
                    </div>
                    <p className={`suspect-desc-muted ${styles.ownDescription}`}>{info.description}</p>
                    <span className={`self-tag ${styles.selfTag}`}>บทของคุณ (ตัดออก)</span>
                  </div>
                );
              }

              return (
                <div
                  key={roleId}
                  className={`suspect-card ${styles.card} ${isSelected ? `selected ${styles.selected}` : ''} note-${note} ${note === 'suspect' ? styles.notedSuspect : note === 'cleared' ? styles.notedCleared : ''}`}
                  onClick={() => !hasSubmitted && !actionBlocked && !isSubmitting && setSelectedRole(roleId)}
                  role="radio"
                  aria-checked={isSelected}
                  aria-disabled={hasSubmitted || actionBlocked || isSubmitting}
                  tabIndex={hasSubmitted || actionBlocked || isSubmitting ? -1 : 0}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return;
                    event.preventDefault();
                    if (!hasSubmitted && !actionBlocked && !isSubmitting) setSelectedRole(roleId);
                  }}
                >
                  <div className={styles.cardMeta} aria-hidden="true">
                    <span className={styles.fileNumber}>ใบประวัติ / 0{index + 1}</span>
                    <span className={styles.selectionMark}>{isSelected ? '✓' : ''}</span>
                  </div>
                  <div className={`suspect-card-header ${styles.cardHeader}`}>
                    <span className={`suspect-name role-${roleId} ${styles.name}`}>{info.name}</span>
                  </div>
                  <p className={`suspect-desc ${styles.description}`}>{info.description}</p>
                  <div className={`scratchpad-tags ${styles.notes}`} onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className={`tag-btn suspect ${styles.noteButton} ${note === 'suspect' ? `active ${styles.suspectNoteActive}` : ''}`}
                      onClick={() => toggleScratchpad(roleId, 'suspect')}
                      title="ทำเครื่องหมายว่าน่าสงสัย"
                      aria-pressed={note === 'suspect'}
                    >
                      ? สงสัย
                    </button>
                    <button
                      type="button"
                      className={`tag-btn clear ${styles.noteButton} ${note === 'cleared' ? `active ${styles.clearNoteActive}` : ''}`}
                      onClick={() => toggleScratchpad(roleId, 'cleared')}
                      title="ทำเครื่องหมายว่าตัดออก"
                      aria-pressed={note === 'cleared'}
                    >
                      ✕ ตัด
                    </button>
                  </div>
                  <div className={`${styles.selectionStatus} ${isSelected ? 'suspect-selected-badge' : ''}`}>
                    {isSelected ? '✓ เลือกทายบทนี้' : 'แตะใบประวัติเพื่อเลือก'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div className={`deciding-footer ${styles.footer}`}>
        {hasSubmitted ? (
          <div className={`waiting-opponent-banner ${styles.waiting}`}>
            <div className="spinner-dots"><span /><span /><span /></div>
            <div className={styles.waitingText}>
              <span className={styles.savedStamp}>บันทึกการตัดสินใจแล้ว</span>
              <span>รออีกฝ่ายพร้อมไปต่อ...</span>
            </div>
          </div>
        ) : hasGuessed ? (
          <button
            className={`btn btn-primary btn-lg proceed-btn ${styles.primaryButton}`}
            onClick={handleAckAlreadyGuessed}
            disabled={isSubmitting || actionBlocked}
          >
            พร้อมไปต่อ
          </button>
        ) : (
          <div className={styles.decisionSheet}>
            <p className={styles.chosenRole} aria-live="polite">
              {selectedRole ? <>คำทายที่เลือก: <strong>{ROLES[selectedRole].name}</strong></> : 'เลือกผู้ต้องสงสัย แล้วตรวจคำทายอีกครั้งก่อนส่ง'}
            </p>
            <div className={`deciding-button-row ${styles.buttonRow}`}>
              {!isFinalClue && (
                <button
                  className={`btn btn-secondary btn-lg continue-clue-btn ${styles.secondaryButton}`}
                  onClick={handleContinue}
                  disabled={isSubmitting || actionBlocked}
                >
                  ดูสถานการณ์ต่อไป (ข้อ {clueIndex + 2})
                </button>
              )}
              <button
                ref={lockButtonRef}
                className={`btn btn-primary btn-lg lock-guess-btn ${styles.primaryButton}`}
                aria-haspopup="dialog"
                aria-controls={`${documentId}-confirmation`}
                aria-expanded={showConfirmModal}
                onClick={() => setShowConfirmModal(true)}
                disabled={!selectedRole || isSubmitting || actionBlocked}
              >
                ล็อกคำทาย (+{currentPoints} แต้ม)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Lock Confirmation Modal */}
      {showConfirmModal && selectedRole && (
        <dialog ref={confirmationRef} id={`${documentId}-confirmation`} className={styles.confirmDialog}
          aria-labelledby={`${documentId}-confirmation-title`} aria-describedby={`${documentId}-warning`}
          onClose={() => setShowConfirmModal(false)}
          onClick={event => { if (event.target === event.currentTarget) setShowConfirmModal(false); }}>
          <div className={styles.confirmPaper}>
            <span className={styles.confirmStamp}>ใบยืนยันคำทาย</span>
            <h3 className={`confirm-modal-title ${styles.confirmTitle}`} id={`${documentId}-confirmation-title`}>ยืนยันการล็อกคำทาย?</h3>
            <p className={`confirm-modal-text ${styles.confirmText}`}>
              คุณต้องการทายว่าเพื่อนคือ: <strong>&ldquo;{ROLES[selectedRole].name}&rdquo;</strong> ใช่หรือไม่?
            </p>
            <p className={`confirm-modal-warning ${styles.confirmWarning}`} id={`${documentId}-warning`}>
              * คำเตือน: ทายได้เพียงครั้งเดียวในรอบนี้ และไม่สามารถเปลี่ยนคำทายได้อีก!
            </p>
            <div className={`confirm-modal-actions ${styles.confirmActions}`}>
              <button type="button" className={`btn btn-secondary ${styles.secondaryButton}`} onClick={() => setShowConfirmModal(false)}>
                เปลี่ยนใจเลือกใหม่
              </button>
              <button type="button" className={`btn btn-primary ${styles.primaryButton}`} onClick={handleConfirmGuess} disabled={isSubmitting || actionBlocked}>
                {isSubmitting ? 'กำลังส่งคำทาย...' : 'ยืนยันล็อกคำทาย!'}
              </button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}
