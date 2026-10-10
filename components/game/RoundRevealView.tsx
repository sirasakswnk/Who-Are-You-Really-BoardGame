'use client';

import { useId, useState } from 'react';
import { RoundResult, PlayerSeat, ROLES, ROUNDS_PER_MATCH } from '@/lib/game/types';
import styles from './RoundRevealView.module.css';

interface RoundRevealViewProps {
  hasAcknowledged?: boolean;
  actionBlocked?: boolean;
  roundSummary: RoundResult | null;
  roundIndex: number;
  mySeat: 0 | 1;
  players: [PlayerSeat | null, PlayerSeat | null];
  matchScores: [number, number];
  onNextRoundReady: () => Promise<void>;
}

export default function RoundRevealView({
  actionBlocked = false,
  hasAcknowledged = false,
  roundSummary,
  roundIndex,
  mySeat,
  players,
  matchScores,
  onNextRoundReady,
}: RoundRevealViewProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const documentId = useId();

  const opponentSeat = mySeat === 0 ? 1 : 0;
  const me = players[mySeat];
  const opponent = players[opponentSeat];

  const isFinalRound = roundIndex === ROUNDS_PER_MATCH - 1;

  const handleNext = async () => {
    if (actionBlocked || isSubmitting || hasAcknowledged) return;
    setIsSubmitting(true);
    try {
      await onNextRoundReady();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!roundSummary) {
    return (
      <section className={`round-reveal-container ${styles.folder}`} aria-labelledby={`${documentId}-title`}>
        <ReportDecoration />
        <h2 className={styles.title} id={`${documentId}-title`}>สรุปผลประจำรอบ</h2>
        <div className={`reveal-loading ${styles.loading}`} role="status">
          <div className="spinner-dots" aria-hidden="true"><span /><span /><span /></div>
          <p>กำลังคำนวณคะแนนประจำรอบ...</p>
        </div>
      </section>
    );
  }

  const myActualRole = roundSummary.roles[mySeat];
  const oppActualRole = roundSummary.roles[opponentSeat];

  const myGuess = roundSummary.guesses[mySeat];
  const oppGuess = roundSummary.guesses[opponentSeat];

  const myRoundScore = roundSummary.scores[mySeat];
  const oppRoundScore = roundSummary.scores[opponentSeat];

  const myReason = roundSummary.reason?.[mySeat] ?? '';
  const oppReason = roundSummary.reason?.[opponentSeat] ?? '';

  return (
    <section className={`round-reveal-container ${styles.folder}`} aria-labelledby={`${documentId}-title`}>
      <ReportDecoration />
      {/* Header Stamp */}
      <header className={`round-reveal-stamp-banner ${styles.header}`}>
        <div className={styles.metadata}>
          <span className={styles.roundLabel}>รายงานรอบที่ {roundIndex + 1}/{ROUNDS_PER_MATCH}</span>
          <span className={styles.closedStamp}>ปิดแฟ้มรอบนี้</span>
        </div>
        <h2 className={`round-reveal-title ${styles.title}`} id={`${documentId}-title`}>สรุปผลประจำรอบ</h2>
        <p className={styles.caption}>เฉลยผลการสืบสวน เปิดบทบาทจริง คำทาย และคะแนนของทั้งสองฝ่าย</p>
      </header>

      {/* Comparison Reveal Cards */}
      <div className={`reveal-cards-grid ${styles.comparison}`}>
        {/* Your Result Card */}
        <article className={`round-result-card my-result ${styles.playerCard} ${styles.myCard}`} aria-labelledby={`${documentId}-my-name`}>
          <div className={`result-card-header ${styles.cardHeader}`}>
            <svg className={`result-avatar ${styles.avatar}`} width="40" height="40" viewBox="0 0 80 80" aria-hidden="true" focusable="false">
              <use href={`#av-${me?.avatarId ?? 'cat'}`} />
            </svg>
            <div className={styles.nameColumn}>
              <h3 className={`result-player-name ${styles.name}`} id={`${documentId}-my-name`}>{me?.displayName} (คุณ)</h3>
              <span className={styles.cardLabel}>รายงานของคุณ</span>
            </div>
          </div>
          <div className={`result-actual-role ${styles.actualRole}`}>
            <span>บทบาทจริง:</span><strong>{ROLES[myActualRole].name}</strong>
          </div>
          <div className={`result-guess-section ${styles.guessSection}`}>
            <div className={`guess-row ${styles.guessRow}`}>
              <span className={`guess-label ${styles.guessLabel}`}>คุณทายว่าเพื่อนคือ:</span>
              <span className={`guess-value ${styles.guessValue}`}>
                {myGuess ? ROLES[myGuess].name : 'ไม่ได้ส่งคำทาย'}
              </span>
            </div>
            <div className={styles.scoreLine}>
              <span className={styles.scoreLabel}>คะแนนที่ได้รอบนี้</span>
              <div className={`score-earned-badge ${styles.earnedBadge} ${myRoundScore > 0 ? `positive ${styles.positive}` : `zero ${styles.zero}`}`}>
                {myRoundScore > 0 ? `+${myRoundScore} คะแนน` : '+0 คะแนน'}
              </div>
            </div>
            <ScoreReason reason={myReason} label="ดูเหตุผลคะแนนของคุณ" />
          </div>
        </article>

        {/* Opponent's Result Card */}
        <article className={`round-result-card opp-result ${styles.playerCard} ${styles.opponentCard}`} aria-labelledby={`${documentId}-opponent-name`}>
          <div className={`result-card-header ${styles.cardHeader}`}>
            <svg className={`result-avatar ${styles.avatar}`} width="40" height="40" viewBox="0 0 80 80" aria-hidden="true" focusable="false">
              <use href={`#av-${opponent?.avatarId ?? 'fox'}`} />
            </svg>
            <div className={styles.nameColumn}>
              <h3 className={`result-player-name ${styles.name}`} id={`${documentId}-opponent-name`}>{opponent?.displayName} (เพื่อน)</h3>
              <span className={styles.cardLabel}>รายงานของเพื่อน</span>
            </div>
          </div>
          <div className={`result-actual-role ${styles.actualRole}`}>
            <span>บทบาทจริง:</span><strong>{ROLES[oppActualRole].name}</strong>
          </div>
          <div className={`result-guess-section ${styles.guessSection}`}>
            <div className={`guess-row ${styles.guessRow}`}>
              <span className={`guess-label ${styles.guessLabel}`}>เพื่อนทายว่าคุณคือ:</span>
              <span className={`guess-value ${styles.guessValue}`}>
                {oppGuess ? ROLES[oppGuess].name : 'ไม่ได้ส่งคำทาย'}
              </span>
            </div>
            <div className={styles.scoreLine}>
              <span className={styles.scoreLabel}>คะแนนที่ได้รอบนี้</span>
              <div className={`score-earned-badge ${styles.earnedBadge} ${oppRoundScore > 0 ? `positive ${styles.positive}` : `zero ${styles.zero}`}`}>
                {oppRoundScore > 0 ? `+${oppRoundScore} คะแนน` : '+0 คะแนน'}
              </div>
            </div>
            <ScoreReason reason={oppReason} label="ดูเหตุผลคะแนนของเพื่อน" />
          </div>
        </article>
      </div>

      {/* Cumulative Scoreboard */}
      <section className={`cumulative-scoreboard ${styles.scoreboard}`} aria-labelledby={`${documentId}-scoreboard-title`}>
        <h3 className={`scoreboard-title ${styles.scoreboardTitle}`} id={`${documentId}-scoreboard-title`}>คะแนนรวมสะสมหลังรอบที่ {roundIndex + 1}</h3>
        <div className={`scoreboard-display ${styles.scoreboardDisplay}`}>
          <div className={`score-side ${styles.scoreSide} ${styles.myScore}`}>
            <span className={`player-tag ${styles.playerTag}`}>{me?.displayName}</span>
            <span className={`score-num ${styles.scoreNumber}`}>{matchScores[mySeat]}</span>
          </div>
          <div className={`score-vs ${styles.scoreSeparator}`} aria-hidden="true">—</div>
          <div className={`score-side ${styles.scoreSide} ${styles.opponentScore}`}>
            <span className={`player-tag ${styles.playerTag}`}>{opponent?.displayName}</span>
            <span className={`score-num ${styles.scoreNumber}`}>{matchScores[opponentSeat]}</span>
          </div>
        </div>
      </section>

      {/* Action Footer */}
      <div className={`round-reveal-footer ${styles.footer}`}>
        {hasAcknowledged ? (
          <div className={`waiting-opponent-banner ${styles.waiting}`}>
            <div className="spinner-dots"><span /><span /><span /></div>
            <div className={styles.waitingText}>
              <span className={styles.readStamp}>อ่านรายงานแล้ว</span>
              <span>รออีกฝ่ายพร้อมรอบถัดไป...</span>
            </div>
          </div>
        ) : (
          <button
            className={`btn btn-primary btn-lg next-round-btn ${styles.proceed}`}
            onClick={handleNext}
            disabled={isSubmitting || actionBlocked}
          >
            {isFinalRound
              ? 'ดูสรุปผลตัดสินทั้งเกม'
              : `พร้อมลุยรอบที่ ${roundIndex + 2}`}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
              <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>
    </section>
  );
}

function ScoreReason({ reason, label }: { reason: string; label: string }) {
  return (
    <>
      <div className={styles.reasonBox}>
        <span className={styles.reasonLabel}>หมายเหตุการให้คะแนน</span>
        <p className={`result-reason-text ${styles.reason}`}>{reason}</p>
      </div>
      <details className={`round-reason-disclosure ${styles.mobileReason}`}>
        <summary aria-label={label}>
          ดูเหตุผล
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
            <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </summary>
        <p className={styles.reason}>{reason}</p>
      </details>
    </>
  );
}

function ReportDecoration() {
  return (
    <>
      <span className={styles.tab} aria-hidden="true">สรุปผลรอบ</span>
      <span className={styles.spine} aria-hidden="true" />
      <svg className={styles.clip} viewBox="0 0 32 64" fill="none" aria-hidden="true" focusable="false">
        <path d="M10 47V14a8 8 0 0 1 16 0v36a11 11 0 0 1-22 0V21a5 5 0 0 1 10 0v29a2 2 0 0 1-4 0" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </>
  );
}
