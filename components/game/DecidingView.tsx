'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent, RefObject } from 'react';
import { getRoleInfo, getRoleIds, roleContentVersion, CLUES_PER_ROUND, SCORE_TABLE } from '@/lib/game/types';
import type { RoleId, DecisionAction, RevealedEvidence } from '@/lib/game/types';
import type { NoteTag, SuspicionNotes } from '@/lib/client/roundNotes';
import RoleReminder from './RoleReminder';
import RolePortrait from './RolePortrait';
import { getRolePresentation } from './rolePresentation';
import styles from './DecidingView.module.css';

interface DecidingViewProps {
  hasSubmitted?: boolean;
  actionBlocked?: boolean;
  clueIndex: number;
  mySeat: 0 | 1;
  evidence?: RevealedEvidence[];
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

function useModalDialog(open: boolean, ref: RefObject<HTMLDialogElement | null>, trigger: RefObject<HTMLButtonElement | null>) {
  useEffect(() => {
    if (!open || !ref.current) return;
    const dialog = ref.current;
    const returnTarget = trigger.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (!dialog.open) dialog.showModal();
    dialog.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = previousOverflow;
      if (dialog.open) dialog.close();
      if (returnTarget?.isConnected) returnTarget.focus({ preventScroll: true });
    };
  }, [open, ref, trigger]);
}

function containDialogFocus(event: KeyboardEvent<HTMLDialogElement>) {
  if (event.key !== 'Tab') return;
  const targets = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), [tabindex="0"]')]
    .filter(element => element.getClientRects().length > 0);
  const first = targets[0], last = targets.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault(); last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault(); first?.focus();
  }
}

