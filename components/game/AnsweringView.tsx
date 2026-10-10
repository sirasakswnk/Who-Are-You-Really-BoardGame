'use client';

import { useId, useState } from 'react';
import { CLUES_PER_ROUND, type RoleId, type Scenario } from '@/lib/game/types';
import RoleReminder from './RoleReminder';
import styles from './AnsweringView.module.css';

interface AnsweringViewProps {
  actionBlocked?: boolean;
  scenario: Scenario | null;
  clueIndex: number;
  myCommittedAnswer: string | null;
  opponentHasAnswered: boolean;
  myRole?: RoleId | null;
  roleAcknowledged?: boolean;
  roleContextKey?: string;
  onSubmitAnswer: (optionId: string) => Promise<void>;
}

export default function AnsweringView({
  actionBlocked = false,
  scenario,
  clueIndex,
  myCommittedAnswer,
  opponentHasAnswered,
  myRole = null,
  roleAcknowledged = false,
  roleContextKey,
  onSubmitAnswer,
}: AnsweringViewProps) {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const documentId = useId();

  const hasCommitted = Boolean(myCommittedAnswer);
  const folderTabs = (
    <div className={`scenario-folder-tabs ${styles.folderTabs}`}>
      <span className={`scenario-folder-tab ${styles.tab}`} aria-hidden="true">สถานการณ์</span>
      {myRole && roleAcknowledged && (
        <RoleReminder key={`${roleContextKey ?? 'current-round'}:${myRole}`} role={myRole} placement="folder-tab" />
      )}
    </div>
  );

  const handleSubmit = async () => {
    if (!selectedOptionId || hasCommitted || isSubmitting || actionBlocked) return;
    setIsSubmitting(true);
    try {
      await onSubmitAnswer(selectedOptionId);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!scenario) {
    return (
      <section className={`answering-container answering-loading ${styles.folder} ${styles.loading}`} role="status">
        {folderTabs}
        <div className="spinner-dots" aria-hidden="true"><span /><span /><span /></div>
        <p>กำลังเตรียมสถานการณ์...</p>
      </section>
    );
  }

  const categoryLabels: Record<string, string> = {
    travel: 'การเดินทาง',
    food: 'อาหารการกิน',
    shopping: 'การซื้อของ',
    leisure: 'กิจกรรมวันหยุด',
    friends: 'เพื่อนฝูง',
    daily: 'ชีวิตประจำวัน',
  };

  return (
    <section className={`answering-container ${styles.folder}`} aria-labelledby={`${documentId}-prompt`}>
      {folderTabs}
      <span className={styles.spine} aria-hidden="true" />
      <svg className={styles.clip} viewBox="0 0 32 68" aria-hidden="true" focusable="false">
        <path d="M10 47V14a8 8 0 0 1 16 0v36a11 11 0 0 1-22 0V21a5 5 0 0 1 10 0v29a2 2 0 0 1-4 0" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
      </svg>

      <header className={`scenario-meta-row ${styles.metadata}`}>
        <span className={`category-pill ${styles.category}`}>
          {categoryLabels[scenario.category] ?? scenario.category}
        </span>
        <span className={`clue-number-pill ${styles.clue}`}>ข้อที่ <strong>{clueIndex + 1}</strong> จาก {CLUES_PER_ROUND}</span>
      </header>

      <div className={`scenario-card ${styles.paper}`}>
        <span className={styles.paperLabel}>ใบสถานการณ์ในแฟ้มภารกิจ</span>
        <h2 className={`scenario-prompt-text ${styles.prompt}`} id={`${documentId}-prompt`}>{scenario.prompt}</h2>
        <p className={`scenario-subtext ${styles.instruction}`}>
          เลือกการกระทำที่ตรงกับลักษณะนิสัยของบทบาทคุณมากที่สุด
        </p>
        <span className={styles.paperFold} aria-hidden="true" />
      </div>

      <div className={styles.optionsHeading}>
        <span>คุณจะเลือกทำอย่างไร?</span>
        <span className={styles.choiceHint}>เลือก 1 คำตอบ</span>
      </div>

      <div className={`options-list ${styles.options}`} role="radiogroup" aria-label="ตัวเลือกการกระทำ">
        {scenario.options.map((opt, idx) => {
          const letter = String.fromCharCode(65 + idx); // A, B, C, D
          const isSelected = hasCommitted
            ? myCommittedAnswer === opt.id
            : selectedOptionId === opt.id;

          return (
            <button
              type="button"
              key={opt.id}
              className={`option-card ${styles.option} ${isSelected ? `selected ${styles.selected}` : ''} ${hasCommitted ? 'locked' : ''}`}
              onClick={() => !hasCommitted && !actionBlocked && !isSubmitting && setSelectedOptionId(opt.id)}
              disabled={hasCommitted || isSubmitting || actionBlocked}
              role="radio"
              aria-checked={isSelected}
            >
              <span className={`option-letter-badge ${styles.letter}`} aria-hidden="true">{letter}</span>
              <span className={`option-label-text ${styles.optionLabel}`}>{opt.label}</span>
              <span className={`option-check-icon ${styles.selectionMark}`} aria-hidden="true">
                {isSelected ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4L19 6" /></svg> : <span className={styles.emptyMark} />}
              </span>
            </button>
          );
        })}
      </div>

      <footer className={`answering-footer ${styles.footer}`}>
        {hasCommitted ? (
          <div className={`answer-submitted-banner ${styles.submitted}`} role="status" aria-live="polite">
            <span className={`submitted-check ${styles.submittedMark}`} aria-hidden="true">
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4L19 6" /></svg>
            </span>
            <div className={`submitted-text ${styles.submittedText}`}>
              <strong className={styles.submittedStamp}>ล็อกคำตอบแล้ว!</strong>
              <span>
                {opponentHasAnswered
                  ? 'กำลังเปิดเฉลยคำตอบพร้อมกัน...'
                  : 'รออีกฝ่ายส่งคำตอบเพื่อเปิดดูพร้อมกัน'}
              </span>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className={`btn btn-primary btn-lg submit-answer-btn ${styles.submit}`}
            onClick={handleSubmit}
            disabled={!selectedOptionId || isSubmitting || actionBlocked}
          >
            <span>{isSubmitting ? 'กำลังส่งคำตอบ...' : 'ยืนยันคำตอบ'}</span>
            {!isSubmitting && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6" /></svg>}
          </button>
        )}
      </footer>

      <div className={`opponent-status-row ${styles.opponentStatus}`} role="status" aria-live="polite">
        <span className={`opp-label ${styles.opponentLabel}`}>สถานะเพื่อน:</span>
        {opponentHasAnswered ? (
          <span className={`opp-badge done ${styles.opponentDone}`}>เพื่อนส่งคำตอบแล้ว ✓</span>
        ) : (
          <span className={`opp-badge pending ${styles.opponentPending}`}>รอคำตอบครบทั้งสองคน</span>
        )}
      </div>
    </section>
  );
}
