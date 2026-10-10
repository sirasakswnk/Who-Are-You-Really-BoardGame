import Link from 'next/link';
import styles from './NotFoundView.module.css';

export default function NotFoundView({ onBackToHome }: { onBackToHome?: () => void } = {}) {
  const homeLabel = <>กลับสู่หน้าหลัก
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 10h12m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </>;
  return (
    <main className={styles.screen}>
      <div className={styles.backing}>
        <section className={`not-found-folder ${styles.folder}`}>
          <span className={styles.tab} aria-hidden="true">แฟ้มที่ค้นไม่พบ</span>
          <div className={styles.header}>
            <span className={styles.label}>Who Are You Really?</span>
            <span className={styles.stamp}>ไม่พบหน้านี้</span>
          </div>
          <div className={styles.paper}>
            <span className={styles.code}>404</span>
            <h1 className={styles.title}>ไม่พบแฟ้มที่คุณตามหา</h1>
            <p className={styles.description}>ลิงก์อาจไม่ถูกต้อง หรือหน้านี้ถูกย้ายไปแล้ว<br />กลับไปเปิดแฟ้มใหม่ที่หน้าหลักได้เลย</p>
          </div>
          {onBackToHome ? <button type="button" className={styles.home} onClick={onBackToHome}>{homeLabel}</button>
            : <Link href="/" prefetch={false} className={styles.home}>{homeLabel}</Link>}
          <p className={styles.hint}>ตรวจลิงก์อีกครั้งก่อนเปิดแฟ้ม</p>
        </section>
      </div>
    </main>
  );
}
