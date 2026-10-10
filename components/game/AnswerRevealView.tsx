'use client';

import { useId, useState } from 'react';
import { CLUES_PER_ROUND, type Scenario, type PlayerSeat, type RevealedEvidence, type RoleId } from '@/lib/game/types';
import RoleReminder from './RoleReminder';
import styles from './AnswerRevealView.module.css';

interface AnswerRevealViewProps {
  hasAcknowledged?: boolean;
  actionBlocked?: boolean;
  scenario: Scenario | null;
  clueIndex: number;
  mySeat: 0 | 1;
  players: [PlayerSeat | null, PlayerSeat | null];
  revealedAnswers: Array<{ clueIndex: number; answers: [string, string] }>;
  evidence?: RevealedEvidence[];
  myRole?: RoleId | null;
  roleAcknowledged?: boolean;
  roleContextKey?: string;
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
  myRole = null,
  roleAcknowledged = false,
  roleContextKey,
  onAcknowledgeReveal,
}: AnswerRevealViewProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const documentId = useId();

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
    <section className={`reveal-container ${styles.folder}`} aria-labelledby={`${documentId}-title`}>
      <div className={`reveal-folder-tabs ${styles.folderTabs}`}>
        <span className={`reveal-folder-tab ${styles.tab}`} aria-hidden="true">เฉลยคำตอบ</span>
        {myRole && roleAcknowledged && (
          <RoleReminder key={`${roleContextKey ?? 'current-round'}:${myRole}`} role={myRole} placement="folder-tab" />
        )}
      </div>
      <span className={styles.spine} aria-hidden="true" />
      <svg className={styles.clip} viewBox="0 0 32 68" aria-hidden="true" focusable="false">
        <path d="M10 47V14a8 8 0 0 1 16 0v36a11 11 0 0 1-22 0V21a5 5 0 0 1 10 0v29a2 2 0 0 1-4 0" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
      </svg>
      {/* Header */}
      <header className={`reveal-header ${styles.header}`}>
        <div className={styles.metadata}>
          <span className={`case-stamp ${styles.clueStamp}`}>หลักฐานข้อที่ {clueIndex + 1} / {CLUES_PER_ROUND}</span>
          <span className={styles.openStamp}>เปิดเผยแล้ว</span>
        </div>
        <h2 className={`reveal-title ${styles.title}`} id={`${documentId}-title`}>เปรียบเทียบคำตอบของทั้งสองฝ่าย</h2>
        <p className={styles.caption}>อ่านคำตอบทั้งสองคน แล้วพิจารณาลักษณะนิสัยของเพื่อน</p>
        {scenario && (
          <div className={styles.scenario}>
            <span className={styles.paperLabel}>สถานการณ์ของข้อนี้</span>
            <p className={`reveal-prompt-quote ${styles.prompt}`}>&ldquo;{scenario.prompt}&rdquo;</p>
            <span className={styles.paperFold} aria-hidden="true" />
          </div>
        )}
      </header>

      {/* Side-by-Side Answers Comparison */}
      <div className={`reveal-comparison-grid ${styles.comparison}`}>
        {/* My Answer */}
        <div className={`reveal-player-card my-card ${styles.playerCard} ${styles.myCard}`}>
          <div className={`reveal-player-header ${styles.playerHeader}`}>
            <svg className={`reveal-avatar ${styles.avatar}`} width="36" height="36" viewBox="0 0 80 80" aria-hidden="true" focusable="false">
              <use href={`#av-${me?.avatarId ?? 'cat'}`} />
            </svg>
            <div className={`reveal-name-col ${styles.nameColumn}`}>
              <span className={`reveal-name ${styles.name}`}>{me?.displayName ?? 'คุณ'} (คุณ)</span>
              <span className={`reveal-tag ${styles.tag}`}>คำตอบที่คุณเลือก</span>
            </div>
          </div>
          <div className={`reveal-answer-box ${styles.answerBox}`}>
            {getOptionLabel(myAnswerId, mySeat)}
          </div>
        </div>

        {/* Opponent Answer */}
        <div className={`reveal-player-card opp-card ${styles.playerCard} ${styles.opponentCard}`}>
          <div className={`reveal-player-header ${styles.playerHeader}`}>
            <svg className={`reveal-avatar ${styles.avatar}`} width="36" height="36" viewBox="0 0 80 80" aria-hidden="true" focusable="false">
              <use href={`#av-${opponent?.avatarId ?? 'fox'}`} />
            </svg>
            <div className={`reveal-name-col ${styles.nameColumn}`}>
              <span className={`reveal-name ${styles.name}`}>{opponent?.displayName ?? 'เพื่อน'}</span>
              <span className={`reveal-tag ${styles.tag}`}>คำตอบที่เพื่อนเลือก</span>
            </div>
          </div>
          <div className={`reveal-answer-box ${styles.answerBox}`}>
            {getOptionLabel(opponentAnswerId, opponentSeat)}
          </div>
        </div>
      </div>

      {/* Evidence History (Previous clues in this round) */}
      {revealedAnswers.length > 1 && (
        <section className={`evidence-history-section ${styles.history}`} aria-labelledby={`${documentId}-history`}>
          <h3 className={`evidence-history-title ${styles.historyTitle}`} id={`${documentId}-history`}>ประวัติคำตอบในรอบนี้:</h3>
          <div className={`evidence-list ${styles.evidenceList}`}>
            {revealedAnswers
              .filter((r) => r.clueIndex < clueIndex)
              .map((r) => (
                <div key={r.clueIndex} className={`evidence-item ${styles.evidenceItem}`}>
                  <span className={`evidence-clue-badge ${styles.clueBadge}`}>ข้อ {r.clueIndex + 1}</span>
                  <div className={`evidence-text ${styles.evidenceText}`}>
                    <p className={styles.historyPrompt}>{evidence.find(entry => entry.clueIndex === r.clueIndex)?.prompt ?? 'ไม่มีสถานการณ์ของข้อเดิม'}</p>
                    <div className={styles.historyAnswers}>
                      <p className={styles.historyAnswer}>
                        <span className={styles.myName}>{me?.displayName}:</span>{' '}
                        <em>{evidence.find(entry => entry.clueIndex === r.clueIndex)?.answers[mySeat] ?? 'ไม่มีข้อความคำตอบของข้อเดิม'}</em>
                      </p>
                      <p className={styles.historyAnswer}>
                        <span className={styles.opponentName}>{opponent?.displayName}:</span>{' '}
                        <em>{evidence.find(entry => entry.clueIndex === r.clueIndex)?.answers[opponentSeat] ?? 'ไม่มีข้อความคำตอบของข้อเดิม'}</em>
                      </p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}

      {/* Action Footer */}
      <footer className={`reveal-footer ${styles.footer}`}>
        {hasAcknowledged ? (
          <div className={`waiting-opponent-banner ${styles.waiting}`} role="status" aria-live="polite">
            <div className="spinner-dots" aria-hidden="true"><span /><span /><span /></div>
            <div className={styles.waitingText}>
              <span className={styles.readStamp}>อ่านหลักฐานแล้ว</span>
              <span>รออีกฝ่ายพร้อมไปขั้นทายบทบาท...</span>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className={`btn btn-primary btn-lg proceed-btn proceed-decide-btn ${styles.proceed}`}
            onClick={handleAcknowledge}
            disabled={isSubmitting || actionBlocked}
            aria-busy={isSubmitting}
          >
            <span>{isSubmitting ? 'กำลังบันทึก...' : 'ไปขั้นทายบทบาท'}</span>
            {!isSubmitting && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6" /></svg>}
          </button>
        )}
      </footer>
    </section>
  );
}
