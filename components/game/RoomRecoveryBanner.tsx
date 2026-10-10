import type { ReactNode } from 'react';
import styles from './RoomRecoveryBanner.module.css';

export default function RoomRecoveryBanner({ children, actions }: { children: ReactNode; actions: ReactNode }) {
  return (
    <section className={`room-recovery-banner ${styles.banner}`} role="alert">
      <div className={styles.header}>
        <span className={styles.label}>ใบรายงานการเชื่อมต่อ</span>
        <span className={styles.stamp} aria-hidden="true">รอตรวจสอบ</span>
      </div>
      <h2 className={styles.title}>ตรวจสถานะแฟ้มอีกครั้ง</h2>
      <div className={styles.messages}>{children}</div>
      <div className={`room-recovery-actions ${styles.actions}`}>{actions}</div>
    </section>
  );
}
