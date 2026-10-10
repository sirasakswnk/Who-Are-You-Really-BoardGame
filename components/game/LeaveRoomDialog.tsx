'use client';

import { useLayoutEffect, useId, useRef, type ReactNode } from 'react';
import styles from './LeaveRoomDialog.module.css';

export default function LeaveRoomDialog({ description, onClose, children }: {
  description: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const documentId = useId();

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog?.showModal();
    return () => {
      if (dialog?.open) dialog.close();
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  return (
    <dialog ref={dialogRef} className={styles.dialog}
      aria-labelledby={`${documentId}-title`} aria-describedby={`${documentId}-description`}
      onCancel={onClose}
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div className={styles.backing}>
        <div className={`confirm-modal-box ${styles.folder}`}>
          <span className={styles.tab} aria-hidden="true">ใบยืนยันออกจากห้อง</span>
          <div className={styles.header}>
            <span className={styles.label}>แฟ้มเข้าร่วมภารกิจ</span>
            <span className={styles.stamp} aria-hidden="true">ตรวจสอบก่อนออก</span>
          </div>
          <h2 className={`confirm-modal-title ${styles.title}`} id={`${documentId}-title`}>ออกจากห้อง?</h2>
          <div className={styles.paper}>
            <span className={styles.paperLabel}>ผลที่จะเกิดขึ้น</span>
            <p className={`confirm-modal-text ${styles.description}`} id={`${documentId}-description`}>{description}</p>
          </div>
          <div className={`confirm-modal-actions ${styles.actions}`}>{children}</div>
        </div>
      </div>
    </dialog>
  );
}
