import type { ReactNode } from 'react';
import styles from './RoomAccessViews.module.css';

export function RoomLoadingView({ roomCode }: { roomCode?: string }) {
  return (
    <RoomAccessFrame kind="loading" roomCode={roomCode} title={roomCode ? 'กำลังเชื่อมต่อห้อง' : 'กำลังเปิดแฟ้มคดี'}>
      <div className={styles.paper}>
        <span className={styles.paperLabel}>กำลังเตรียมแฟ้มสืบสวน</span>
        <div className={styles.loadingRow}>
          <div className={`spinner-dots ${styles.dots}`} aria-hidden="true"><span /><span /><span /></div>
          <p className={`loading-text ${styles.message}`}>
            {roomCode ? <>กำลังเชื่อมต่อแฟ้มสืบสวน <strong className={styles.code}>{roomCode}</strong>...</> : 'กำลังเปิดแฟ้มคดี...'}
          </p>
        </div>
      </div>
      <p className={styles.hint}>เมื่อเชื่อมต่อสำเร็จ จะเข้าสู่ห้องโดยอัตโนมัติ</p>
    </RoomAccessFrame>
  );
}

export function RoomConnectionErrorView({ roomCode, message, onRetry, onBackToHome, children }: {
  roomCode?: string;
  message: string;
  onRetry: () => void;
  onBackToHome: () => void;
  children?: ReactNode;
}) {
  return (
    <RoomAccessFrame kind="error" roomCode={roomCode} title="ยังเชื่อมต่อห้องไม่ได้">
      <div className={styles.paper}>
        <span className={styles.paperLabel}>รายละเอียดการเชื่อมต่อ</span>
        <p className={`error-message ${styles.message}`}>{message}</p>
      </div>
      <p className={styles.hint}>ลองเชื่อมต่อใหม่ หรือกลับหน้าหลักเพื่อเข้าห้องอีกครั้ง</p>
      <div className={styles.actions}>
        <button type="button" className={`btn btn-primary ${styles.primary}`} onClick={onRetry}>
          ลองเชื่อมต่อใหม่
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M4 10h12m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {children}
        <button type="button" className={`btn btn-secondary ${styles.home}`} onClick={onBackToHome}>กลับสู่หน้าหลัก</button>
      </div>
    </RoomAccessFrame>
  );
}

function RoomAccessFrame({ kind, roomCode, title, children }: {
  kind: 'loading' | 'error';
  roomCode?: string;
  title: string;
  children: ReactNode;
}) {
  const isError = kind === 'error';
  return (
    <div className={`${isError ? 'game-error-screen' : 'game-loading-screen'} ${styles.screen}`}>
      <div className={styles.backing}>
        <section className={`${styles.folder} ${isError ? `error-box ${styles.error}` : styles.loading}`} role={isError ? 'alert' : 'status'} aria-live={isError ? 'assertive' : 'polite'}>
          <span className={styles.tab} aria-hidden="true">{isError ? 'แฟ้มรอตรวจสอบ' : 'แฟ้มเข้าห้อง'}</span>
          <span className={styles.spine} aria-hidden="true" />
          <svg className={styles.clip} viewBox="0 0 32 64" fill="none" aria-hidden="true">
            <path d="M10 47V14a8 8 0 0 1 16 0v36a11 11 0 0 1-22 0V21a5 5 0 0 1 10 0v29a2 2 0 0 1-4 0" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
          <header className={styles.header}>
            <div className={styles.metadata}>
              <span className={styles.reportLabel}>การเชื่อมต่อห้อง</span>
              <span className={styles.stamp}>{isError ? 'รอเชื่อมต่อใหม่' : 'กำลังเปิดแฟ้ม'}</span>
            </div>
            <div className={styles.headingRow}>
              <svg className={styles.seal} viewBox="0 0 64 64" fill="none" aria-hidden="true">
                <circle cx="32" cy="32" r="29" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" />
                <circle cx="32" cy="32" r="24" stroke="currentColor" strokeWidth="1.5" />
                <path d="M18 24h11l4 5h13v15H18V24Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                {isError ? <path d="M29 33a3 3 0 0 1 6 0c0 2-3 2-3 4m0 3v.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  : <path d="M24 35h16m-16 5h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />}
              </svg>
              <h1 className={`${isError ? 'error-title ' : ''}${styles.title}`}>{title}</h1>
            </div>
            {roomCode && <p className={styles.caseCode}>รหัสห้อง <strong className={`room-access-code ${styles.code}`}>{roomCode}</strong></p>}
          </header>
          {children}
        </section>
      </div>
    </div>
  );
}