export default function DecidingView({
  actionBlocked = false, hasSubmitted = false, clueIndex, mySeat, evidence = [], myRole,
  roleAcknowledged = false, roleContextKey, hasGuessed, myGuessedRole, myGuessedClueIndex,
  onSubmitDecision, scratchpad = {}, onToggleNote,
}: DecidingViewProps) {
  // GameContainer's main key includes contentVersion/matchId/roundId/phase/clueIndex.
  // It remounts this view for a new round; presence and notes updates retain choices.
  const [selectedRole, setSelectedRole] = useState<RoleId | null>(null);
  const [detailsRole, setDetailsRole] = useState<RoleId | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [questionExpanded, setQuestionExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState('');
  const sendingRef = useRef(false);
  const folderRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLElement>(null);
  const detailsRef = useRef<HTMLDialogElement>(null);
  const detailsTriggerRef = useRef<HTMLButtonElement>(null);
  const confirmationRef = useRef<HTMLDialogElement>(null);
  const lockButtonRef = useRef<HTMLButtonElement>(null);
  const documentId = useId();
  const candidates = myRole ? getRoleIds(roleContentVersion(myRole)).filter(role => role !== myRole) : [];
  const validSelection = selectedRole && candidates.includes(selectedRole) ? selectedRole : null;
  const isFinalClue = clueIndex === CLUES_PER_ROUND - 1;
  const currentPoints = SCORE_TABLE[clueIndex] ?? 2;
  const lastRevealed = evidence.find(entry => entry.clueIndex === clueIndex);
  const opponentSeat = mySeat === 0 ? 1 : 0;
  const choiceBlocked = !myRole || hasGuessed || hasSubmitted || actionBlocked || isSubmitting;
  const confirmationOpen = showConfirmModal && !!validSelection && !hasGuessed && !hasSubmitted;
  const detailInfo = detailsRole ? getRoleInfo(detailsRole) : null;
  const detailNote = detailsRole ? scratchpad[detailsRole] : undefined;

  useModalDialog(!!detailsRole, detailsRef, detailsTriggerRef);
  useModalDialog(confirmationOpen, confirmationRef, lockButtonRef);

  // A fixed mobile footer follows document scrolling. Reserve its measured height,
  // including wrapped labels and safe area, rather than using a fixed spacer.
  useEffect(() => {
    const footer = footerRef.current, folder = folderRef.current;
    if (!footer || !folder) return;
    const measure = () => folder.style.setProperty('--decision-footer-height', `${footer.getBoundingClientRect().height}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(footer, { box: 'border-box' });
    return () => observer.disconnect();
  }, []);

  const keepCardVisible = (card: HTMLElement) => {
    if (!window.matchMedia('(max-width: 559px)').matches) return;
    const footerTop = footerRef.current?.getBoundingClientRect().top ?? window.innerHeight;
    const box = card.getBoundingClientRect();
    if (box.bottom > footerTop - 8 || box.top < 8) card.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  };

  const submit = async (decision: DecisionAction) => {
    if (sendingRef.current || (choiceBlocked && decision.type !== 'ack') || hasSubmitted || actionBlocked) return;
    if (decision.type === 'ack' && (!hasGuessed || isSubmitting)) return;
    sendingRef.current = true;
    setIsSubmitting(true);
    setSubmissionError('');
    setShowConfirmModal(false);
    try {
      await onSubmitDecision(decision);
    } catch {
      // Parent error/pending UI still owns request recovery. Keep the selected role.
      setSubmissionError('ส่งการตัดสินใจไม่สำเร็จ กรุณาตรวจการเชื่อมต่อแล้วลองอีกครั้ง');
    } finally {
      sendingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div ref={folderRef} className={`deciding-container ${styles.folder}`}>
      <div className={`deciding-folder-tabs ${styles.folderTabs}`}>
        <span className={`deciding-folder-tab ${styles.tab}`}>ทายบทบาท</span>
        {myRole && roleAcknowledged && <RoleReminder key={`${roleContextKey ?? clueIndex}:${myRole}`}
          role={myRole} placement="folder-tab" label="ดูบทของฉัน" />}
      </div>
      <span className={styles.spine} aria-hidden="true" />
      <svg className={styles.clip} viewBox="0 0 32 64" fill="none" aria-hidden="true">
        <path d="M10 47V14a8 8 0 0 1 16 0v36a11 11 0 0 1-22 0V21a5 5 0 0 1 10 0v29a2 2 0 0 1-4 0" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <div className={`deciding-header ${styles.header}`}>
        <div className={styles.metadata}>
          <span className={styles.clueLabel}>หลังสถานการณ์ที่ {clueIndex + 1}/{CLUES_PER_ROUND}</span>
          <span className={styles.analysisStamp}>แฟ้มวิเคราะห์</span>
        </div>
        <h2 className={`deciding-title ${styles.title}`}>เพื่อนของคุณน่าจะเป็นใคร?</h2>
        <section className={`deciding-evidence-review ${styles.evidenceReview}`} aria-labelledby={`${documentId}-review-title`}>
          <div className={styles.reviewHeading}>
            <h3 id={`${documentId}-review-title`} className={styles.reviewTitle}>คำตอบล่าสุดของเพื่อน</h3>
            <span className={styles.reviewClue}>ข้อที่ {clueIndex + 1}</span>
          </div>
          {lastRevealed ? <>
            <div className={styles.reviewAnswer}><p className={styles.reviewAnswerText}>{lastRevealed.answers[opponentSeat]}</p></div>
            <button type="button" className={styles.questionToggle} aria-expanded={questionExpanded}
              aria-controls={`${documentId}-question`} onClick={() => setQuestionExpanded(value => !value)}>
              {questionExpanded ? 'ซ่อนคำถาม' : 'ดูคำถาม'} <span aria-hidden="true">{questionExpanded ? '−' : '+'}</span>
            </button>
            <div id={`${documentId}-question`} className={styles.reviewQuestion} hidden={!questionExpanded}>
              <p className={styles.reviewPrompt}>{lastRevealed.prompt}</p>
            </div>
          </> : <p className={styles.reviewEmpty}>ยังไม่มีคำถามและคำตอบที่เปิดเผยสำหรับข้อนี้</p>}
        </section>
      </div>

      {hasGuessed ? <div className={`already-guessed-panel ${styles.lockedPaper}`}>
        <span className={styles.lockedStamp}>ล็อกคำทายแล้ว</span>
        <div className={`locked-guess-box ${styles.lockedBox}`}>
          <div className={styles.lockedDetails}>
            <span className={styles.lockedTitle}>คุณได้ส่งคำทายไปแล้ว</span>
            <div className={styles.lockedValue}>คุณทายว่าเพื่อนคือ: <strong>{myGuessedRole ? getRoleInfo(myGuessedRole).name : '—'}</strong></div>
            <span className={styles.lockedSub}>(ส่งคำทายหลังข้อที่ {(myGuessedClueIndex ?? 0) + 1})</span>
          </div>
        </div>
        <p className={styles.lockedHint}>คุณสามารถช่วยตอบสถานการณ์ต่อไปเพื่อเป็นหลักฐานให้เพื่อนได้</p>
      </div> : !myRole ? <div className={styles.roleLoading} role="status" aria-live="polite">
        <div className="spinner-dots" aria-hidden="true"><span /><span /><span /></div>
        <p>กำลังโหลดบทบาทของคุณ ก่อนเปิดรายชื่อผู้ต้องสงสัย...</p>
      </div> : <div className={styles.selectionPanel}>
        {isFinalClue && <div className={`forced-guess-alert ${styles.finalAlert}`}>
          <strong>ข้อสุดท้ายแล้ว!</strong> เลือกบทบาทและล็อกคำทายเพื่อจบรอบนี้
        </div>}
        <p className={`suspect-subtitle ${styles.subtitle}`} id={`${documentId}-suspects`}>
          ผู้ต้องสงสัย {candidates.length} บทบาท · ตัดบทของคุณออกแล้ว
        </p>
        <div className={`suspects-grid ${styles.grid}`} role="radiogroup" aria-labelledby={`${documentId}-suspects`}>
          {candidates.map(roleId => {
            const info = getRolePresentation(roleId);
            const isSelected = validSelection === roleId;
            const note = scratchpad[roleId];
            const inputId = `${documentId}-${roleId}`;
            return <article key={roleId} className={`suspect-card ${styles.card} ${styles[`identity_${roleId}`] ?? ''} ${isSelected ? `selected ${styles.selected}` : ''}`}
              onFocus={event => { if (event.target.matches(':focus-visible')) keepCardVisible(event.currentTarget); }}>
              <input type="radio" className={styles.radio} id={inputId} name={`${documentId}-guess`} value={roleId}
                aria-label={info.name} aria-describedby={`${inputId}-summary`} checked={isSelected} disabled={choiceBlocked}
                onChange={() => { if (!choiceBlocked && !sendingRef.current) setSelectedRole(roleId); }} />
              <label htmlFor={inputId} className={styles.cardMain}>
                <RolePortrait role={roleId} className={styles.portrait} sizes="(max-width: 380px) 64px, 72px" />
                <div className={styles.cardCopy}>
                  <div className={styles.nameLine}>
                    <span className={`suspect-name ${styles.name}`}>{info.name}</span>
                    <span className={styles.selectionMark} aria-hidden="true">{isSelected ? '✓' : ''}</span>
                  </div>
                  <p id={`${inputId}-summary`} className={`suspect-desc ${styles.description}`}>{info.shortDescription}</p>
                </div>
              </label>
              <div className={styles.cardTools}>
                <div className={styles.badges}>
                  {isSelected && <span className={styles.selectedBadge}>✓ เลือกอยู่</span>}
                  {note && <span className={`note-${note} ${styles.noteBadge} ${note === 'suspect' ? styles.suspectBadge : styles.clearedBadge}`}>
                    {note === 'suspect' ? 'สงสัย' : 'ตัดออก'}
                  </span>}
                </div>
                <button type="button" className={styles.detailsButton} aria-label={`ดูบทบาทเต็ม: ${info.name}`}
                  aria-haspopup="dialog" aria-controls={`${documentId}-details`} disabled={isSubmitting}
                  onClick={event => {
                    if (confirmationOpen || sendingRef.current) return;
                    detailsTriggerRef.current = event.currentTarget;
                    setDetailsRole(roleId);
                  }}>ดูบทบาทเต็ม</button>
              </div>
            </article>;
          })}
        </div>
      </div>}

      <footer ref={footerRef} className={`deciding-footer ${styles.footer}`} aria-label="การตัดสินใจ">
        {submissionError && <p className={styles.submissionError} role="alert">{submissionError}</p>}
        {hasSubmitted ? <div className={`waiting-opponent-banner ${styles.waiting}`} role="status">
          <div className="spinner-dots" aria-hidden="true"><span /><span /><span /></div>
          <span>รออีกฝ่ายพร้อมไปต่อ</span>
        </div> : hasGuessed ? <button className={`btn btn-primary proceed-btn ${styles.primaryButton}`}
          disabled={isSubmitting || actionBlocked} onClick={() => void submit({ type: 'ack' })}>พร้อมไปต่อ</button> : <>
          <p className={styles.chosenRole} aria-live="polite">คำทาย: <strong>{validSelection ? getRoleInfo(validSelection).name : 'ยังไม่ได้เลือก'}</strong></p>
          <p className={styles.points}>ทายถูกตอนนี้ได้ {currentPoints} แต้ม</p>
          <div className={`deciding-button-row ${styles.buttonRow}`}>
            {!isFinalClue && <button className={`btn btn-secondary continue-clue-btn ${styles.secondaryButton}`}
              disabled={choiceBlocked} onClick={() => void submit({ type: 'continue' })}>ดูข้อถัดไป</button>}
            <button ref={lockButtonRef} className={`btn btn-primary lock-guess-btn ${styles.primaryButton}`}
              disabled={!validSelection || choiceBlocked} aria-haspopup="dialog" aria-controls={`${documentId}-confirmation`}
              aria-expanded={confirmationOpen} onClick={() => { if (!detailsRole) setShowConfirmModal(true); }}>ล็อกคำทาย</button>
          </div>
        </>}
      </footer>

      {detailsRole && detailInfo && <dialog ref={detailsRef} id={`${documentId}-details`} aria-labelledby={`${documentId}-details-title`}
        aria-describedby={`${documentId}-full-description`} className={`${styles.detailsDialog} ${styles[`identity_${detailsRole}`] ?? ''}`}
        onClose={() => setDetailsRole(null)} onKeyDown={containDialogFocus}
        onClick={event => { if (event.target === event.currentTarget) setDetailsRole(null); }}>
        <div className={styles.detailsSheet}>
          <header className={styles.detailsHeader}><span className={styles.analysisStamp}>แฟ้มบทบาทเต็ม</span>
            <button type="button" className={styles.closeDetails} onClick={() => setDetailsRole(null)}>ปิดรายละเอียด</button>
          </header>
          <div className={styles.detailsBody} tabIndex={0} role="region" aria-label="รายละเอียดบทบาท">
            <RolePortrait role={detailsRole} className={styles.detailsPortrait} sizes="140px" />
            <h3 id={`${documentId}-details-title`} className={styles.detailsTitle}>{detailInfo.name}</h3>
            <p id={`${documentId}-full-description`} className={styles.fullDescription}>{detailInfo.description}</p>
          </div>
          <div className={styles.detailsNotes}>
            <p>บันทึกส่วนตัวของคุณ · แตะซ้ำเพื่อยกเลิก</p>
            <div className={styles.noteActions}>
              <button type="button" className={`${styles.noteButton} ${detailNote === 'suspect' ? styles.suspectNoteActive : ''}`}
                aria-pressed={detailNote === 'suspect'} disabled={!onToggleNote || isSubmitting}
                onClick={() => onToggleNote?.(detailsRole, 'suspect')}>? สงสัย</button>
              <button type="button" className={`${styles.noteButton} ${detailNote === 'cleared' ? styles.clearNoteActive : ''}`}
                aria-pressed={detailNote === 'cleared'} disabled={!onToggleNote || isSubmitting}
                onClick={() => onToggleNote?.(detailsRole, 'cleared')}>✕ ตัดออก</button>
            </div>
          </div>
        </div>
      </dialog>}

      {confirmationOpen && validSelection && <dialog ref={confirmationRef} id={`${documentId}-confirmation`} className={styles.confirmDialog}
        aria-labelledby={`${documentId}-confirmation-title`} aria-describedby={`${documentId}-warning`}
        onClose={() => setShowConfirmModal(false)} onKeyDown={containDialogFocus}
        onClick={event => { if (event.target === event.currentTarget) setShowConfirmModal(false); }}>
        <div className={styles.confirmPaper}>
          <span className={styles.confirmStamp}>ใบยืนยันคำทาย</span>
          <h3 className={`confirm-modal-title ${styles.confirmTitle}`} id={`${documentId}-confirmation-title`}>ยืนยันการล็อกคำทาย?</h3>
          <p className={`confirm-modal-text ${styles.confirmText}`}>คุณต้องการทายว่าเพื่อนคือ: <strong>&ldquo;{getRoleInfo(validSelection).name}&rdquo;</strong> ใช่หรือไม่?</p>
          <p className={`confirm-modal-warning ${styles.confirmWarning}`} id={`${documentId}-warning`}>ทายได้เพียงครั้งเดียวในรอบนี้ และไม่สามารถเปลี่ยนคำทายได้อีก!</p>
          <div className={`confirm-modal-actions ${styles.confirmActions}`}>
            <button type="button" className={`btn btn-secondary ${styles.secondaryButton}`} onClick={() => setShowConfirmModal(false)}>เปลี่ยนใจเลือกใหม่</button>
            <button type="button" className={`btn btn-primary ${styles.primaryButton}`} disabled={choiceBlocked}
              onClick={() => { if (validSelection) void submit({ type: 'guess', roleId: validSelection }); }}>
              {isSubmitting ? 'กำลังส่งคำทาย...' : 'ยืนยันล็อกคำทาย!'}
            </button>
          </div>
        </div>
      </dialog>}
    </div>
  );
}
