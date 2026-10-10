'use client';

import { useId, useState } from 'react';
import { RoleId, ROLES, ROUNDS_PER_MATCH } from '@/lib/game/types';
import styles from './RoleIntroView.module.css';

interface RoleIntroViewProps {
  actionBlocked?: boolean;
  myRole: RoleId | null;
  roundIndex: number;
  hasAcknowledged: boolean;
  onAcknowledgeRole: () => Promise<void>;
}

export default function RoleIntroView({
  actionBlocked = false,
  myRole,
  roundIndex,
  hasAcknowledged,
  onAcknowledgeRole,
}: RoleIntroViewProps) {
  const [isCovered, setIsCovered] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const documentId = useId();

  const roleInfo = myRole ? ROLES[myRole] : null;

  const handleAcknowledge = async () => {
    if (actionBlocked || isSubmitting || hasAcknowledged) return;
    setIsSubmitting(true);
    try {
      await onAcknowledgeRole();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className={`role-intro-container ${styles.folder}`} aria-labelledby={`${documentId}-title`}>
      <span className={`role-folder-tab ${styles.tab}`} aria-hidden="true">บทบาทลับ</span>
      <span className={styles.spine} aria-hidden="true" />
      <svg className={`role-file-clip ${styles.clip}`} viewBox="0 0 32 68" aria-hidden="true" focusable="false">
        <path d="M10 47V14a8 8 0 0 1 16 0v36a11 11 0 0 1-22 0V21a5 5 0 0 1 10 0v29a2 2 0 0 1-4 0" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
      </svg>

      <header className={`role-intro-header ${styles.header}`}>
        <div className={styles.metadata}>
          <span className={styles.roundStamp}>รอบที่ {roundIndex + 1} / {ROUNDS_PER_MATCH}</span>
          <span className={styles.classification}>เอกสารเฉพาะบุคคล</span>
        </div>
        <h2 className={`role-intro-title ${styles.title}`} id={`${documentId}-title`}>แฟ้มภารกิจลับของคุณ</h2>
        <p className={`role-intro-caption ${styles.caption}`}>
          จำลองพฤติกรรมตามบทบาทนี้ในการตอบสถานการณ์ทั้ง 4 ข้อ
        </p>
      </header>

      <div className={`secret-file-card ${styles.paper}`}>
        <div className={`secret-card-top ${styles.cardTop}`}>
          <span className={`secret-badge ${styles.privateStamp}`}>เฉพาะคุณ</span>
          <button
            type="button"
            className={`btn btn-secondary btn-sm cover-toggle-btn ${styles.coverButton}`}
            onClick={() => setIsCovered(!isCovered)}
            aria-label={isCovered ? 'เปิดดูบทบาท' : 'ซ่อนบทบาท'}
            aria-expanded={!isCovered}
            aria-controls={`${documentId}-details`}
          >
            {isCovered ? 'เปิดดูบทบาท' : 'ซ่อนบทบาท'}
          </button>
        </div>

        {isCovered ? (
          <button type="button" className={`secret-card-covered ${styles.cardBody} ${styles.covered}`}
            id={`${documentId}-details`} onClick={() => setIsCovered(false)} aria-label="เปิดดูบทบาทที่ซ่อนไว้">
            <span className={styles.closedFileLabel}>ปิดแฟ้มลับไว้แล้ว</span>
            <span className={`covered-stamp ${styles.coveredStamp}`}>TOP SECRET</span>
            <span className={styles.redactedLines} aria-hidden="true"><i /><i /></span>
            <span className={`covered-hint ${styles.coveredHint}`}>แตะเพื่อเปิดดูบทบาทอีกครั้ง</span>
          </button>
        ) : (
          <div className={`secret-card-content ${styles.cardBody} ${styles.revealed}`} id={`${documentId}-details`}>
            {roleInfo ? (
              <div className={`secret-role-body ${styles.roleBody}`}>
                <p className={styles.roleKicker}>ตัวตนของคุณในรอบนี้</p>
                <h3 className={`secret-role-name role-${roleInfo.id} ${styles.roleName}`}>
                  {roleInfo.name}
                </h3>
                <p className={`secret-role-desc ${styles.description}`}>{roleInfo.description}</p>
              </div>
            ) : (
              <div className={styles.loading} role="status">
                <div className="spinner-dots" aria-hidden="true"><span /><span /><span /></div>
                <span>กำลังแจกบทบาท...</span>
              </div>
            )}
          </div>
        )}
        <span className={styles.paperFold} aria-hidden="true" />
      </div>

      <div className={`secret-golden-rule ${styles.reminder}`}>
        <span className={styles.reminderMark} aria-hidden="true">!</span>
        <p><strong>ข้อควรจำ:</strong> ตอบตามบทบาทอย่างเป็นธรรมชาติ
          ห้ามจงใจตอบสลับเพื่อกันเพื่อนเดา เพราะเพื่อนก็พยายามจับทางคุณอยู่!</p>
      </div>

      <footer className={`role-intro-footer ${styles.footer}`}>
        {hasAcknowledged ? (
          <div className={`waiting-opponent-banner ${styles.waiting}`} role="status" aria-live="polite">
            <div className="spinner-dots" aria-hidden="true">
              <span /><span /><span />
            </div>
            <span><strong>คุณพร้อมแล้ว!</strong> กำลังรออีกฝ่ายพร้อมไปต่อ...</span>
          </div>
        ) : (
          <button
            type="button"
            className={`btn btn-primary btn-lg acknowledge-role-btn ${styles.acknowledge}`}
            onClick={handleAcknowledge}
            disabled={!myRole || isSubmitting || actionBlocked}
          >
            <span>{isSubmitting ? 'กำลังบันทึก...' : 'เข้าใจบทบาทแล้ว'}</span>
            {!isSubmitting && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6" /></svg>}
          </button>
        )}
      </footer>
    </section>
  );
}
