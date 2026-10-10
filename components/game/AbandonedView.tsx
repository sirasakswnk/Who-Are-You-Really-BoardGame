import styles from './AbandonedView.module.css';

export default function AbandonedView({ displayName, busy, onLeave }: {
  displayName: string; busy: boolean; onLeave: () => void;
}) {
  return (
    <section className={`abandoned-container ${styles.folder}`} role="status" aria-live="polite">
      <span className={styles.tab} aria-hidden="true">แฟ้มยุติภารกิจ</span>
      <span className={styles.spine} aria-hidden="true" />
      <svg className={styles.clip} viewBox="0 0 32 64" fill="none" aria-hidden="true">
        <path d="M10 47V14a8 8 0 0 1 16 0v36a11 11 0 0 1-22 0V21a5 5 0 0 1 10 0v29a2 2 0 0 1-4 0" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </svg>

      <header className={styles.header}>
        <div className={styles.metadata}>
          <span className={styles.reportLabel}>รายงานการยุติภารกิจ</span>
          <span className={styles.stamp}>ยุติภารกิจ</span>
        </div>
        <div className={styles.headingRow}>
          <svg className={styles.seal} viewBox="0 0 64 64" fill="none" aria-hidden="true">
            <circle cx="32" cy="32" r="29" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" />
            <circle cx="32" cy="32" r="24" stroke="currentColor" strokeWidth="1.5" />
            <path d="M18 24h11l4 5h13v15H18V24Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            <path d="m28 32 8 8m0-8-8 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <h1 className={styles.title}>เกมยุติแล้ว</h1>
        </div>
      </header>

      <div className={styles.report}>
        <h2 className={styles.reportTitle}>เหตุผลที่ยุติเกม</h2>
        <p className={`abandoned-message ${styles.message}`}>
          <strong>{displayName}</strong> ออกจากห้อง เกมนี้จึงยุติและไม่มีผู้ชนะเต็มเกม
        </p>
      </div>

      <div className={styles.footer}>
        <p className={styles.nextStep}>หากต้องการเล่นต่อ ให้สร้างห้องใหม่</p>
        <button className={`abandoned-leave-btn ${styles.leave}`} disabled={busy} onClick={onLeave}>
          <span>{busy ? 'กรุณารอสักครู่…' : 'ออกจากห้องและกลับหน้าหลัก'}</span>
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M4 10h12m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </section>
  );
}
